/**
 * app/dashboard/templates/[id]/page.tsx
 * Preview a system template with live variable substitution.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeftIcon } from 'lucide-react';
import { notFound } from 'next/navigation';
import { requireWorkspaceAccess } from '@/lib/auth/session';
import { getTemplateById, CATEGORY_LABELS, estimateReadingTime } from '@/lib/templates/library';
import { parseVariables, PREVIEW_VARIABLES, extractVariables } from '@/lib/templates/variable-parser';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const t = getTemplateById(params.id);
  return { title: t ? `Preview: ${t.name}` : 'Template' };
}

export default async function TemplatePreviewPage({ params }: { params: { id: string } }) {
  const { workspaceRole } = await requireWorkspaceAccess();
  const template = getTemplateById(params.id);
  if (!template) notFound();

  const isAdmin = workspaceRole === 'OWNER' || workspaceRole === 'ADMIN';
  const previewHtml = parseVariables(template.htmlBody, PREVIEW_VARIABLES);
  const previewSubject = parseVariables(template.subject, PREVIEW_VARIABLES);
  const variables = extractVariables(template.htmlBody + ' ' + template.subject);
  const readingTime = Math.ceil(estimateReadingTime(template.htmlBody) / 60);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard/templates" className="flex items-center gap-1 hover:text-foreground">
          <ChevronLeftIcon className="h-4 w-4" />
          Templates
        </Link>
        <span>/</span>
        <span className="text-foreground">{template.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {CATEGORY_LABELS[template.category]}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">{template.name}</h1>
          <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span>~{readingTime} min read</span>
            <span>{variables.length} variables</span>
            <span>System template</span>
          </div>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Link
              href={`/dashboard/campaigns/new?templateId=${template.id}`}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Use template
            </Link>
          </div>
        )}
      </div>

      {/* Subject preview */}
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Subject line</p>
        <p className="text-sm font-medium text-foreground">{previewSubject}</p>
        {template.previewText && (
          <>
            <p className="mt-2 mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Preview text</p>
            <p className="text-sm text-muted-foreground">{parseVariables(template.previewText, PREVIEW_VARIABLES)}</p>
          </>
        )}
      </div>

      {/* Variables used */}
      {variables.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Variables used</p>
          <div className="flex flex-wrap gap-2">
            {variables.map((v) => (
              <span key={v} className="rounded-full bg-muted px-2 py-0.5 font-mono text-xs text-foreground">
                {`{{${v}}}`}
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            These are filled automatically from your contact data. You can edit any manually after selecting the template.
          </p>
        </div>
      )}

      {/* Email body preview */}
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="border-b border-border bg-muted/50 px-4 py-2">
          <p className="text-xs font-medium text-muted-foreground">Email preview (with sample data)</p>
        </div>
        <div className="bg-white p-6">
          <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
        </div>
      </div>

      {isAdmin && (
        <div className="flex gap-3 pb-8">
          <Link
            href={`/dashboard/campaigns/new?templateId=${template.id}`}
            className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Use this template →
          </Link>
          <Link
            href="/dashboard/templates"
            className="rounded-md border border-border px-6 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
          >
            Back to library
          </Link>
        </div>
      )}
    </div>
  );
}
