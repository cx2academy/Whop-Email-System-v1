'use server';

/**
 * lib/ai/sequence-materializer.ts
 *
 * Converts an AI-generated CampaignSequence plan into real EmailCampaign
 * database rows, one per email in the sequence.
 *
 * Flow:
 *   1. Parse sendTiming (e.g. "Day 1", "Day 3") into scheduledAt dates
 *   2. For each email in the sequence, call generateEmailDraft() to get full HTML
 *   3. Bulk-insert EmailCampaign rows with status DRAFT and scheduledAt set
 *   4. Return the list of created campaign IDs
 *
 * The user then reviews each draft, edits if needed, and sends/schedules
 * individually — or uses a future "approve all" action.
 *
 * Credit cost:
 *   5 credits per email draft × 5 emails = 25 credits total for a full sequence.
 *   We check upfront that balance is sufficient before starting.
 */

import { db } from '@/lib/db/client';
import { requireAdminAccess } from '@/lib/auth/session';
import { checkCredits, deductCredits } from '@/lib/ai/credits';
import { generateEmailDraft, type CampaignSequence, type CampaignBrief } from '@/lib/ai/actions';
import { checkUsageLimit } from '@/lib/plans/gates';
import { revalidatePath } from 'next/cache';
import type { ApiResponse } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MaterializeSequenceInput {
  sequence:       CampaignSequence;
  brief:          CampaignBrief;
  audienceTagIds: string[];
  audienceSegmentIds?: string[];
  /** Base date for scheduling. Defaults to tomorrow at 9am. */
  startDate?: Date;
}

export interface MaterializeSequenceResult {
  campaigns: Array<{
    id:          string;
    name:        string;
    subject:     string;
    scheduledAt: Date | null;
    emailNumber: number;
  }>;
  totalCreated: number;
  creditsUsed:  number;
  skippedDrafts: number; // emails where AI draft generation failed (created as blank)
}

// ---------------------------------------------------------------------------
// Parse "Day N" timing strings into Date objects
// ---------------------------------------------------------------------------

function parseSendTiming(timing: string, baseDate: Date): Date {
  // Handles: "Day 1", "Day 3", "Day 7", "Week 2", "Immediately", etc.
  const dayMatch = timing.match(/day\s*(\d+)/i);
  if (dayMatch) {
    const days = parseInt(dayMatch[1], 10) - 1; // "Day 1" = baseDate + 0
    const d = new Date(baseDate);
    d.setDate(d.getDate() + Math.max(0, days));
    return d;
  }

  const weekMatch = timing.match(/week\s*(\d+)/i);
  if (weekMatch) {
    const weeks = parseInt(weekMatch[1], 10) - 1;
    const d = new Date(baseDate);
    d.setDate(d.getDate() + weeks * 7);
    return d;
  }

  // "Immediately" or unrecognised → use base date
  return new Date(baseDate);
}

// ---------------------------------------------------------------------------
// Auto-generate a campaign name from sequence + email info
// ---------------------------------------------------------------------------

function buildCampaignName(
  sequenceName: string,
  emailNumber: number,
  emailType: string
): string {
  // e.g. "Black Friday Launch — Email 1: Story / Hook"
  return `${sequenceName} — Email ${emailNumber}: ${emailType}`;
}

// ---------------------------------------------------------------------------
// Main: materializeSequence
// ---------------------------------------------------------------------------

