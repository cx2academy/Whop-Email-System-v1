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
import { checkCredits, deductCredits, InsufficientCreditsError } from '@/lib/ai/credits';
import { getCached, setCached } from '@/lib/ai/cache';
import { subjectLinePrompt, copyImproverPrompt, engagementPredictorPrompt } from '@/lib/ai/prompts';
import { injectVoiceProfile, type VoiceProfile } from '@/lib/ai/voice-profile';

// ---------------------------------------------------------------------------
// Shared Groq helper & Security
// ---------------------------------------------------------------------------

export async function sanitizeAiInput(text: string | undefined | null, maxLength: number = 1000): Promise<string> {
  if (!text) return '';
  return text.trim().slice(0, maxLength);
}

export async function groq(prompt: string, options?: { maxTokens?: number; temperature?: number; jsonSchema?: any; model?: string }): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY is not set');

  const body: any = {
    model: options?.model || 'llama-3.3-70b-versatile',
    max_tokens: options?.maxTokens || 1000,
    temperature: options?.temperature || 0.7,
    messages: [{ role: 'user', content: prompt }],
  };

  if (options?.jsonSchema) {
    body.response_format = { type: 'json_object' };
    // Groq supports JSON mode but doesn't strictly enforce schema via API yet like OpenAI does,
    // so we rely on the prompt instructing it to output JSON matching the schema.
  }

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message = errorData.error?.message || `Groq API error: ${res.status} ${res.statusText}`;
    
    if (res.status === 429) {
      // Parse "try again in XmYs" or "try again in Xs"
      const match = message.match(/try again in (?:([0-9.]+)m)?([0-9.]+)s/);
      if (match) {
        const minutes = match[1] ? parseFloat(match[1]) : 0;
        const seconds = match[2] ? parseFloat(match[2]) : 0;
        const totalWaitSeconds = (minutes * 60) + seconds;
        
        // If the wait time is massive (e.g. daily limit hit), throw a special error
        if (totalWaitSeconds > 60) {
           throw new Error(`DAILY_LIMIT_EXCEEDED:${message}`);
        }
        
        throw new Error(`RATE_LIMIT:${totalWaitSeconds}:${message}`);
      }
      throw new Error(`Rate limit exceeded: ${message}`);
    }
    throw new Error(message);
  }

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
    subject = await sanitizeAiInput(subject, 200);
    productContext = await sanitizeAiInput(productContext, 2000);
    const { workspaceId } = await requireWorkspaceAccess();
    const _check1 = await checkCredits(workspaceId, 'optimizeSubjectLine');
    if (!_check1.allowed) return { success: false, error: `Not enough AI credits. Need 2, have ${_check1.currentBalance}.` };

    const text = await groq(subjectLinePrompt(subject, productContext));

    const parsed = JSON.parse(text) as OptimizeSubjectResult;
    await deductCredits(workspaceId, 'optimizeSubjectLine');
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
    const { workspaceId } = await requireWorkspaceAccess();
    const _check2 = await checkCredits(workspaceId, 'improveEmailCopy');
    if (!_check2.allowed) return { success: false, error: `Not enough AI credits. Need 2, have ${_check2.currentBalance}.` };

    // Strip HTML tags for cleaner analysis
    const plainText = htmlBody.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 2000);

    const text = await groq(copyImproverPrompt(subject, plainText), { maxTokens: 1200 });

    const parsed = JSON.parse(text) as ImproveEmailResult;
    await deductCredits(workspaceId, 'improveEmailCopy');
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
    const { workspaceId } = await requireWorkspaceAccess();
    const _check3 = await checkCredits(workspaceId, 'predictEngagement');
    if (!_check3.allowed) return { success: false, error: `Not enough AI credits. Need 2, have ${_check3.currentBalance}.` };

    const plainText = htmlBody.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 1500);

    const text = await groq(engagementPredictorPrompt(subject, plainText, audienceSize));

    const parsed = JSON.parse(text) as EngagementPrediction;
    await deductCredits(workspaceId, 'predictEngagement');
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
    product = await sanitizeAiInput(product, 200);
    audience = await sanitizeAiInput(audience, 200);
    goal = await sanitizeAiInput(goal, 500);
    const { workspaceId } = await requireWorkspaceAccess();
    const _check4 = await checkCredits(workspaceId, 'buildCampaignSequence');
    if (!_check4.allowed) return { success: false, error: `Not enough AI credits. Need 5, have ${_check4.currentBalance}.` };

    // Fetch workspace to get voice profile
    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
      select: { voiceProfile: true },
    });

    let voiceProfile: VoiceProfile | null = null;
    if (workspace?.voiceProfile) {
      try {
        voiceProfile = JSON.parse(workspace.voiceProfile) as VoiceProfile;
      } catch (e) {
        console.error('Failed to parse voice profile', e);
      }
    }

    const basePrompt = `You are a launch strategist who specializes in email sequences for creators and course sellers.

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
}`;

    const prompt = injectVoiceProfile(basePrompt, voiceProfile);

    const text = await groq(prompt, { maxTokens: 2000 });

    const parsed = JSON.parse(text) as CampaignSequence;
    await deductCredits(workspaceId, 'buildCampaignSequence');
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
    
    const cacheKey = `strategy:${workspaceId}`;
    const cached = getCached<StrategyTip>(cacheKey);
    if (cached) {
      return { success: true, data: cached };
    }

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
}`, { maxTokens: 600 });

    const parsed = JSON.parse(text) as StrategyTip;
    await deductCredits(workspaceId, 'getStrategyAdvice');
    setCached(cacheKey, parsed, 6 * 60 * 60 * 1000);
    return { success: true, data: parsed };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'AI request failed' };
  }
}

// ---------------------------------------------------------------------------
// 6. Generate Full Email Draft
// ---------------------------------------------------------------------------

export interface CampaignBrief {
  product: string;
  audience: string;
  tone: string;
  goal: string;
  keyPoints?: string;
  transformation?: string;
  painPoints?: string;
  objections?: string;
  uniqueMechanism?: string;
  rawContext?: string;
  ctaUrl?: string;
}

export interface EmailDraft {
  subject: string;
  htmlBody: string;
  ctaText: string;
  layout: string;       // e.g. "headline → story → value → cta → closing"
  designNotes: string;  // one sentence: why the CTA is placed where it is
}

// Helper to parse simple markdown (bolding)
function parseMarkdown(text: string) {
  if (!text) return '';
  return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

// Helper to construct HTML from JSON parts
function buildEmailHtml(data: any, ctaUrl: string) {
  const paragraphs = (data.bodyParagraphs || []).map((p: string) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#374151;">${parseMarkdown(p)}</p>`).join('\n');
  const bullets = (data.bulletPoints || []).map((b: string) => `<li style="font-size:15px;line-height:1.8;color:#374151;">${parseMarkdown(b)}</li>`).join('\n');
  const bulletsHtml = bullets ? `<ul style="margin:0 0 14px;padding-left:20px;">\n${bullets}\n    </ul>` : '';

  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:0;background:#ffffff;">
  <div style="padding:24px 32px 8px;">
    <p style="margin:0;font-size:13px;color:#6b7280;">{{senderName}}</p>
  </div>
  <div style="padding:16px 32px 8px;">
    ${data.headline ? `<h1 style="margin:0 0 12px;font-size:26px;font-weight:700;line-height:1.25;color:#111827;">${parseMarkdown(data.headline)}</h1>` : ''}
    <p style="margin:0;font-size:16px;line-height:1.6;color:#374151;">Hi {{firstName | fallback: 'there'}},</p>
    <p style="margin:12px 0 0;font-size:16px;line-height:1.6;color:#374151;">${parseMarkdown(data.hook || '')}</p>
  </div>
  <div style="padding:16px 32px;">
    ${paragraphs}
    ${bulletsHtml}
  </div>
  <div style="padding:8px 32px 24px;text-align:center;">
    <a href="${ctaUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;font-size:16px;font-weight:700;padding:14px 36px;border-radius:8px;text-decoration:none;">${parseMarkdown(data.ctaText || 'Click Here')}</a>
  </div>
  <div style="padding:8px 32px 32px;">
    <p style="margin:0;font-size:15px;line-height:1.65;color:#374151;">Talk soon,</p>
    <p style="margin:12px 0 0;font-size:15px;color:#374151;">— {{senderName}}</p>
    ${data.ps ? `<p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#4b5563;"><strong>P.S.</strong> ${parseMarkdown(data.ps)}</p>` : ''}
  </div>
  <div style="border-top:1px solid #e5e7eb;margin:0 32px;"></div>
  <div style="padding:16px 32px;text-align:center;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">You received this because you're a member of our community.</p>
    <p style="margin:6px 0 0;font-size:12px;"><a href="{{unsubscribe_url}}" style="color:#9ca3af;text-decoration:underline;">Unsubscribe</a></p>
  </div>
