/**
 * app/dashboard/campaigns/new/page.tsx
 *
 * Fixed for Next.js 15+: searchParams must be awaited (it's a Promise).
 * Without this, templateId is always undefined and templates never pre-fill.
 */
import type { Metadata } from 'next';
import { requireAdminAccess } from '@/lib/auth/session';
import { getTags } from '@/lib/sync/actions';
import { getSegmentsForCampaign } from '@/lib/segmentation/actions';
import { CampaignBuilder } from '../campaign-builder';
import { getTemplateById } from '@/lib/templates/library';
import { db } from '@/lib/db/client';

export const metadata: Metadata = { title: 'New Campaign' };

interface Props {
  searchParams: Promise<{
    templateId?: string;
    userTemplateId?: string;
    generatedSubject?: string;
    generatedHtml?: string;
  }>;
}

export default async function NewCampaignPage({ searchParams }: Props) {
  // ✅ Must await in Next.js 15+ — searchParams is a Promise
  const params = await searchParams;

  const { workspaceId } = await requireAdminAccess();
  const workspace = await db.workspace.findUnique({
    where:  { id: workspaceId },
    select: { fromName: true, fromEmail: true },
  });

  const [tags, segments, audienceSize] = await Promise.all([
    getTags(),
    getSegmentsForCampaign(),
    db.contact.count({ where: { workspaceId, status: 'SUBSCRIBED' } }),
  ]);

  let templateInitial: {
    subject?: string; htmlBody?: string; previewText?: string;
    templateId?: string; userTemplateId?: string;
  } | undefined;

  if (params.templateId) {
    const tpl = getTemplateById(params.templateId);
    if (tpl) {
      templateInitial = {
        subject:    tpl.subject,
        htmlBody:   tpl.htmlBody,
        previewText: tpl.previewText,
        templateId: tpl.id,
      };
    }
  } else if (params.userTemplateId) {
    const tpl = await db.emailTemplate.findFirst({
      where: { id: params.userTemplateId, workspaceId },
    });
    if (tpl) {
      templateInitial = {
        subject:      tpl.subject,
        htmlBody:     tpl.htmlBody,
        previewText:  tpl.previewText ?? undefined,
        userTemplateId: tpl.id,
      };
    }
  } else if (params.generatedSubject) {
    templateInitial = {
      subject:  decodeURIComponent(params.generatedSubject),
      htmlBody: params.generatedHtml
        ? decodeURIComponent(params.generatedHtml)
        : undefined,
    };
  }

  return (
    <CampaignBuilder
      tags={tags}
      segments={segments}
      templateInitial={templateInitial}
      fromName={workspace?.fromName ?? undefined}
      fromEmail={workspace?.fromEmail ?? undefined}
      audienceSize={audienceSize}
      startStep={params.generatedSubject && !params.generatedHtml ? 2 : 1}
    />
  );
}
