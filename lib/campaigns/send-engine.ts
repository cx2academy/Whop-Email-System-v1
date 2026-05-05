/**
 * lib/campaigns/send-engine.ts
 *
 * Campaign Send Engine — Phase 4 core.
 *
 * Responsibilities:
 *   1. Resolve the audience for a campaign (tag-based segmentation + A/B split)
 *   2. Build per-contact email payloads (subject, html, tracking URLs)
 *   3. Send in rate-limited batches with inter-batch delay
 *   4. Write an EmailSend row per recipient before sending (idempotency guard)
 *   5. Update each EmailSend row with the provider response
 *   6. Update campaign stats and status on completion
 *
 * Idempotency:
 *   EmailSend rows are created with a UNIQUE idempotencyKey before the send
 *   attempt. If the engine is re-run (crash recovery), existing rows are
 *   detected and skipped — no duplicate emails are ever delivered.
 *
 * Rate protection:
 *   Sends are chunked into batches of SEND_BATCH_SIZE with SEND_BATCH_DELAY_MS
 *   pause between batches. This stays comfortably under Resend's rate limits.
 */

import { db } from "@/lib/db/client";
import { sendEmail } from "@/lib/email";
import { getAppUrl } from "@/lib/env";
import { buildPlainText } from "@/emails/broadcast";
import { SEND_BATCH_SIZE, SEND_BATCH_DELAY_MS } from "@/lib/constants";
import { checkThrottle } from "@/lib/deliverability/send-throttle";
import { sleep } from "@/lib/utils";
import type { Contact, EmailCampaign } from "@prisma/client";
import { parseVariables, buildSendVariables } from "@/lib/templates/variable-parser";
import { applyPreSendFilters } from "@/lib/sending/smart-filter";
import { checkAbuseSignals } from "@/lib/sending/abuse-detector";
import { createRateLimiter } from "@/lib/sending/rate-queue";
import { checkUsageLimit } from "@/lib/plans/gates";
import { sendWhopDm, htmlToPlainText } from "@/lib/whop/dm";
import { clearCache } from "@/lib/ai/cache";
import { getOptimalSendTime } from "@/lib/ai/send-time";
import { analyzeCampaignPerformance } from "@/lib/ai/campaign-analysis";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SendCampaignOptions {
  campaignId: string;
  workspaceId: string;
  isAbTestRemainder?: boolean;
  _tourForceEmail?: string;
}

export interface SendCampaignResult {
  status: "COMPLETED" | "FAILED" | "PARTIAL" | "RUNNING";
  totalSent: number;
  totalFailed: number;
  totalSkipped: number;
}

// ---------------------------------------------------------------------------
// Audience resolver
// ---------------------------------------------------------------------------

/**
 * Resolves the full audience for a campaign.
 * Combines tag-based and segment-based targeting.
 * If both are empty, targets all SUBSCRIBED contacts.
 */
