'use server';

/**
 * lib/ai/block-generator.ts
 * Wraps generateEmailDraft for use in the block editor's AI panel.
 */

import { generateEmailDraft } from './actions';

interface BlockBrief {
  subject: string;
  product: string;
  audience: string;
  goal: string;
}

export async function generateEmailBlocks(
  brief: BlockBrief
): Promise<{ success: true; data: { subject: string; htmlBody: string } } | { success: false; error: string }> {
  const result = await generateEmailDraft(
    { product: brief.product, audience: brief.audience, tone: 'friendly', goal: brief.goal },
    'broadcast',
    `Email about ${brief.product}`,
    brief.subject,
    [brief.goal]
  );
  if (!result.success) return { success: false, error: result.error };
  return { success: true, data: { subject: result.data.subject, htmlBody: result.data.htmlBody } };
}
