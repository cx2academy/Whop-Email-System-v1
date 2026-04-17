import { groq } from '@/lib/ai/actions';
import { checkCredits, deductCredits } from '@/lib/ai/credits';
import { db } from '@/lib/db/client';

export interface NLSegmentResult {
  understood: string;
  rules: {
    operator: 'AND' | 'OR';
    conditions: Array<{
      field: string;
      op: string;
      value: string;
      humanReadable: string;
    }>;
  };
  confidence: 'high' | 'medium' | 'low';
  warnings: string[];
}

export async function buildSegmentFromNL(
  description: string,
  workspaceId: string
): Promise<{ success: true; data: NLSegmentResult } | { success: false; error: string }> {
  try {
    const _check = await checkCredits(workspaceId, 'buildSegmentFromNL');
    if (!_check.allowed) {
      return { success: false, error: `Not enough AI credits. Need 3, have ${_check.currentBalance}.` };
    }

    const tags = await db.tag.findMany({
      where: { workspaceId },
      select: { id: true, name: true },
    });

    // Map tags for context
    const tagContext = tags.reduce((acc, t) => {
      acc[t.id] = t.name;
      return acc;
    }, {} as Record<string, string>);

    const prompt = `
ROLE: "You are a database query translator specializing in email marketing segmentation. You convert natural language audience descriptions into structured filter rules. You have deep knowledge of email marketing metrics and what they mean for creator audiences."

CONTEXT:
- Available filter fields with explanations:
  tag: whether contact has a specific tag (requires tag name or ID)
  status: contact status (SUBSCRIBED, UNSUBSCRIBED, BOUNCED, COMPLAINED)
  createdAt: when contact joined (use relative like '7', '30', '90' for days)
  lastOpened: last time they opened any email (use relative days like '7', '30')
  lastClicked: last time they clicked any email (use relative days like '7', '30')
  opensCount: total number of emails opened (integer)
  emailsSent: total emails sent to this contact (integer)
  whopStatus: Whop membership status (active, canceled, past_due, trialing, completed)
  whopPasses: Whop product/pass ID (string ID like 'prod_xxxx' or 'pass_xxxx')
- Available operators for each field:
  dates (createdAt, lastOpened, lastClicked): within_days, older_than_days, never
  numbers (opensCount, emailsSent): gt, lt
  tags (tag): has, not_has
  status (status): eq, not_eq
  whopStatus (whopStatus): eq, not_eq
  whopPasses (whopPasses): has, not_has
- Available tags in this workspace: ${JSON.stringify(tagContext)}

RULES:
- Translate intent precisely — "engaged subscribers" means opened in last 30 days
- "New" contacts = joined in last 14 days
- "Cold" or "inactive" = no open in last 60+ days
- "VIP" or "customers" = likely a tag — if the tag exists in the workspace, use it; if not, add a warning
- "Active members" = whopStatus is 'active'
- "Canceled members" = whopStatus is 'canceled'
- "People with the Gold Pass" = whopPasses has 'Gold Pass' (if you don't know the ID, use the name and add a warning)
- When description mentions multiple criteria connected by "and", use operator: 'AND'
- When description uses "or", "either", use operator: 'OR'
- Provide humanReadable for each condition (what the user will see before confirming)
- If the description is ambiguous, pick the most reasonable interpretation and explain in warnings[]
- For 'within_days' or 'older_than_days', the value should be the number of days (e.g., "7", "30").
- For 'never', value can be empty string "".

FEW-SHOT EXAMPLES:
Input: "people who joined this month and haven't opened any email yet"
Output: {
  "understood": "Contacts who joined in the last 30 days and have never opened an email.",
  "rules": {
    "operator": "AND",
    "conditions": [
      { "field": "createdAt", "op": "within_days", "value": "30", "humanReadable": "Joined in the last 30 days" },
      { "field": "lastOpened", "op": "never", "value": "", "humanReadable": "Have never opened an email" }
    ]
  },
  "confidence": "high",
  "warnings": []
}

Input: "active members who haven't clicked in 2 weeks"
Output: {
  "understood": "Active Whop members who have not clicked a link in the last 14 days.",
  "rules": {
    "operator": "AND",
    "conditions": [
      { "field": "whopStatus", "op": "eq", "value": "active", "humanReadable": "Whop status is active" },
      { "field": "lastClicked", "op": "older_than_days", "value": "14", "humanReadable": "Last clicked more than 14 days ago" }
    ]
  },
  "confidence": "high",
  "warnings": []
}

INPUT TO TRANSLATE: "${description}"
`;

    const schema = {
      type: 'object',
      properties: {
        understood: { type: 'string' },
        rules: {
          type: 'object',
          properties: {
            operator: { type: 'string', enum: ['AND', 'OR'] },
            conditions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string', enum: ['tag', 'status', 'createdAt', 'lastOpened', 'lastClicked', 'opensCount', 'emailsSent', 'whopStatus', 'whopPasses'] },
                  op: { type: 'string', enum: ['eq', 'not_eq', 'has', 'not_has', 'gt', 'lt', 'within_days', 'older_than_days', 'never'] },
                  value: { type: 'string' },
                  humanReadable: { type: 'string' },
                },
                required: ['field', 'op', 'value', 'humanReadable'],
              },
            },
          },
          required: ['operator', 'conditions'],
        },
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        warnings: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      required: ['understood', 'rules', 'confidence', 'warnings'],
    };

    const result = await groq(prompt, {
      model: 'llama-3.3-70b-versatile',
      jsonSchema: schema,
      temperature: 0.1,
    });

    const parsed = JSON.parse(result) as NLSegmentResult;
    await deductCredits(workspaceId, 'buildSegmentFromNL');

    return { success: true, data: parsed };
  } catch (error) {
    console.error('[buildSegmentFromNL] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'AI request failed' };
  }
}
