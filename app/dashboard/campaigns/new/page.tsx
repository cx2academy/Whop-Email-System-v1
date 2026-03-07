/**
 * app/dashboard/campaigns/new/page.tsx
 * New campaign builder — supports template pre-fill via URL params.
 *
 * URL params:
 *   ?templateId=<system-template-id>      — pre-fill from system template
 *   ?userTemplateId=<db-template-id>      — pre-fill from user template
 *   ?generatedSubject=...&generatedHtml=  — pre-fill from AI generator
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeftIcon } from 'lucide-react';
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
  const [tags, segments] = await Promise.all([
    getTags(),
    getSegmentsForCampaign(),
  ]);

  // Resolve template pre-fill
  let templateInitial: {
    subject?: string;
    htmlBody?: string;
    previewText?: string;
    templateId?: string;
    userTemplateId?: string;
  } | undefined;

  if (searchParams.templateId) {
    const tpl = getTemplateById(searchParams.templateId);
    if (tpl) {
      templateInitial = {
        subject: tpl.subject,
        htmlBody: tpl.htmlBody,
        previewText: tpl.previewText,
        templateId: tpl.id,
      };
    }
  } else if (searchParams.userTemplateId) {
    const tpl = await db.emailTemplate.findFirst({
      where: { id: searchParams.userTemplateId, workspaceId },
    });
    if (tpl) {
      templateInitial = {
        subject: tpl.subject,
        htmlBody: tpl.htmlBody,
        previewText: tpl.previewText ?? undefined,
        userTemplateId: tpl.id,
      };
    }
  } else if (searchParams.generatedSubject && searchParams.generatedHtml) {
    templateInitial = {
      subject: decodeURIComponent(searchParams.generatedSubject),
      htmlBody: decodeURIComponent(searchParams.generatedHtml),
    };
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard/campaigns" className="flex items-center gap-1 hover:text-foreground">
          <ChevronLeftIcon className="h-4 w-4" />
          Campaigns
        </Link>
        <span>/</span>
        <span className="text-foreground">New campaign</span>
        {templateInitial && (
          <>
            <span>·</span>
            <span className="text-primary text-xs font-medium">from template</span>
          </>
        )}
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Create campaign</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {templateInitial
            ? 'Template pre-filled — customize and send'
            : 'Build and send an email campaign to your community'}
        </p>
      </div>

      <CampaignBuilder tags={tags} segments={segments} templateInitial={templateInitial} />
    </div>
  );
}
