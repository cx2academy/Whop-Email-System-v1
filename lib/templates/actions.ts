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
  await requireAdminAccess();

  const prompt = `You are an expert email copywriter for online creators and course sellers.

Generate a high-converting email template based on these inputs:
- Campaign goal: ${opts.goal}
- Product type: ${opts.productType}
- Tone of voice: ${opts.tone}
- Target audience: ${opts.audience}

Respond ONLY with a JSON object in this exact format (no markdown, no preamble):
{
  "subject": "the subject line",
  "previewText": "preview text under 90 chars",
  "htmlBody": "complete HTML email body using inline styles, max-width 600px, with {{first_name}}, {{product_name}}, {{cta_url}}, {{sender_name}}, {{unsubscribe_url}} variables where appropriate"
}`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await res.json();
    const text = data.content?.[0]?.text ?? '';
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean) as { subject: string; previewText: string; htmlBody: string };

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
    return { success: false as const, error: 'AI generation failed — try again' };
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
