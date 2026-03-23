/**
 * app/dashboard/campaigns/new/page.tsx
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
  searchParams: {
    templateId?: string;
    userTemplateId?: string;
    generatedSubject?: string;
    generatedHtml?: string;
  };
}

export default async function NewCampaignPage({ searchParams }: Props) {
  const { workspaceId } = await requireAdminAccess();
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
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

  if (searchParams.templateId) {
    const tpl = getTemplateById(searchParams.templateId);
    if (tpl) templateInitial = { subject: tpl.subject, htmlBody: tpl.htmlBody, previewText: tpl.previewText, templateId: tpl.id };
  } else if (searchParams.userTemplateId) {
    const tpl = await db.emailTemplate.findFirst({ where: { id: searchParams.userTemplateId, workspaceId } });
    if (tpl) templateInitial = { subject: tpl.subject, htmlBody: tpl.htmlBody, previewText: tpl.previewText ?? undefined, userTemplateId: tpl.id };
  } else if (searchParams.generatedSubject) {
    templateInitial = {
      subject: decodeURIComponent(searchParams.generatedSubject),
      htmlBody: searchParams.generatedHtml ? decodeURIComponent(searchParams.generatedHtml) : undefined,
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
      startStep={searchParams.generatedSubject && !searchParams.generatedHtml ? 2 : 1}
    />
  );
}
