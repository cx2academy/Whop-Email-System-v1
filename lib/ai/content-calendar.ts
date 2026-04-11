import { groq, generateEmailDraft, type CampaignBrief } from '@/lib/ai/actions';
import { checkCredits, deductCredits } from '@/lib/ai/credits';
import { db } from '@/lib/db/client';
import { checkUsageLimit } from '@/lib/plans/gates';
import { buildFallbackHtml } from '@/lib/ai/sequence-materializer';

export interface CalendarInput {
  product: string;
  audience: string;
  goal: string;              // e.g. "launch a new course", "grow community membership"
  keyDates: string;          // e.g. "Course launches April 15, early bird ends April 10"
  emailFrequency: 'daily' | '3x_week' | '2x_week' | 'weekly';
  startDate: Date;           // first email date
  transformation?: string;   // Point A to Point B
  painPoints?: string;
  objections?: string;
  uniqueMechanism?: string;
  tone?: string;
  rawContext?: string;
  ctaUrl?: string;
}

export interface CalendarEntry {
  day: number;               // day offset from startDate (0 = startDate, 7 = one week later)
  date: Date;                // actual Date
  type: string;              // e.g. "Teaser", "Value content", "Launch announcement", "Urgency close"
  subject: string;           // suggested subject line
  purpose: string;           // one sentence — what this email needs to accomplish
  keyPoints: string[];       // 3 bullet points of what to include
  phase: string;             // e.g. "Pre-launch awareness", "Launch week", "Post-launch nurture"
  sendTime: string;          // suggested send time e.g. "9:00 AM"
}

export interface ContentCalendar {
  calendarName: string;
  strategy: string;          // 2-3 sentence overview
  totalEmails: number;
  phases: string[];          // phase names in order
  entries: CalendarEntry[];
}

export async function generateContentCalendar(
  input: CalendarInput,
  workspaceId: string
): Promise<{ success: true; data: ContentCalendar } | { success: false; error: string }> {
  try {
    // Sanitize inputs to prevent prompt injection
    const sanitize = (str: string | undefined, max: number) => str ? str.trim().slice(0, max) : '';
    input.product = sanitize(input.product, 200);
    input.audience = sanitize(input.audience, 200);
    input.goal = sanitize(input.goal, 500);
    input.keyDates = sanitize(input.keyDates, 500);
    input.transformation = sanitize(input.transformation, 500);
    input.painPoints = sanitize(input.painPoints, 500);
    input.objections = sanitize(input.objections, 500);
    input.uniqueMechanism = sanitize(input.uniqueMechanism, 500);
    input.tone = sanitize(input.tone, 200);

    const creditCheck = await checkCredits(workspaceId, 'generateContentCalendar');
    if (!creditCheck.allowed) {
      return { success: false, error: `Not enough AI credits. Need 10, have ${creditCheck.currentBalance}.` };
    }

    const prompt = `ROLE: "You are a launch strategist and email marketing calendar planner for online creators. You build complete 30-day email sequences that move subscribers from awareness to purchase using proven content marketing phases: Pre-launch → Launch → Close → Post-launch."

INPUT CONTEXT:
Product/Offer: ${input.product}
Target Audience: ${input.audience}
Goal: ${input.goal}
Key Dates: ${input.keyDates}
Email Frequency: ${input.emailFrequency}
Start Date: ${input.startDate.toISOString()}
${input.transformation ? `Transformation: ${input.transformation}` : ''}
${input.painPoints ? `Pain Points: ${input.painPoints}` : ''}
${input.objections ? `Objections: ${input.objections}` : ''}
${input.uniqueMechanism ? `Unique Mechanism/Hook: ${input.uniqueMechanism}` : ''}
${input.tone ? `Tone: ${input.tone}` : ''}
${input.rawContext ? `Raw Context: ${input.rawContext.substring(0, 3000)}` : ''}

RULES:
  - Create EXACTLY the right number of emails for the frequency over 30 days:
    daily = ~30 emails, 3x_week = ~13, 2x_week = ~9, weekly = ~5
  - Organize emails into 3-4 phases with clear phase transitions
  - Pre-launch phase: build anticipation, deliver value, establish expertise
  - Launch phase (if goal includes a launch): announce, social proof, urgency
  - Close phase: last chance, address objections, strong CTA
  - Post-launch/nurture: deliver on promise, upsell, case studies
  - Email types should vary: value content, personal story, social proof, announcement, Q&A, case study
  - Subject lines must be specific and compelling — never generic like "Update from us"
  - If keyDates is provided, schedule launch-adjacent emails close to those dates
  - sendTime: suggest 9:00 AM for authority/announcement emails, 12:00 PM for value content, 3:00 PM for urgency
  - Use the deep context (Pain points, objections, transformation) to map out specific email purposes. For example, dedicate an email to dismantling a specific objection.

OUTPUT JSON:
{
  "calendarName": "<descriptive name>",
  "strategy": "<2-3 sentence overview>",
  "totalEmails": <number>,
  "phases": ["<phase 1 name>", "<phase 2 name>"],
  "entries": [
    {
      "day": <0-30>,
      "type": "<email type>",
      "subject": "<subject line>",
      "purpose": "<one sentence>",
      "keyPoints": ["<point 1>", "<point 2>", "<point 3>"],
      "phase": "<which phase this belongs to>",
      "sendTime": "<HH:MM AM/PM>"
    }
  ]
}`;

    const text = await groq(prompt, { jsonSchema: true, maxTokens: 4000 });
    const parsed = JSON.parse(text) as ContentCalendar;

    // Calculate actual dates
    const baseDate = new Date(input.startDate);
    parsed.entries = parsed.entries.map(entry => {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + entry.day);
      return { ...entry, date: d };
    });

    await deductCredits(workspaceId, 'generateContentCalendar');
    return { success: true, data: parsed };
  } catch (err) {
    console.error('generateContentCalendar error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to generate calendar' };
  }
}