export async function materializeSequence(
  input: MaterializeSequenceInput
): Promise<ApiResponse<MaterializeSequenceResult>> {
  const { workspaceId } = await requireAdminAccess();

  const { sequence, brief, audienceTagIds, audienceSegmentIds = [], startDate } = input;
  const emailCount = sequence.emails.length;

  // ── Credit pre-check ────────────────────────────────────────────────────
  // generateEmailDraft costs 5 credits each
  const creditsNeeded = emailCount * 5;
  const creditCheck = await checkCredits(workspaceId, 'generateEmailDraft');

  if (!creditCheck.allowed || creditCheck.currentBalance < creditsNeeded) {
    return {
      success: false,
      error: `Not enough AI credits. This sequence needs ${creditsNeeded} credits (${emailCount} emails × 5). You have ${creditCheck.currentBalance}.`,
    };
  }

  // ── Plan gate — check campaign count limit ──────────────────────────────
  const campaignGate = await checkUsageLimit({ workspaceId, type: 'campaigns' });
  if (!campaignGate.allowed) {
    return {
      success: false,
      error: 'Campaign limit reached for your current plan. Upgrade to create more campaigns.',
    };
  }

  // ── Base scheduling date ────────────────────────────────────────────────
  const base = startDate ?? (() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0); // 9am tomorrow
    return tomorrow;
  })();

  // ── Generate drafts + create campaigns ─────────────────────────────────
  const createdCampaigns: MaterializeSequenceResult['campaigns'] = [];
  let creditsUsed = 0;
  let skippedDrafts = 0;

  for (const email of sequence.emails) {
    const scheduledAt = parseSendTiming(email.sendTiming, base);
    const campaignName = buildCampaignName(sequence.sequenceName, email.emailNumber, email.type);

    // Generate full HTML draft for this email
    let subject = email.subject;
    let htmlBody = buildFallbackHtml(email.subject, email.purpose, email.keyElements);

    try {
      const draftResult = await generateEmailDraft(
        brief,
        email.type,
        email.purpose,
        email.subject,
        email.keyElements
      );

      if (draftResult.success) {
        subject  = draftResult.data.subject;
        htmlBody = draftResult.data.htmlBody;
        creditsUsed += 5;
      } else {
        // Draft generation failed — use fallback HTML, don't block the rest
        skippedDrafts++;
      }
    } catch {
      skippedDrafts++;
    }

    // Create the campaign row
    const campaign = await db.emailCampaign.create({
      data: {
        workspaceId,
        name:               campaignName,
        subject,
        htmlBody,
        status:             'DRAFT',
        type:               'BROADCAST',
        scheduledAt,
        audienceTagIds,
        audienceSegmentIds,
        // Store sequence metadata for reference
        previewText:        `Email ${email.emailNumber} of ${emailCount} — ${email.type}`,
      },
      select: {
        id:          true,
        name:        true,
        subject:     true,
        scheduledAt: true,
      },
    });

    createdCampaigns.push({
      ...campaign,
      emailNumber: email.emailNumber,
    });
  }

  revalidatePath('/dashboard/campaigns');

  return {
    success: true,
    data: {
      campaigns:    createdCampaigns,
      totalCreated: createdCampaigns.length,
      creditsUsed,
      skippedDrafts,
    },
  };
}

// ---------------------------------------------------------------------------
// Fallback HTML — used when AI draft generation fails for one email
// Gives the user a structured blank template to fill in manually
// ---------------------------------------------------------------------------

function buildFallbackHtml(
  subject: string,
  purpose: string,
  keyElements: string[]
): string {
  const elementsHtml = keyElements
    .map((el) => `<li style="font-size:15px;line-height:1.8;color:#374151;">${el}</li>`)
    .join('\n      ');

  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:0;background:#ffffff;">
  <div style="padding:24px 32px 8px;">
    <p style="margin:0;font-size:13px;color:#6b7280;">{{senderName}}</p>
  </div>
  <div style="padding:16px 32px;">
    <h1 style="margin:0 0 12px;font-size:26px;font-weight:700;line-height:1.25;color:#111827;">${subject}</h1>
    <p style="margin:0;font-size:16px;line-height:1.6;color:#374151;">Hi {{firstName | fallback: 'there'}},</p>
    <p style="margin:12px 0 0;font-size:15px;line-height:1.65;color:#374151;">
      <!-- Purpose: ${purpose} -->
      [Write your opening paragraph here]
    </p>
  </div>
  <div style="padding:8px 32px;">
    <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#111827;">Key points to cover:</p>
    <ul style="margin:0;padding-left:20px;">
      ${elementsHtml}
    </ul>
  </div>
  <div style="padding:16px 32px 24px;text-align:center;">
    <a href="{{cta_url}}" style="display:inline-block;background:#2563eb;color:#ffffff;font-size:16px;font-weight:700;padding:14px 36px;border-radius:8px;text-decoration:none;">[Add your CTA]</a>
  </div>
  <div style="padding:8px 32px 32px;">
    <p style="margin:0;font-size:15px;line-height:1.65;color:#374151;">— {{senderName}}</p>
  </div>
  <div style="border-top:1px solid #e5e7eb;margin:0 32px;"></div>
  <div style="padding:16px 32px;text-align:center;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">You received this because you're a member of our community.</p>
    <p style="margin:6px 0 0;font-size:12px;"><a href="{{unsubscribe_url}}" style="color:#9ca3af;text-decoration:underline;">Unsubscribe</a></p>
  </div>
</div>`;
}
