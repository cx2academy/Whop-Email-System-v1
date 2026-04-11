'use server';

/**
 * lib/templates/actions.ts
 *
 * Server actions for the template system.
 *
 * Covers:
 *   - User template CRUD
 *   - Create campaign from template (system or user)
 *   - Save campaign as template
 *   - AI template generation
 *   - Template analytics sync
 */

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { requireAdminAccess, requireWorkspaceAccess } from '@/lib/auth/session';
import { getTemplateById, estimateReadingTime } from './library';
import { checkCredits, deductCredits } from '@/lib/ai/credits';

// ---------------------------------------------------------------------------
// User template CRUD
// ---------------------------------------------------------------------------

export async function getUserTemplates() {
  const { workspaceId } = await requireWorkspaceAccess();
  return db.emailTemplate.findMany({
    where: { workspaceId, isSystemTemplate: false },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function createUserTemplate(data: {
  name: string;
  category: string;
  subject: string;
  htmlBody: string;
  previewText?: string;
}) {
  const { workspaceId } = await requireAdminAccess();

  if (!data.name.trim()) return { success: false as const, error: 'Name is required' };
  if (!data.subject.trim()) return { success: false as const, error: 'Subject is required' };
  if (!data.htmlBody.trim()) return { success: false as const, error: 'Body is required' };

  const template = await db.emailTemplate.create({
    data: {
      workspaceId,
      name: data.name,
      category: data.category || 'custom',
      subject: data.subject,
      htmlBody: data.htmlBody,
      previewText: data.previewText,
      isSystemTemplate: false,
    },
  });

  revalidatePath('/dashboard/templates');
  return { success: true as const, data: { templateId: template.id } };
}

export async function updateUserTemplate(
  templateId: string,
  data: { name?: string; subject?: string; htmlBody?: string; previewText?: string }
) {
  const { workspaceId } = await requireAdminAccess();
  await db.emailTemplate.updateMany({
    where: { id: templateId, workspaceId, isSystemTemplate: false },
    data,
  });
  revalidatePath('/dashboard/templates');
  return { success: true as const };
}

export async function deleteUserTemplate(templateId: string) {
  const { workspaceId } = await requireAdminAccess();
  await db.emailTemplate.deleteMany({
    where: { id: templateId, workspaceId, isSystemTemplate: false },
  });
  revalidatePath('/dashboard/templates');
  return { success: true as const };
}

// ---------------------------------------------------------------------------
// Save campaign as template
// ---------------------------------------------------------------------------

export async function saveCampaignAsTemplate(campaignId: string, templateName: string) {
  const { workspaceId } = await requireAdminAccess();

  const campaign = await db.emailCampaign.findFirst({
    where: { id: campaignId, workspaceId },
  });
  if (!campaign) return { success: false as const, error: 'Campaign not found' };

  const template = await db.emailTemplate.create({
    data: {
      workspaceId,
      name: templateName || `${campaign.name} (template)`,
      category: 'custom',
      subject: campaign.subject,
      htmlBody: campaign.htmlBody,
      previewText: campaign.previewText ?? undefined,
      isSystemTemplate: false,
    },
  });

  revalidatePath('/dashboard/templates');
  return { success: true as const, data: { templateId: template.id } };
}

// ---------------------------------------------------------------------------
// Clone system template → user template
// ---------------------------------------------------------------------------

export async function cloneSystemTemplate(systemTemplateId: string, newName?: string) {
  const { workspaceId } = await requireAdminAccess();

  const tpl = getTemplateById(systemTemplateId);
  if (!tpl) return { success: false as const, error: 'Template not found' };

  const template = await db.emailTemplate.create({
    data: {
      workspaceId,
      name: newName ?? `${tpl.name} (copy)`,
      category: tpl.category,
      subject: tpl.subject,
      htmlBody: tpl.htmlBody,
      previewText: tpl.previewText,
      isSystemTemplate: false,
    },
  });

  revalidatePath('/dashboard/templates');
  return { success: true as const, data: { templateId: template.id } };
}

// ---------------------------------------------------------------------------
// Analytics sync — called after a campaign completes
// ---------------------------------------------------------------------------

export async function syncTemplateAnalytics(campaignId: string) {
  const { workspaceId } = await requireWorkspaceAccess();

  const campaign = await db.emailCampaign.findFirst({
    where: { id: campaignId, workspaceId, status: 'COMPLETED' },
  });

  if (!campaign?.templateId) return;

  const openRate = campaign.totalSent > 0
    ? (campaign.totalOpened / campaign.totalSent) * 100
    : 0;
  const clickRate = campaign.totalOpened > 0
    ? (campaign.totalClicked / campaign.totalOpened) * 100
    : 0;

  // Weighted average update
  const template = await db.emailTemplate.findUnique({ where: { id: campaign.templateId } });
  if (!template) return;

  const count = template.usageCount + 1;
  const newOpenRate  = ((template.avgOpenRate  * template.usageCount) + openRate)  / count;
  const newClickRate = ((template.avgClickRate * template.usageCount) + clickRate) / count;

  await db.emailTemplate.update({
    where: { id: campaign.templateId },
    data: { usageCount: count, avgOpenRate: newOpenRate, avgClickRate: newClickRate },
  });
}

// ---------------------------------------------------------------------------
// AI template generation
// ---------------------------------------------------------------------------

export async function generateTemplate(opts: {
  goal: string;
  productType: string;
  tone: string;
  audience: string;
}) {
  const { workspaceId } = await requireAdminAccess();

  const _creditCheck = await checkCredits(workspaceId, 'generateTemplate');
  if (!_creditCheck.allowed) {
    return { success: false as const, error: `Not enough AI credits. Need 5, have ${_creditCheck.currentBalance}.` };
  }

  const EMAIL_SCAFFOLD = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:0;background:#ffffff;">
  <div style="padding:24px 32px 8px;"><p style="margin:0;font-size:13px;color:#6b7280;">{{sender_name}}</p></div>
  <div style="padding:16px 32px 8px;">
    <h1 style="margin:0 0 12px;font-size:26px;font-weight:700;line-height:1.25;color:#111827;">[HEADLINE]</h1>
    <p style="margin:0;font-size:16px;line-height:1.6;color:#374151;">Hi {{first_name}},</p>
    <p style="margin:12px 0 0;font-size:16px;line-height:1.6;color:#374151;">[OPENING HOOK]</p>
  </div>
  <div style="padding:16px 32px;">
    <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#374151;">[BODY PARAGRAPH 1]</p>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#374151;">[BODY PARAGRAPH 2]</p>
    <ul style="margin:0 0 14px;padding-left:20px;"><li style="font-size:15px;line-height:1.8;color:#374151;">[BENEFIT 1]</li><li style="font-size:15px;line-height:1.8;color:#374151;">[BENEFIT 2]</li></ul>
  </div>
  <div style="padding:8px 32px 24px;text-align:center;">
    <a href="{{cta_url}}" style="display:inline-block;background:#2563eb;color:#ffffff;font-size:16px;font-weight:700;padding:14px 36px;border-radius:8px;text-decoration:none;">[CTA]</a>
  </div>
  <div style="padding:8px 32px 32px;">
    <p style="margin:0;font-size:15px;color:#374151;">[CLOSING]</p>
    <p style="margin:12px 0 0;font-size:15px;color:#374151;">— {{sender_name}}</p>
  </div>
  <div style="border-top:1px solid #e5e7eb;margin:0 32px;"></div>
  <div style="padding:16px 32px;text-align:center;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">You received this because you are a member.</p>
    <p style="margin:6px 0 0;font-size:12px;"><a href="{{unsubscribe_url}}" style="color:#9ca3af;">Unsubscribe</a></p>
  </div>
</div>`;

  const prompt = `You are a conversion-focused email copywriter for online creators and course sellers.

Proven design rules you ALWAYS follow:
- Short paragraphs (2-3 sentences max), clear hierarchy, no clutter
- Layout: headline → opening hook → value/benefits → CTA button → closing
- CTA uses action verbs: "Start Closing Deals", "Join the Community", "Get the Guide"
- Benefits-first: what the reader gains, not product features
- Personalization with {{first_name}} in the opening

Inputs:
- Goal: ${opts.goal}
- Product: ${opts.productType}
- Tone: ${opts.tone}
- Audience: ${opts.audience}

Fill in this exact HTML scaffold — replace every [PLACEHOLDER] with real copy, keep all inline styles unchanged:

${EMAIL_SCAFFOLD}

Respond ONLY with JSON (no markdown):
{
  "subject": "<specific curiosity-driven subject under 60 chars>",
  "previewText": "<preview text under 90 chars>",
  "htmlBody": "<the complete filled-in HTML>"
}`;

  try {
    if (!process.env.GROQ_API_KEY) {
      return { success: false as const, error: 'GROQ_API_KEY is not set in environment variables' };
    }

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ?? '';
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean) as { subject: string; previewText: string; htmlBody: string };

    await deductCredits(workspaceId, 'generateTemplate');
    return {
      success: true as const,
      data: {
        subject:     parsed.subject,
        previewText: parsed.previewText,
        htmlBody:    parsed.htmlBody,
        readingTime: estimateReadingTime(parsed.htmlBody),
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[generateTemplate]', message);
    return { success: false as const, error: `AI generation failed: ${message}` };
  }
}

// ---------------------------------------------------------------------------
// Dashboard data
// ---------------------------------------------------------------------------

export async function getTemplateStats() {
  const { workspaceId } = await requireWorkspaceAccess();

  const userTemplates = await db.emailTemplate.findMany({
    where: { workspaceId, isSystemTemplate: false },
    orderBy: [{ usageCount: 'desc' }],
    take: 5,
  });

  return { userTemplates };
}

// ---------------------------------------------------------------------------
// Instantiate Template Sequence
// ---------------------------------------------------------------------------

export async function instantiateTemplateSequence(sequenceId: string) {
  const { workspaceId } = await requireAdminAccess();
  
  // Dynamic import to avoid circular dependencies if any
  const { SYSTEM_SEQUENCES } = await import('./sequences');
  const { getTemplateById } = await import('./library');

  const sequence = SYSTEM_SEQUENCES.find((s) => s.id === sequenceId);
  if (!sequence) {
    return { success: false as const, error: 'Sequence not found' };
  }

  // Base scheduling date (tomorrow 9am)
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + 1);
  baseDate.setHours(9, 0, 0, 0);

  const sequenceIdInstance = crypto.randomUUID();

  const campaignDataToCreate = sequence.steps.map((step, index) => {
    const tpl = getTemplateById(step.templateId);
    if (!tpl) throw new Error(`Template ${step.templateId} not found`);

    const scheduledAt = new Date(baseDate);
    scheduledAt.setDate(scheduledAt.getDate() + step.delayDays);

    return {
      workspaceId,
      name: `${sequence.name} — Email ${index + 1}: ${tpl.name}`,
      subject: tpl.subject,
      htmlBody: tpl.htmlBody,
      previewText: tpl.previewText,
      status: 'DRAFT' as const,
      type: 'BROADCAST' as const,
      scheduledAt,
      sequenceId: sequenceIdInstance,
    };
  });

  await db.$transaction(
    campaignDataToCreate.map(data => db.emailCampaign.create({ data }))
  );

  revalidatePath('/dashboard/campaigns');
  return { success: true as const };
}