</div>`.trim();
}

export async function generateEmailDraft(
  brief: CampaignBrief,
  emailType: string,
  emailPurpose: string,
  suggestedSubject: string,
  keyElements: string[]
): Promise<{ success: true; data: EmailDraft } | { success: false; error: string }> {
  try {
    brief.product = await sanitizeAiInput(brief.product, 200);
    brief.audience = await sanitizeAiInput(brief.audience, 200);
    brief.goal = await sanitizeAiInput(brief.goal, 500);
    brief.tone = await sanitizeAiInput(brief.tone, 200);
    brief.transformation = await sanitizeAiInput(brief.transformation, 500);
    brief.painPoints = await sanitizeAiInput(brief.painPoints, 500);
    brief.objections = await sanitizeAiInput(brief.objections, 500);
    brief.uniqueMechanism = await sanitizeAiInput(brief.uniqueMechanism, 500);
    emailType = await sanitizeAiInput(emailType, 100);
    emailPurpose = await sanitizeAiInput(emailPurpose, 300);
    suggestedSubject = await sanitizeAiInput(suggestedSubject, 200);
    keyElements = await Promise.all(keyElements.map(k => sanitizeAiInput(k, 200)));
    const { workspaceId } = await requireWorkspaceAccess();
    const _check5 = await checkCredits(workspaceId, 'generateEmailDraft');
    if (!_check5.allowed) return { success: false, error: `Not enough AI credits. Need 5, have ${_check5.currentBalance}.` };

    // Fetch workspace to get voice profile
    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
      select: { voiceProfile: true },
    });

    let voiceProfile: VoiceProfile | null = null;
    if (workspace?.voiceProfile) {
      try {
        voiceProfile = JSON.parse(workspace.voiceProfile) as VoiceProfile;
      } catch (e) {
        console.error('Failed to parse voice profile', e);
      }
    }

    const basePrompt = `You are a world-class direct-response copywriter for online creators.

