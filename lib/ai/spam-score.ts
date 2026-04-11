import { groq } from '@/lib/ai/actions';
import { checkCredits, deductCredits } from '@/lib/ai/credits';
import { requireWorkspaceAccess } from '@/lib/auth/session';

export interface SpamFlag {
  type: 'subject' | 'body' | 'links' | 'ratio' | 'cta';
  severity: 'low' | 'medium' | 'high';
  description: string;    // specific issue found
  fix: string;            // one-sentence fix suggestion
}

export interface SpamScoreResult {
  score: number;           // 0-100 (0 = clean, 100 = definitely spam)
  verdict: 'safe' | 'caution' | 'danger';  // <30 safe, 30-60 caution, 60+ danger
  flags: SpamFlag[];
  canSend: boolean;        // false if score >= 70
}

export async function scoreEmailForSpam(
  subject: string,
  htmlBody: string,
  workspaceId: string
): Promise<{ success: true; data: SpamScoreResult } | { success: false; error: string }> {
  try {
    const _check = await checkCredits(workspaceId, 'scoreEmailForSpam');
    if (!_check.allowed) {
      return { success: false, error: `Not enough AI credits. Need 2, have ${_check.currentBalance}.` };
    }

    const plainTextBody = htmlBody.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    const prompt = `
ROLE: "You are a senior email deliverability engineer with 10 years of experience at major ESPs (Mailchimp, SendGrid, Klaviyo). You have analyzed tens of thousands of emails that were flagged as spam and know exactly what triggers spam filters at Gmail, Outlook, and Apple Mail."

RULES:
- Analyze BOTH the subject line AND the email body independently
- Common spam triggers: ALL CAPS words, excessive exclamation marks, spam words (free, winner, guarantee, limited time, act now, click here), deceptive subject lines, image-only emails, bad text-to-link ratio (too many links), missing unsubscribe link
- Score 0-100: 0-29 = clean, 30-59 = caution (may end up in promotions), 60-100 = danger (likely filtered)
- Only flag REAL issues. Do not flag legitimate urgency or CTAs if they're not spammy
- Subject line issues are weighted 2× body issues because subject is the first spam trigger
- Maximum 4 flags per analysis

OUTPUT JSON:
{
  "score": <integer 0-100>,
  "verdict": "<safe|caution|danger>",
  "canSend": <boolean — false only if score >= 70>,
  "flags": [
    {
      "type": "<subject|body|links|ratio|cta>",
      "severity": "<low|medium|high>",
      "description": "<specific problem found, quote the offending text>",
      "fix": "<one specific actionable fix>"
    }
  ]
}

EMAIL TO ANALYZE:
Subject: ${subject}
Body:
${plainTextBody}
`;

    const schema = {
      type: 'object',
      properties: {
        score: { type: 'integer' },
        verdict: { type: 'string', enum: ['safe', 'caution', 'danger'] },
        canSend: { type: 'boolean' },
        flags: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['subject', 'body', 'links', 'ratio', 'cta'] },
              severity: { type: 'string', enum: ['low', 'medium', 'high'] },
              description: { type: 'string' },
              fix: { type: 'string' },
            },
            required: ['type', 'severity', 'description', 'fix'],
          },
        },
      },
      required: ['score', 'verdict', 'canSend', 'flags'],
    };

    const result = await groq(prompt, {
      model: 'llama-3.3-70b-versatile',
      jsonSchema: schema,
      temperature: 0.1,
    });

    const parsed = JSON.parse(result) as SpamScoreResult;
    await deductCredits(workspaceId, 'scoreEmailForSpam');

    return { success: true, data: parsed };
  } catch (error) {
    console.error('[scoreEmailForSpam] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'AI request failed' };
  }
}
