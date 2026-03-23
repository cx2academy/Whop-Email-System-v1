'use server';

/**
 * lib/ai/block-generator.ts
 *
 * Generates email HTML from a simple brief.
 * Used by the block editor's "Generate with AI" button.
 * Wraps the existing generateEmailDraft action with sensible defaults.
 */

import { generateEmailDraft, type CampaignBrief } from './actions';

interface BlockBrief {
  subject:  string;
  product:  string;
  audience: string;
  goal:     string;
}

export async function generateEmailBlocks(
  brief: BlockBrief
): Promise<{ success: true; data: { subject: string; htmlBody: string } } | { success: false; error: string }> {
  const campaignBrief: CampaignBrief = {
    product:   brief.product,
    audience:  brief.audience,
    tone:      'friendly',
    goal:      brief.goal,
  };

  const result = await generateEmailDraft(
    campaignBrief,
    'broadcast',
    `Email about ${brief.product} to ${brief.audience}`,
    brief.subject,
    [brief.goal]
  );

  if (!result.success) return { success: false, error: result.error };
  return { success: true, data: { subject: result.data.subject, htmlBody: result.data.htmlBody } };
}
