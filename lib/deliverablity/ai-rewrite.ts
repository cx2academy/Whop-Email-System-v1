/**
 * lib/deliverability/ai-rewrite.ts
 *
 * Optional AI-powered email rewrite to reduce spam signals.
 * Calls the Anthropic API (claude-sonnet-4-20250514).
 *
 * Triggered manually — never runs automatically before send.
 * Returns original + rewritten version so user can compare.
 */

export interface RewriteResult {
  originalSubject: string;
  rewrittenSubject: string;
  originalHtml: string;
  rewrittenHtml: string;
  changes: string[]; // human-readable list of what was changed
}

export async function rewriteForDeliverability(
  subject: string,
  html: string,
  spamIssues: string[]
): Promise<RewriteResult> {
  const issueList = spamIssues.length > 0
    ? spamIssues.map((i) => `- ${i}`).join('\n')
    : '- No specific issues detected, but general deliverability improvements apply';

  const prompt = `You are an expert email deliverability consultant. 
Rewrite the following email to improve inbox placement while preserving the original message and intent.

Detected spam signals to fix:
${issueList}

ORIGINAL SUBJECT:
${subject}

ORIGINAL HTML BODY:
${html}

Return ONLY a JSON object with this exact structure (no markdown, no explanation):
{
  "subject": "<rewritten subject>",
  "html": "<rewritten html>",
  "changes": ["<change 1>", "<change 2>", "..."]
}

Rules:
- Keep the same message and tone
- Remove or replace spam trigger phrases naturally
- Keep all links intact
- Keep the unsubscribe link
- Do not add new content
- Changes array should list what you changed, e.g. "Replaced 'GUARANTEED MONEY' with 'proven results'"`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json() as { content: { type: string; text: string }[] };
  const text = data.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');

  // Strip any accidental markdown fences
  const clean = text.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(clean) as { subject: string; html: string; changes: string[] };

  return {
    originalSubject: subject,
    rewrittenSubject: parsed.subject,
    originalHtml: html,
    rewrittenHtml: parsed.html,
    changes: parsed.changes,
  };
}
