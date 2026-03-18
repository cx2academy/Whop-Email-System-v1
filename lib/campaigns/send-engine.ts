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
import { buildPlainText } from "@/emails/broadcast";
import { SEND_BATCH_SIZE, SEND_BATCH_DELAY_MS } from "@/lib/constants";
import { checkThrottle } from "@/lib/deliverability/send-throttle";
import { sleep } from "@/lib/utils";
import type { Contact, EmailCampaign } from "@prisma/client";
import { parseVariables, buildSendVariables } from "@/lib/templates/variable-parser";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SendCampaignOptions {
  campaignId: string;
  workspaceId: string;
}

export interface SendCampaignResult {
  status: "COMPLETED" | "FAILED" | "PARTIAL";
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
  workspaceId: string
): Promise<Contact[]> {
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
      },
    }),
  ]);

  if (!campaign || !workspace) {
    console.error(`[send-engine] Campaign or workspace not found: ${campaignId}`);
    return { status: "FAILED", totalSent: 0, totalFailed: 0, totalSkipped: 0 };
  }

  // Guard: only SCHEDULED or DRAFT campaigns can be sent
  if (!["SCHEDULED", "DRAFT"].includes(campaign.status)) {
    console.warn(`[send-engine] Campaign ${campaignId} is already ${campaign.status} — skipping`);
    return { status: "FAILED", totalSent: 0, totalFailed: 0, totalSkipped: 0 };
  }

  // Mark as SENDING immediately to prevent concurrent dispatch
  await db.emailCampaign.update({
    where: { id: campaignId },
    data: { status: "SENDING" },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
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
    const audience = await resolveAudience(campaign, workspaceId);

    if (audience.length === 0) {
      await db.emailCampaign.update({
        where: { id: campaignId },
        data: {
          status: "COMPLETED",
          sentAt: new Date(),
          totalRecipients: 0,
        },
      });
      return { status: "COMPLETED", totalSent: 0, totalFailed: 0, totalSkipped: 0 };
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
    // For A/B campaigns: odd-indexed contacts get subject A, even get subject B
    // -----------------------------------------------------------------------
    const isAbTest = campaign.isAbTest && !!campaign.abSubjectB;

    // Record total recipients upfront
    await db.emailCampaign.update({
      where: { id: campaignId },
      data: { totalRecipients: audience.length },
    });

    // -----------------------------------------------------------------------
    // Send in batches
    // -----------------------------------------------------------------------
    const batches = chunkArray(audience, SEND_BATCH_SIZE);

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx];

      // Add delay between batches (rate protection)
      if (batchIdx > 0) {
        await sleep(SEND_BATCH_DELAY_MS);
      }

      await Promise.all(
        batch.map(async (contact, contactIdx) => {
          const absoluteIdx = batchIdx * SEND_BATCH_SIZE + contactIdx;
          const isVariantB = isAbTest && absoluteIdx % 2 === 1;
          const subject = isVariantB && campaign.abSubjectB
            ? campaign.abSubjectB
            : campaign.subject;
          const variantSuffix = isVariantB ? ":B" : ":A";
          const idempotencyKey = `${campaignId}:${contact.id}${isAbTest ? variantSuffix : ""}`;

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

          // DEBUG — remove after confirming tracking works
          console.log("[send-engine] appUrl:", appUrl);
          console.log("[send-engine] pixelUrl:", trackingPixelUrl);
          console.log("[send-engine] hasPixel:", trackedHtml.includes("/api/track/open"));
          console.log("[send-engine] hasClickLinks:", trackedHtml.includes("/api/track/click"));
          console.log("[send-engine] originalHtml snippet:", campaign.htmlBody.slice(0, 200));

          const plainText = buildPlainText({
            htmlBody: personalizedHtml,
            fromName,
            unsubscribeUrl,
          });

          const result = await sendEmail(
            {
              to: contact.email,
              subject: personalizedSubject,
              html: trackedHtml,
              text: plainText,
              from,
              idempotencyKey,
            },
            workspaceId
          );

          // -----------------------------------------------------------------
          // Record result
          // -----------------------------------------------------------------
          if (result.success) {
            totalSent++;
            await db.emailSend.update({
              where: { id: emailSend.id },
              data: {
                status: "SENT",
                messageId: result.messageId,
                sentAt: new Date(),
                provider: result.provider === "smtp" ? "SMTP"
                        : result.provider === "ses" ? "SES"
                        : result.provider === "sendgrid" ? "SENDGRID"
                        : "RESEND",
              },
            });
          } else {
            totalFailed++;
            await db.emailSend.update({
              where: { id: emailSend.id },
              data: {
                status: "FAILED",
                failureReason: result.error,
                provider: result.provider === "smtp" ? "SMTP"
                        : result.provider === "ses" ? "SES"
                        : result.provider === "sendgrid" ? "SENDGRID"
                        : "RESEND",
              },
            });
          }
        })
      );

      // Update campaign stats after each batch
      await db.emailCampaign.update({
        where: { id: campaignId },
        data: { totalSent, totalFailed },
      });
    }

    // -----------------------------------------------------------------------
    // Mark complete
    // -----------------------------------------------------------------------
    const finalStatus = totalFailed === 0 ? "COMPLETED" : "COMPLETED";
    await db.emailCampaign.update({
      where: { id: campaignId },
      data: {
        status: finalStatus,
        sentAt: new Date(),
        totalSent,
        totalFailed,
      },
    });

    return {
      status: totalFailed === 0 ? "COMPLETED" : "PARTIAL",
      totalSent,
      totalFailed,
      totalSkipped,
    };
  } catch (err) {
    console.error(`[send-engine] Fatal error sending campaign ${campaignId}:`, err);

    await db.emailCampaign
      .update({
        where: { id: campaignId },
        data: { status: "FAILED", totalSent, totalFailed },
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
