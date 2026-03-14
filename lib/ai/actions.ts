'use server';

/**
 * lib/ai/actions.ts
 *
 * All AI-powered email marketing features.
 * Uses Groq (llama-3.3-70b-versatile) — same pattern as lib/templates/actions.ts
 *
 * Features:
 *   1. optimizeSubjectLine   — suggests 3 subject lines with reasoning
 *   2. improveEmailCopy      — reviews copy and returns specific suggestions
 *   3. predictEngagement     — estimates open/click/conversion rates
 *   4. buildCampaignSequence — generates a multi-email launch plan
 *   5. getStrategyAdvice     — advisor tip based on workspace activity
 */

import { requireWorkspaceAccess } from '@/lib/auth/session';
import { db } from '@/lib/db/client';

// ---------------------------------------------------------------------------
// Shared Groq helper
// ---------------------------------------------------------------------------

async function groq(prompt: string, maxTokens = 1000): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY is not set');

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: maxTokens,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await res.json();
  const text: string = data.choices?.[0]?.message?.content ?? '';
  return text.replace(/```json|```/g, '').trim();
}

// ---------------------------------------------------------------------------
// 1. Subject Line Optimizer
// ---------------------------------------------------------------------------

export interface SubjectSuggestion {
  subject: string;
  angle: string; // e.g. "curiosity" | "benefit" | "urgency"
  why: string;   // one-sentence reasoning
}

export interface OptimizeSubjectResult {
  score: number;         // 1-10 rating of original
  weakness: string;      // what's wrong with the original
  suggestions: SubjectSuggestion[];
}

export async function optimizeSubjectLine(
  subject: string,
  productContext: string
): Promise<{ success: true; data: OptimizeSubjectResult } | { success: false; error: string }> {
  try {
    await requireWorkspaceAccess();

    const text = await groq(`You are an expert email marketer who has studied thousands of high-performing campaigns.

Analyze this email subject line and suggest 3 better alternatives.

Subject line: "${subject}"
Product/context: "${productContext}"

Evaluation criteria: curiosity gap, clear benefit, specificity, urgency, action verbs, avoiding spam triggers.

Respond ONLY with a JSON object, no markdown:
{
  "score": <1-10 integer rating of the original>,
  "weakness": "<one sentence: the main weakness of the original>",
  "suggestions": [
    { "subject": "<subject line>", "angle": "<curiosity|benefit|urgency|proof|story>", "why": "<one sentence explaining why this works>" },
    { "subject": "<subject line>", "angle": "<angle>", "why": "<why>" },
    { "subject": "<subject line>", "angle": "<angle>", "why": "<why>" }
  ]
}`);

    const parsed = JSON.parse(text) as OptimizeSubjectResult;
    return { success: true, data: parsed };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'AI request failed' };
  }
}

// ---------------------------------------------------------------------------
// 2. Email Copy Improver
// ---------------------------------------------------------------------------

export interface CopyIssue {
  paragraph: number;     // 1-indexed paragraph number
  issue: string;         // what's wrong
  before: string;        // original text snippet (max 80 chars)
  after: string;         // suggested rewrite
  type: 'benefit' | 'cta' | 'clarity' | 'length' | 'opening';
}

export interface ImproveEmailResult {
  overallScore: number;  // 1-10
  summary: string;       // one sentence overall assessment
  issues: CopyIssue[];
  ctaStrength: 'weak' | 'moderate' | 'strong';
  ctaSuggestion?: string;
}