async function resolveAudience(
  campaign: EmailCampaign,
  workspaceId: string,
  _tourForceEmail?: string
): Promise<Contact[]> {
  if (_tourForceEmail) {
    // Return only the current user's contact if it exists, or dynamically create a mock contact for them so the system doesn't fail.
    // Let's just find them in the DB. If they don't exist in Contacts, they won't get the email unless we mock the object.
    const userContact = await db.contact.findFirst({
      where: { workspaceId, email: _tourForceEmail }
    });
    
    // If they aren't a subscriber in their own workspace yet, just mock a contact response so it goes through
    if (userContact) return [userContact];
    
    return [{
      id: "demo-tour-contact",
      workspaceId,
      email: _tourForceEmail,
      firstName: "Demo",
      lastName: "User",
      whopMemberId: null,
      whopMetadata: null,
      status: "SUBSCRIBED",
      unsubscribedAt: null,
      unsubscribeIp: null,
      createdAt: new Date(),
      updatedAt: new Date()
    }];
  }

  const segmentIds: string[] = (campaign as any).audienceSegmentIds ?? [];
  let segmentContactIds: string[] = [];
  if (segmentIds.length > 0) {
    const { resolveSegmentContacts } = await import('@/lib/segmentation/segment-engine');
    segmentContactIds = await resolveSegmentContacts(workspaceId, segmentIds);
  }

  const hasTagFilter     = campaign.audienceTagIds.length > 0;
  const hasSegmentFilter = segmentContactIds.length > 0;

  let where: any = { workspaceId, status: 'SUBSCRIBED', email: { not: '' } };

  if (hasTagFilter && hasSegmentFilter) {
    where.OR = [
      { tags: { some: { tagId: { in: campaign.audienceTagIds } } } },
      { id: { in: segmentContactIds } },
    ];
  } else if (hasTagFilter) {
    where.tags = { some: { tagId: { in: campaign.audienceTagIds } } };
  } else if (hasSegmentFilter) {
    where.id = { in: segmentContactIds };
  }

  return db.contact.findMany({
    where,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      workspaceId: true,
      whopMemberId: true,
      whopMetadata: true,
      status: true,
      unsubscribedAt: true,
      unsubscribeIp: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

// ---------------------------------------------------------------------------
// URL builders
// ---------------------------------------------------------------------------

function buildUnsubscribeUrl(
  appUrl: string,
  campaignId: string,
  contactId: string
): string {
  const token = Buffer.from(`${campaignId}:${contactId}`).toString("base64url");
  return `${appUrl}/unsubscribe?token=${token}`;
}

function buildTrackingPixelUrl(
  appUrl: string,
  campaignId: string,
  contactId: string
): string {
  return `${appUrl}/api/track/open?c=${campaignId}&r=${contactId}`;

}

// ---------------------------------------------------------------------------
// Tracking injection
// ---------------------------------------------------------------------------

/**
 * Injects a 1x1 tracking pixel just before </body>.
 * If no </body> tag, appends to end of HTML.
 */
function injectTrackingPixel(html: string, pixelUrl: string): string {
  const pixel = `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none;border:0;" />`;
  if (html.includes("</body>")) {
    return html.replace("</body>", `${pixel}</body>`);
  }
  return html + pixel;
}

/**
 * Wraps every <a href="..."> link with the click tracking redirect,
 * except unsubscribe links (which we never want to intercept).
 */
function injectClickTracking(
  html: string,
  appUrl: string,
  campaignId: string,
  contactId: string
): string {
  return html.replace(
    /(<a\s[^>]*href=")([^"]+)("[^>]*>)/gi,
    (match, prefix, url, suffix) => {
      // Never wrap unsubscribe links or already-wrapped tracking links
      if (
        url.includes("/unsubscribe") ||
        url.includes("/api/track/") ||
        url.startsWith("mailto:") ||
        url.startsWith("#")
      ) {
        return match;
      }
      const encoded = encodeURIComponent(url);
      const trackUrl = `${appUrl}/api/track/click?c=${campaignId}&r=${contactId}&u=${encoded}`;
      return `${prefix}${trackUrl}${suffix}`;
    }
  );
}

// ---------------------------------------------------------------------------
// Core send engine
// ---------------------------------------------------------------------------

/**
 * Sends a campaign to its resolved audience.
 *
 * Designed to be called from:
 *   - Server action (immediate send / review screen)
 *   - API route (via queue job in Phase 5+)
 *
 * Never throws — always returns a SendCampaignResult.
 */
export async function sendCampaign(
  options: SendCampaignOptions
): Promise<SendCampaignResult> {
  const { campaignId, workspaceId } = options;

  // -------------------------------------------------------------------------
  // Load campaign + workspace
  // -------------------------------------------------------------------------
  const [campaign, workspace] = await Promise.all([
    db.emailCampaign.findUnique({
      where: { id: campaignId, workspaceId },
    }),
    db.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        name: true,
        fromEmail: true,
        fromName: true,
        // Smart sending settings
        engagementFilterEnabled: true,
        engagementFilterDays:    true,
        deduplicationEnabled:    true,
        sendRateLimitEnabled:    true,
        sendRateLimitPerMinute:  true,
        abuseDetectionEnabled:   true,
        abuseFlagged:            true,
        abuseFlaggedReason:      true,
      },
    }),
  ]);

  if (!campaign || !workspace) {
    console.error(`[send-engine] Campaign or workspace not found: ${campaignId}`);
    return { status: "FAILED", totalSent: 0, totalFailed: 0, totalSkipped: 0 };
  }

  // Guard: only SCHEDULED or DRAFT campaigns can be sent (or COMPLETED if it's an A/B test remainder)
  if (!["SCHEDULED", "DRAFT"].includes(campaign.status) && !(options.isAbTestRemainder && campaign.status === "COMPLETED")) {
    console.warn(`[send-engine] Campaign ${campaignId} is already ${campaign.status} — skipping`);
    return { status: "FAILED", totalSent: 0, totalFailed: 0, totalSkipped: 0 };
  }

  // Guard: Check if it's part of a sequence/calendar and needs approval
  if (campaign.sequenceId && !campaign.isApproved) {
    console.warn(`[send-engine] Campaign ${campaignId} is part of a sequence/calendar but is NOT approved — skipping`);
    return { status: "FAILED", totalSent: 0, totalFailed: 0, totalSkipped: 0 };
  }

  // Mark as SENDING immediately to prevent concurrent dispatch
  await db.emailCampaign.update({
    where: { id: campaignId },
    data: { status: "SENDING" },
  });

  const appUrl = getAppUrl();
  const fromEmail = workspace.fromEmail ?? process.env.RESEND_FROM_EMAIL ?? "noreply@example.com";
  const fromName = workspace.fromName ?? process.env.RESEND_FROM_NAME ?? workspace.name;
  const from = `${fromName} <${fromEmail}>`;

  let totalSent = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  try {
    // -----------------------------------------------------------------------
    // Resolve audience
    // -----------------------------------------------------------------------
    let rawAudience: Contact[] = [];
    
    if (options.isAbTestRemainder) {
      // Fetch the remainder contacts
      const remainingIds = (campaign as any).abTestRemainingContactIds || [];
      if (remainingIds.length > 0) {
        rawAudience = await db.contact.findMany({
          where: { id: { in: remainingIds } },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            workspaceId: true,
            whopMemberId: true,
            whopMetadata: true,
            status: true,
            unsubscribedAt: true,
            unsubscribeIp: true,
            createdAt: true,
            updatedAt: true,
          },
        });
      }
    } else {
      rawAudience = await resolveAudience(campaign, workspaceId, options._tourForceEmail);
    }

    if (rawAudience.length === 0) {
      await db.emailCampaign.update({
        where: { id: campaignId },
        data: {
          status: "COMPLETED",
          sentAt: new Date(),
          totalRecipients: 0,
        },
      });
      clearCache(`strategy:${workspaceId}`);
      return { status: "COMPLETED", totalSent: 0, totalFailed: 0, totalSkipped: 0 };
    }

    // -----------------------------------------------------------------------
    // Abuse detection — block if workspace has bad signals
    // -----------------------------------------------------------------------
    if (workspace.abuseDetectionEnabled) {
      const abuseCheck = await checkAbuseSignals(workspaceId, rawAudience.length);
      if (!abuseCheck.allowed) {
        console.warn(`[send-engine] Abuse block for workspace ${workspaceId}: ${abuseCheck.signals.map(s => s.message).join(', ')}`);
        await db.emailCampaign.update({
          where: { id: campaignId },
          data: { status: 'PAUSED' },
        });
        return { status: 'FAILED', totalSent: 0, totalFailed: 0, totalSkipped: rawAudience.length };
      }
    }

    // -----------------------------------------------------------------------
    // Plan email cap — check monthly quota before sending
    // -----------------------------------------------------------------------
    const emailGate = await checkUsageLimit({
      workspaceId,
      type: 'emails',
      requested: rawAudience.length,
    });
    if (!emailGate.allowed) {
      console.warn(`[send-engine] Plan email cap reached for workspace ${workspaceId}: ${emailGate.payload.message}`);
      await db.emailCampaign.update({
        where: { id: campaignId },
        data: { status: 'PAUSED' },
      });
      return { status: 'FAILED', totalSent: 0, totalFailed: 0, totalSkipped: rawAudience.length };
    }

    // -----------------------------------------------------------------------
    // Pre-send filters — engagement filter + deduplication
    // -----------------------------------------------------------------------
    const { audience, stats: filterStats } = await applyPreSendFilters(rawAudience, {
      workspaceId,
      engagementFilterEnabled: workspace.engagementFilterEnabled,
      engagementFilterDays:    workspace.engagementFilterDays,
      deduplicationEnabled:    workspace.deduplicationEnabled,
    });

    totalSkipped += filterStats.dedupRemoved + filterStats.engagementRemoved;

    if (filterStats.dedupRemoved > 0) {
      console.log(`[send-engine] Dedup removed ${filterStats.dedupRemoved} duplicate contacts`);
    }
    if (filterStats.engagementRemoved > 0) {
      console.log(`[send-engine] Engagement filter removed ${filterStats.engagementRemoved} unengaged contacts (${workspace.engagementFilterDays}d window)`);
    }

    if (audience.length === 0) {
      await db.emailCampaign.update({
        where: { id: campaignId },
        data: { status: "COMPLETED", sentAt: new Date(), totalRecipients: 0 },
      });
      clearCache(`strategy:${workspaceId}`);
      return { status: "COMPLETED", totalSent: 0, totalFailed: 0, totalSkipped };
    }

    // -----------------------------------------------------------------------
    // Throttle check — domain warmup limits
    // -----------------------------------------------------------------------
    const sendingDomain = await import('@/lib/db/client').then(({ db }) =>
      db.sendingDomain.findFirst({ where: { workspaceId }, orderBy: { createdAt: 'desc' } })
    );
    if (sendingDomain) {
      const throttle = await checkThrottle(workspaceId, sendingDomain.createdAt);
      if (!throttle.allowed) {
        console.warn(`[send-engine] Throttled: ${throttle.reason}`);
        await db.emailCampaign.update({
          where: { id: campaignId },
          data: { status: 'PAUSED' },
        });
        return { status: 'FAILED', totalSent: 0, totalFailed: 0, totalSkipped: audience.length };
      }
    }

    // -----------------------------------------------------------------------
    // A/B subject assignment
    // -----------------------------------------------------------------------
    const isAbTestInitial = campaign.isAbTest && !options.isAbTestRemainder && (campaign as any).abTestVariantA && (campaign as any).abTestVariantB;
    
    let activeAudience = audience;
    let remainingContactIds: string[] = [];
    
    if (isAbTestInitial) {
      const splitPercent = (campaign as any).abTestSplitPercent || 20;
      const splitSize = Math.floor((audience.length * splitPercent) / 100);
      
      // If list is too small to split meaningfully, just send to everyone as A
      if (splitSize < 1) {
        activeAudience = audience;
      } else {
        // We need 2 * splitSize for the test (A and B)
        const testAudienceSize = splitSize * 2;
        activeAudience = audience.slice(0, testAudienceSize);
        remainingContactIds = audience.slice(testAudienceSize).map(c => c.id);
      }
    }

    // Record total recipients upfront (only if not remainder)
    if (!options.isAbTestRemainder) {
      await db.emailCampaign.update({
        where: { id: campaignId },
        data: { 
          totalRecipients: audience.length,
          ...(isAbTestInitial ? { abTestRemainingContactIds: remainingContactIds } : {})
        },
      });
    }

    // -----------------------------------------------------------------------
    // Rate limiter — optional per-minute cap
    // -----------------------------------------------------------------------
    const rateLimiter = workspace.sendRateLimitEnabled
      ? createRateLimiter(workspaceId, workspace.sendRateLimitPerMinute)
      : null;

    // -----------------------------------------------------------------------
    // Send in batches
    // -----------------------------------------------------------------------
    const batches = chunkArray(activeAudience, SEND_BATCH_SIZE);
    
    let sentA = 0;
    let sentB = 0;

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx];

      // Add delay between batches (rate protection)
      if (batchIdx > 0) {
        await sleep(SEND_BATCH_DELAY_MS);
      }

      await Promise.all(
        batch.map(async (contact, contactIdx) => {
          const absoluteIdx = batchIdx * SEND_BATCH_SIZE + contactIdx;
          
          let subject = campaign.subject;
          let variantSuffix = "";
          let isVariantA = false;
          let isVariantB = false;

          if (isAbTestInitial) {
            // Half gets A, half gets B
            const isB = absoluteIdx % 2 === 1;
            if (isB) {
              subject = (campaign as any).abTestVariantB;
              variantSuffix = ":B";
              isVariantB = true;
            } else {
              subject = (campaign as any).abTestVariantA;
              variantSuffix = ":A";
              isVariantA = true;
            }
          } else if (options.isAbTestRemainder) {
            // Remainder gets the winning subject
            subject = campaign.subject; // already updated to winner
          }

          const idempotencyKey = `${campaignId}:${contact.id}${variantSuffix}`;

          // -----------------------------------------------------------------
          // Idempotency check: skip if already sent
          // -----------------------------------------------------------------
          const existing = await db.emailSend.findUnique({
            where: { idempotencyKey },
            select: { id: true, status: true },
          });

          if (existing && existing.status !== "PENDING") {
            totalSkipped++;
            return;
          }

          // Create (or find) the EmailSend row
          const emailSend = existing ?? await db.emailSend.create({
            data: {
              workspaceId,
              campaignId,
              contactId: contact.id,
              idempotencyKey,
              status: "QUEUED",
              provider: process.env.USE_SMTP_FALLBACK === "true" ? "SMTP" : "RESEND",
            },
          });

          // -----------------------------------------------------------------
          // Build and send the email
          // -----------------------------------------------------------------
          const unsubscribeUrl = buildUnsubscribeUrl(appUrl, campaignId, contact.id);
          const trackingPixelUrl = buildTrackingPixelUrl(appUrl, campaignId, contact.id);

          let scheduledAt: string | undefined;
          if (campaign.sendTimeOptimized) {
            const optimalTime = await getOptimalSendTime(workspaceId, contact.id, new Date());
            // Only schedule if it's in the future
            if (optimalTime > new Date()) {
              scheduledAt = optimalTime.toISOString();
            }
          }

          // -----------------------------------------------------------------
          // Personalization — replace {{variables}} with real contact data
          // -----------------------------------------------------------------
          const vars = buildSendVariables({
            firstName:      contact.firstName,
            lastName:       contact.lastName,
            email:          contact.email,
            senderName:     fromName,
            unsubscribeUrl,
            ctaUrl:         '#',
            communityName:  workspace.name,
          });

          const personalizedSubject = parseVariables(subject, vars);
          const personalizedHtml    = parseVariables(campaign.htmlBody, vars);

          // Inject open pixel + click tracking into HTML before sending
          let trackedHtml = injectTrackingPixel(personalizedHtml, trackingPixelUrl);
          trackedHtml = injectClickTracking(trackedHtml, appUrl, campaignId, contact.id);

          const plainText = buildPlainText({
            htmlBody: personalizedHtml,
            fromName,
            unsubscribeUrl,
          });

          // Wait for rate limiter slot if enabled
          if (rateLimiter) {
            await rateLimiter.waitForSlot();
          }

          const result = await sendEmail({
            to: contact.email,
            subject: personalizedSubject,
            html: trackedHtml,
            text: plainText,
            from,
            idempotencyKey,
            scheduledAt,
          });

          // -----------------------------------------------------------------
          // Record result
          // -----------------------------------------------------------------
          if (result.success) {
            totalSent++;
            if (isVariantA) sentA++;
            if (isVariantB) sentB++;
            await db.emailSend.update({
              where: { id: emailSend.id },
              data: {
                status: "SENT",
                messageId: result.messageId,
                sentAt: new Date(),
                provider: result.provider === "smtp" ? "SMTP" : "RESEND",
              },
            });
          } else {
            totalFailed++;
            await db.emailSend.update({
              where: { id: emailSend.id },
              data: {
                status: "FAILED",
                failureReason: result.error,
                provider: result.provider === "smtp" ? "SMTP" : "RESEND",
              },
            });
          }
        })
      );

      // Update campaign stats after each batch
      await db.emailCampaign.update({
        where: { id: campaignId },
        data: { 
          totalSent: { increment: totalSent }, 
          totalFailed: { increment: totalFailed },
          ...(isAbTestInitial ? {
            abTestSentACount: { increment: sentA },
            abTestSentBCount: { increment: sentB },
          } : {})
        },
      });
      
      // Reset counters for next batch
      totalSent = 0;
      totalFailed = 0;
      sentA = 0;
      sentB = 0;
    }

    // -----------------------------------------------------------------------
    // Mark complete or running
    // -----------------------------------------------------------------------
    let finalStatus = "COMPLETED";

    await db.emailCampaign.update({
      where: { id: campaignId },
      data: {
        status: finalStatus as any,
        sentAt: options.isAbTestRemainder ? undefined : new Date(), // only set sentAt on initial send
        ...(isAbTestInitial && remainingContactIds.length > 0 ? { abTestStatus: 'running' } : {}),
        ...(options.isAbTestRemainder ? { abTestStatus: 'completed' } : {})
      },
    });

    clearCache(`strategy:${workspaceId}`);

    // Fire and forget — never await this
    if (finalStatus === "COMPLETED") {
      analyzeCampaignPerformance(campaignId).catch(err => console.error('[CampaignAnalysis]', err));
    }

    return {
      status: finalStatus as any,
      totalSent,
      totalFailed,
      totalSkipped,
    };
  } catch (err) {
    console.error(`[send-engine] Fatal error sending campaign ${campaignId}:`, err);

    await db.emailCampaign
      .update({
        where: { id: campaignId },
        data: { status: "FAILED" },
      })
      .catch(() => null);

    return { status: "FAILED", totalSent, totalFailed, totalSkipped };
  }
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

