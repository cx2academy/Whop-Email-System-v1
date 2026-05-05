import { groq } from '@/lib/ai/actions';
import { checkCredits, deductCredits } from '@/lib/ai/credits';
import { db } from '@/lib/db/client';
import type { CampaignBrief } from '@/lib/ai/actions';

const EMAIL_SCAFFOLD = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:0;background:#ffffff;">
  <div style="padding:24px 32px 8px;">
    <p style="margin:0;font-size:13px;color:#6b7280;">{{senderName}}</p>
  </div>
  <div style="padding:16px 32px 8px;">
    <h1 style="margin:0 0 12px;font-size:26px;font-weight:700;line-height:1.25;color:#111827;">[HEADLINE]</h1>
    <p style="margin:0;font-size:16px;line-height:1.6;color:#374151;">Hi {{firstName | fallback: 'there'}},</p>
    <p style="margin:12px 0 0;font-size:16px;line-height:1.6;color:#374151;">[OPENING HOOK — 2-3 sentences]</p>
  </div>
  <div style="padding:16px 32px;">
    <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#374151;">[BODY PARAGRAPH 1]</p>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#374151;">[BODY PARAGRAPH 2]</p>
    <ul style="margin:0 0 14px;padding-left:20px;">
      <li style="font-size:15px;line-height:1.8;color:#374151;">[BENEFIT 1]</li>
      <li style="font-size:15px;line-height:1.8;color:#374151;">[BENEFIT 2]</li>
      <li style="font-size:15px;line-height:1.8;color:#374151;">[BENEFIT 3]</li>
    </ul>
  </div>
  <div style="padding:8px 32px 24px;text-align:center;">
    <a href="{{cta_url}}" style="display:inline-block;background:#2563eb;color:#ffffff;font-size:16px;font-weight:700;padding:14px 36px;border-radius:8px;text-decoration:none;">[CTA BUTTON TEXT]</a>
  </div>
  <div style="padding:0 32px 16px;">
    <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#374151;">[OPTIONAL ADDITIONAL CONTENT — delete if not needed]</p>
  </div>
  <div style="padding:8px 32px 32px;">
    <p style="margin:0;font-size:15px;line-height:1.65;color:#374151;">[CLOSING SENTENCE]</p>
    <p style="margin:12px 0 0;font-size:15px;color:#374151;">— {{senderName}}</p>
  </div>
  <div style="border-top:1px solid #e5e7eb;margin:0 32px;"></div>
  <div style="padding:16px 32px;text-align:center;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">You received this because you're a member of our community.</p>
    <p style="margin:6px 0 0;font-size:12px;"><a href="{{unsubscribe_url}}" style="color:#9ca3af;text-decoration:underline;">Unsubscribe</a></p>
  </div>
</div>`.trim();

export interface VariantSpec {
  segmentName: string;        // e.g. "New subscribers", "Engaged veterans", "Cold leads"
  segmentDescription: string; // describe audience characteristics
  tone: string;               // how to write to this segment specifically
  emphasize: string;          // what aspect to emphasize for this audience
  audienceSegmentId?: string; // actual DB segment ID if mapped
  audienceTagId?: string;     // actual DB tag ID if mapped
}

export interface GeneratedVariant {
  segmentName: string;
  subject: string;
  htmlBody: string;
  ctaText: string;
  keyDifference: string;  // one sentence: how this differs from the other variants
}

export const DEFAULT_VARIANT_SPECS: VariantSpec[] = [
  { segmentName: "New subscribers", segmentDescription: "Joined in the last 30 days, haven't received many emails, building trust", tone: "welcoming and educational", emphasize: "what makes you unique and the value they'll get" },
  { segmentName: "Engaged fans", segmentDescription: "Opens most emails, has clicked links, highly interested in your content", tone: "direct and rewarding, treat them as insiders", emphasize: "exclusive access or early information, stronger CTA" },
  { segmentName: "Cold leads", segmentDescription: "Haven't opened an email in 60+ days, may have forgotten who you are", tone: "humble re-introduction, acknowledge the silence", emphasize: "what's new and why now is the right time to re-engage, low-friction CTA" }
];

export async function generateEmailVariants(
  brief: CampaignBrief,
  segments: VariantSpec[],
  workspaceId: string
): Promise<{ success: true; data: GeneratedVariant[] } | { success: false; error: string }> {
  try {
    const totalCost = segments.length * 5;
    
    // Check if we have enough credits for ALL variants upfront
    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
      select: { aiCredits: true },
    });
    
    if (!workspace || workspace.aiCredits < totalCost) {
      return { success: false, error: `Not enough AI credits. Need ${totalCost}, have ${workspace?.aiCredits || 0}.` };
    }

    const results = await Promise.allSettled(
      segments.map(async (segment) => {
        const prompt = `ROLE: "You are a conversion email copywriter who specializes in audience segmentation. You understand that the same product message must be framed differently for different audience segments to be effective."
    
CORE BRIEF:
Product: ${brief.product}
Goal: ${brief.goal}

THIS VARIANT'S AUDIENCE: ${segment.segmentName}
Audience description: ${segment.segmentDescription}
Tone for this audience: ${segment.tone}
Emphasize for this audience: ${segment.emphasize}

RULES:
  - This email is specifically for ${segment.segmentName}. Write as if you ONLY know these people
  - The core message is the same but the framing, tone, and emphasis must match this specific audience
  - New subscribers: focus on trust-building and what makes you unique, lighter CTA
  - Engaged veterans: reward their loyalty, give them inside access or early info, stronger CTA
  - Cold/inactive leads: acknowledge the gap, re-establish value, low-friction re-engagement CTA
  - Never mention the other segments or that this is a segmented campaign
  - Use the same HTML scaffold structure from the base generation function

SCAFFOLD TO FILL IN:
Use this exact HTML structure. Replace every [PLACEHOLDER] with real copy. Keep all inline styles exactly as-is. Delete the optional section if not needed. Do NOT add new HTML structure or change styles.

${EMAIL_SCAFFOLD}

OUTPUT:
Respond ONLY with a JSON object (no markdown backticks, no extra text):
{
  "subject": "<final subject line — specific, curiosity-driven, max 60 chars>",
  "ctaText": "<action-oriented CTA text used in the button, max 6 words>",
  "layout": "<describe the layout used e.g. headline → story → benefits → cta → closing>",
  "designNotes": "<one sentence explaining the key design decision e.g. why CTA is placed where it is>",
  "htmlBody": "<the complete filled-in HTML from the scaffold above>",
  "keyDifference": "<one sentence: how this differs from the other variants>"
}`;

        const text = await groq(prompt, { maxTokens: 2500 });
        const parsed = JSON.parse(text);
        
        // Deduct credits per successful variant
        await deductCredits(workspaceId, 'generateEmailVariant');

        return {
          segmentName: segment.segmentName,
          subject: parsed.subject,
          htmlBody: parsed.htmlBody,
          ctaText: parsed.ctaText,
          keyDifference: parsed.keyDifference,
        } as GeneratedVariant;
      })
    );

    const successfulVariants: GeneratedVariant[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        successfulVariants.push(result.value);
      } else {
        console.error('Failed to generate variant:', result.reason);
      }
    }

    if (successfulVariants.length === 0) {
      return { success: false, error: 'Failed to generate any variants.' };
    }

    return { success: true, data: successfulVariants };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'AI request failed' };
  }
}