export async function improveEmailCopy(
  subject: string,
  htmlBody: string
): Promise<{ success: true; data: ImproveEmailResult } | { success: false; error: string }> {
  try {
    await requireWorkspaceAccess();

    // Strip HTML tags for cleaner analysis
    const plainText = htmlBody.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 2000);

    const text = await groq(`You are a conversion copywriter who helps email marketers improve their campaigns.

Analyze this email for copywriting issues. Focus on: benefit-driven messaging (not feature-listing), strong CTAs, paragraph length, opening hook, and clarity.

Subject: "${subject}"
Body text: "${plainText}"

Return ONLY a JSON object (no markdown):
{
  "overallScore": <1-10>,
  "summary": "<one sentence overall assessment>",
  "ctaStrength": "<weak|moderate|strong>",
  "ctaSuggestion": "<improved CTA text if ctaStrength is weak or moderate, otherwise null>",
  "issues": [
    {
      "paragraph": <1-indexed number>,
      "type": "<benefit|cta|clarity|length|opening>",
      "issue": "<what is wrong, one sentence>",
      "before": "<original snippet max 80 chars>",
      "after": "<improved version>"
    }
  ]
}

Return 2-4 issues maximum. Only flag real problems, not minor style preferences.`, 1200);

    const parsed = JSON.parse(text) as ImproveEmailResult;
    return { success: true, data: parsed };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'AI request failed' };
  }
}

// ---------------------------------------------------------------------------
// 3. Engagement Predictor
// ---------------------------------------------------------------------------

export interface EngagementPrediction {
  openRate:    { low: number; high: number; benchmark: number };
  clickRate:   { low: number; high: number; benchmark: number };
  conversion:  { low: number; high: number };
  verdict:     'strong' | 'average' | 'needs-work';
  topRisk:     string;   // biggest single risk factor
  topStrength: string;   // biggest strength
  quickWin:    string;   // one specific thing to do right now to improve it
}

export async function predictEngagement(
  subject: string,
  htmlBody: string,
  audienceSize: number
): Promise<{ success: true; data: EngagementPrediction } | { success: false; error: string }> {
  try {
    await requireWorkspaceAccess();

    const plainText = htmlBody.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 1500);

    const text = await groq(`You are an email marketing analyst with deep knowledge of industry benchmarks.

Predict the likely performance of this email campaign based on the subject line and copy quality.

Industry benchmarks: creator/course emails average 25-35% open rate, 2-5% click rate.

Subject: "${subject}"
Body preview: "${plainText}"
List size: ${audienceSize} subscribers

Respond ONLY with JSON (no markdown):
{
  "openRate":   { "low": <number>, "high": <number>, "benchmark": 28 },
  "clickRate":  { "low": <number>, "high": <number>, "benchmark": 3 },
  "conversion": { "low": <number>, "high": <number> },
  "verdict":    "<strong|average|needs-work>",
  "topRisk":    "<biggest single risk factor, one sentence>",
  "topStrength":"<biggest strength, one sentence>",
  "quickWin":   "<one specific actionable thing to improve before sending, one sentence>"
}`);

    const parsed = JSON.parse(text) as EngagementPrediction;
    return { success: true, data: parsed };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'AI request failed' };
  }
}

// ---------------------------------------------------------------------------
// 4. Campaign Sequence Builder
// ---------------------------------------------------------------------------

export interface SequenceEmail {
  emailNumber: number;
  type: string;        // e.g. "Story / Hook", "Value Lesson", "Social Proof"
  subject: string;
  purpose: string;     // one sentence describing the job of this email
  keyElements: string[]; // 3 bullet points of what to include
  sendTiming: string;  // e.g. "Day 1", "Day 3"
}

export interface CampaignSequence {
  sequenceName: string;
  framework: string;    // e.g. "Story → Value → Proof → Offer → Urgency"
  totalEmails: number;
  emails: SequenceEmail[];
  overallStrategy: string;
}