export async function materializeCalendar(
  calendar: ContentCalendar,
  input: CalendarInput,
  workspaceId: string,
  generateDrafts: boolean
): Promise<{ success: true; data: { campaigns: Array<{ id: string; name: string; scheduledAt: Date }> }; creditsUsed: number } | { success: false; error: string }> {
  try {
    const campaignGate = await checkUsageLimit({ workspaceId, type: 'campaigns' });
    if (!campaignGate.allowed) {
      return { success: false, error: 'Campaign limit reached for your current plan. Upgrade to create more campaigns.' };
    }

    let creditsNeeded = 0;
    if (generateDrafts) {
      creditsNeeded = calendar.entries.length * 5;
      const creditCheck = await checkCredits(workspaceId, 'generateEmailDraft');
      if (!creditCheck.allowed || creditCheck.currentBalance < creditsNeeded) {
        return { success: false, error: `Not enough AI credits to generate all drafts. Need ${creditsNeeded}, have ${creditCheck.currentBalance}.` };
      }
    }

    const brief: CampaignBrief = {
      product: input.product,
      audience: input.audience,
      goal: input.goal,
      tone: input.tone || 'Professional and engaging',
      keyPoints: input.keyDates,
      transformation: input.transformation,
      painPoints: input.painPoints,
      objections: input.objections,
      uniqueMechanism: input.uniqueMechanism,
      rawContext: input.rawContext,
      ctaUrl: input.ctaUrl,
    };

    let creditsUsed = 0;
    const baseDate = new Date(input.startDate);
    const sequenceId = crypto.randomUUID();

    const emailTasks = calendar.entries.map(entry => {
      const scheduledAt = new Date(baseDate);
      scheduledAt.setDate(scheduledAt.getDate() + entry.day);
      
      // Parse sendTime (e.g. "9:00 AM")
      const timeMatch = entry.sendTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1], 10);
        const minutes = parseInt(timeMatch[2], 10);
        const ampm = timeMatch[3].toUpperCase();
        if (ampm === 'PM' && hours < 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
        scheduledAt.setHours(hours, minutes, 0, 0);
      } else {
        scheduledAt.setHours(9, 0, 0, 0);
      }

      return {
        entry,
        scheduledAt,
        campaignName: `${calendar.calendarName} — Day ${entry.day}: ${entry.type}`,
      };
    });

    let settledDrafts: PromiseSettledResult<{ success: true; data: { subject: string; htmlBody: string } } | { success: false; error: string }>[] = [];
    
    if (generateDrafts) {
      // Process sequentially to avoid hitting Groq rate limits (12000 TPM)
      const results: PromiseSettledResult<{ success: true; data: { subject: string; htmlBody: string } } | { success: false; error: string }>[] = [];
      
      for (let i = 0; i < emailTasks.length; i++) {
        const task = emailTasks[i];
        try {
          const result = await generateEmailDraft(
            brief,
            task.entry.type,
            task.entry.purpose,
            task.entry.subject,
            task.entry.keyPoints
          );
          results.push({ status: 'fulfilled', value: result });
        } catch (error) {
          results.push({ status: 'rejected', reason: error });
        }
      }
      settledDrafts = results;
    }

    const campaignDataToCreate = await Promise.all(emailTasks.map(async (task, index) => {
      let subject = task.entry.subject;
      let htmlBody = await buildFallbackHtml(task.entry.subject, task.entry.purpose, task.entry.keyPoints);

      if (generateDrafts) {
        const result = settledDrafts[index];
        if (result.status === 'fulfilled' && result.value.success) {
          subject = result.value.data.subject;
          htmlBody = result.value.data.htmlBody;
          creditsUsed += 5;
        } else {
          const errorMsg = result.status === 'fulfilled' ? result.value.error : result.reason;
          console.error(`[materializeCalendar] Failed to generate draft for email ${index}:`, errorMsg);
          htmlBody = `
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:40px auto;padding:32px;background:#fef2f2;border:1px solid #f87171;border-radius:12px;text-align:center;">
              <h2 style="color:#b91c1c;margin:0 0 16px;font-size:24px;">⚠️ AI Generation Failed</h2>
              <p style="color:#991b1b;margin:0 0 16px;font-size:16px;line-height:1.5;">We couldn't generate the draft for this email due to an AI timeout or error.</p>
              <p style="color:#991b1b;margin:0;font-size:16px;line-height:1.5;"><strong>Please delete this campaign and recreate it, or write the copy manually.</strong></p>
            </div>
          `;
        }
      }

      return {
        workspaceId,
        name: task.campaignName,
        subject,
        htmlBody,
        status: 'DRAFT' as const,
        type: 'BROADCAST' as const,
        scheduledAt: task.scheduledAt,
        sequenceId,
        previewText: `Day ${task.entry.day} — ${task.entry.type}`,
      };
    }));

    const createdCampaignsRaw = await db.$transaction(
      campaignDataToCreate.map(data => db.emailCampaign.create({
        data,
        select: { id: true, name: true, scheduledAt: true },
      }))
    );

    return {
      success: true,
      data: { campaigns: createdCampaignsRaw.map(c => ({ ...c, scheduledAt: c.scheduledAt as Date })) },
      creditsUsed,
    };
  } catch (err) {
    console.error('materializeCalendar error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to materialize calendar' };
  }
}