You follow these STRICT COPYWRITING RULES on every email you write:
1. NO FLUFF: Never start with "I hope this email finds you well." Start in media res with a hook, bold statement, or relatable story.
2. SCANNABILITY: Keep paragraphs to 1-3 sentences maximum.
3. EMPHASIS: Use **bolding** for key concepts.
4. CURIOSITY: Subject lines must open a "loop" in the reader's mind.
5. THE P.S.: Always include a P.S. that summarizes the offer, adds urgency/scarcity, or drops a final testimonial/thought.
6. BENEFITS OVER FEATURES: Focus on the transformation.
7. CRITICAL: You are writing the FINAL email. NEVER use placeholders, brackets, or generic text like '[Insert story here]'. If you lack a specific detail, invent a highly realistic, context-appropriate detail. The email must be ready to send the moment it is generated.

STYLE GUIDE (FEW-SHOT EXAMPLES):
Example 1 (Announcement):
"Big news, {{firstName}} 🚀
We've been working on something special...
I'm incredibly excited to announce [Product] — and I wanted you to be among the first to know.
[Description of transformation]
Here's what makes it different:
✅ [Differentiator 1]
✅ [Differentiator 2]
[CTA Button]
More details coming soon,"

Example 2 (Early Bird Discount):
"Subject: ⏰ Early bird ends tonight
Hi {{firstName}},
Just a quick heads up that the early bird pricing for [Product] expires tonight at midnight.
If you've been on the fence, now is the best time to jump in. You'll save [Discount] and get instant access to:
✅ [Benefit 1]
✅ [Benefit 2]
[CTA Button]
Don't miss out on this. The price goes up tomorrow."

Example 3 (Scarcity/PAS):
"If you're like most [Audience], you're probably frustrated by [Pain Point].
It feels like no matter what you do, you can't seem to [Desired Outcome].
The problem isn't you. The problem is that most advice out there ignores [Core Issue].
That's exactly why I created [Product].
Instead of [Old Way], it helps you [New Way] so you can finally [Ultimate Benefit].
[CTA Button]
Imagine waking up next week and finally having [Desired Outcome] handled.
P.S. [Urgency or final thought]"