export async function buildCampaignSequence(
  product: string,
  audience: string,
  goal: string
): Promise<{ success: true; data: CampaignSequence } | { success: false; error: string }> {
  try {
    await requireWorkspaceAccess();

    const text = await groq(`You are a launch strategist who specializes in email sequences for creators and course sellers.

Build a high-converting email sequence using proven launch frameworks (Story → Value → Proof → Offer → Urgency).

Product: "${product}"
Audience: "${audience}"
Goal: "${goal}"

Create a 5-email sequence. Respond ONLY with JSON (no markdown):
{
  "sequenceName": "<name for this sequence>",
  "framework": "<framework used e.g. Story → Value → Proof → Offer → Urgency>",
  "totalEmails": 5,
  "overallStrategy": "<2 sentence strategy overview>",
  "emails": [
    {
      "emailNumber": 1,
      "type": "<email type e.g. Story / Hook>",
      "subject": "<compelling subject line>",
      "purpose": "<one sentence: what this email needs to accomplish>",
      "keyElements": ["<element 1>", "<element 2>", "<element 3>"],
      "sendTiming": "<e.g. Day 1>"
    }
  ]
}`, 2000);

    const parsed = JSON.parse(text) as CampaignSequence;
    return { success: true, data: parsed };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'AI request failed' };
  }
}

// ---------------------------------------------------------------------------
// 5. Strategy Advisor — analyzes workspace activity and returns one tip
// ---------------------------------------------------------------------------

export interface StrategyTip {
  trigger: string;     // what triggered this tip
  headline: string;    // short headline
  advice: string;      // 2-sentence actionable advice
  action: string;      // CTA label e.g. "Create campaign"
  actionHref: string;  // where to link
  priority: 'high' | 'medium' | 'low';
}

export async function getStrategyAdvice(): Promise<{ success: true; data: StrategyTip } | { success: false; error: string }> {
  try {
    const { workspaceId } = await requireWorkspaceAccess();

    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

    const [lastCampaign, newContacts, totalContacts, avgOpenRate] = await Promise.all([
      db.emailCampaign.findFirst({
        where: { workspaceId, status: 'COMPLETED' },
        orderBy: { sentAt: 'desc' },
        select: { sentAt: true, totalSent: true, totalOpened: true },
      }),
      db.contact.count({ where: { workspaceId, createdAt: { gte: sevenDaysAgo } } }),
      db.contact.count({ where: { workspaceId, status: 'SUBSCRIBED' } }),
      db.emailCampaign.aggregate({
        where: { workspaceId, status: 'COMPLETED', totalSent: { gt: 0 } },
        _avg: null,
      }),
    ]);

    const daysSinceLastSend = lastCampaign?.sentAt
      ? Math.floor((Date.now() - lastCampaign.sentAt.getTime()) / 86400000)
      : 999;

    const lastOpenRate = lastCampaign && lastCampaign.totalSent > 0
      ? ((lastCampaign.totalOpened / lastCampaign.totalSent) * 100).toFixed(1)
      : null;

    const context = `
Workspace stats:
- Days since last campaign sent: ${daysSinceLastSend}
- New subscribers this week: ${newContacts}
- Total subscribers: ${totalContacts}
- Last campaign open rate: ${lastOpenRate ? lastOpenRate + '%' : 'unknown'}
`.trim();

    const text = await groq(`You are a senior email marketing strategist advising a creator who sells online courses or communities.

Based on their workspace activity, give ONE specific, actionable piece of advice.

${context}

Rules:
- If they haven't sent in 7+ days, focus on re-engagement
- If they have many new subscribers, suggest a welcome sequence
- If open rate is below 20%, suggest subject line testing
- Keep advice concise and specific

Respond ONLY with JSON (no markdown):
{
  "trigger": "<what triggered this tip e.g. '${daysSinceLastSend} days since last email'>",
  "headline": "<short punchy headline, max 8 words>",
  "advice": "<2 sentences of specific actionable advice>",
  "action": "<CTA button text, max 4 words>",
  "actionHref": "<one of: /dashboard/campaigns/new | /dashboard/campaigns/sequence | /dashboard/contacts>",
  "priority": "<high|medium|low>"
}`, 600);

    const parsed = JSON.parse(text) as StrategyTip;
    return { success: true, data: parsed };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'AI request failed' };
  }
}