CAMPAIGN BRIEF (DEEP CONTEXT):
- Product: ${brief.product}
- Audience: ${brief.audience}
- Goal: ${brief.goal}
- Tone: ${brief.tone}
${brief.transformation ? `- Transformation: ${brief.transformation}` : ''}
${brief.painPoints ? `- Pain Points: ${brief.painPoints}` : ''}
${brief.objections ? `- Objections: ${brief.objections}` : ''}
${brief.uniqueMechanism ? `- Unique Mechanism: ${brief.uniqueMechanism}` : ''}
${brief.rawContext ? `- Raw Context: ${brief.rawContext.substring(0, 2000)}` : ''}
- CTA Link: ${brief.ctaUrl || 'https://example.com'}

THIS SPECIFIC EMAIL IN THE SEQUENCE:
- Type: ${emailType}
- Purpose: ${emailPurpose}
- Suggested subject: ${suggestedSubject}
- Key elements to include: ${keyElements.join(', ')}

INSTRUCTIONS:
Cross-reference the "Purpose" of this specific email with the "Deep Context" (like objections or pain points) to write a highly targeted email that fits perfectly into this slot in the timeline.

Respond ONLY with a JSON object (no markdown backticks, no extra text) matching this exact structure:
{
  "subject": "<final subject line — specific, curiosity-driven, max 60 chars>",
  "headline": "<a punchy H1 headline for the top of the email, or empty string if not needed>",
  "hook": "<2-3 sentences opening hook>",
  "bodyParagraphs": [
    "<paragraph 1>",
    "<paragraph 2>"
  ],
  "bulletPoints": [
    "<benefit 1>",
    "<benefit 2>",
    "<benefit 3>"
  ],
  "ctaText": "<action-oriented CTA text used in the button, max 6 words>",
  "ps": "<the P.S. message>",
  "layout": "<describe the layout used e.g. hook → PAS → benefits → cta → PS>",
  "designNotes": "<one sentence explaining the key design decision>"
}`;

    const prompt = injectVoiceProfile(basePrompt, voiceProfile);

    let text = '';
    let parsedJson: any = null;
    let attempts = 0;
    let lastError: any = null;
    let useFallbackModel = false;
    
    while (attempts < 5) {
      try {
        // Use llama-3.1-8b-instant as a fallback if we hit the daily limit on the 70b model
        const modelOptions = useFallbackModel 
          ? { maxTokens: 1500, jsonSchema: true, model: 'llama-3.1-8b-instant' } 
          : { maxTokens: 1500, jsonSchema: true };
          
        text = await groq(prompt, modelOptions);
        // Strip markdown code blocks if the AI included them
        const cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        parsedJson = JSON.parse(cleanText);
        if (parsedJson.subject && parsedJson.bodyParagraphs) break;
        throw new Error("Missing required fields in JSON");
      } catch (e) {
        lastError = e;
        attempts++;
        
        if (e instanceof Error) {
          if (e.message.startsWith('DAILY_LIMIT_EXCEEDED:')) {
            console.log(`[generateEmailDraft] Daily limit exceeded on primary model. Falling back to smaller model...`);
            useFallbackModel = true;
            continue; // Retry immediately with the fallback model
          }
          
          if (e.message.startsWith('RATE_LIMIT:')) {
            const parts = e.message.split(':');
            const waitSeconds = parseFloat(parts[1]);
            console.log(`[generateEmailDraft] Rate limited. Waiting ${waitSeconds}s...`);
            await new Promise(resolve => setTimeout(resolve, (waitSeconds + 1) * 1000));
            continue;
          }
        }

        if (attempts < 5) {
          // Wait 1s, 2s, 4s...
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempts - 1)));
        } else {
          console.error('[generateEmailDraft] Failed after 5 attempts:', lastError, 'Raw text:', text);
          throw lastError;
        }
      }
    }

    const htmlBody = buildEmailHtml(parsedJson, brief.ctaUrl || '{{cta_url}}');

    const parsed: EmailDraft = {
      subject: parsedJson.subject,
      htmlBody,
      ctaText: parsedJson.ctaText,
      layout: parsedJson.layout || '',
      designNotes: parsedJson.designNotes || '',
    };
    await deductCredits(workspaceId, 'generateEmailDraft');
    return { success: true, data: parsed };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'AI request failed' };
  }
}
