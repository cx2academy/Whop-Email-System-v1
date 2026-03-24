/**
 * app/dashboard/templates/page.tsx
 * Templates — visual gallery with category filter bar and preview modal.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { requireWorkspaceAccess } from '@/lib/auth/session';
import { getUserTemplates } from '@/lib/templates/actions';
import { SYSTEM_TEMPLATES } from '@/lib/templates/library';
import { TemplateGallery } from './template-gallery';
import { SparklesIcon, PlusIcon, LayoutTemplateIcon } from 'lucide-react';

export const metadata: Metadata = { title: 'Templates' };

export default async function TemplatesPage() {
  const { workspaceRole } = await requireWorkspaceAccess();
  const isAdmin       = workspaceRole === 'OWNER' || workspaceRole === 'ADMIN';
  const userTemplates = await getUserTemplates();
  const total         = SYSTEM_TEMPLATES.length;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', letterSpacing: '-0.03em' }}
          >
            Templates
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {total} ready-to-use templates — click any card to preview
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/templates/generate"
            className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors"
            style={{ border: '1px solid var(--sidebar-border)', color: 'var(--text-secondary)', background: 'none' }}
          >
            <SparklesIcon className="h-3.5 w-3.5" style={{ color: 'var(--brand)' }} />
            AI generate
          </Link>
          {isAdmin && (
            <Link
              href="/dashboard/templates/new"
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'var(--brand)', boxShadow: '0 2px 8px rgba(34,197,94,0.22)' }}
            >
              <PlusIcon className="h-4 w-4" />
              New template
            </Link>
          )}
        </div>
      </div>

      {/* Empty state — should never happen in practice */}
      {SYSTEM_TEMPLATES.length === 0 ? (
        <div
          className="rounded-xl p-12 text-center"
          style={{ border: '1.5px dashed var(--sidebar-border)', background: 'var(--surface-card)' }}
        >
          <div
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl mb-5"
            style={{ background: '#F5F3FF' }}
          >
            <LayoutTemplateIcon className="h-6 w-6" style={{ color: '#7C3AED' }} />
          </div>
          <p className="text-base font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>
            No templates yet
          </p>
          <div className="flex justify-center gap-3 mt-6">
            <Link
              href="/dashboard/templates/generate"
              className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white"
              style={{ background: 'var(--brand)' }}
            >
              <SparklesIcon className="h-4 w-4" />
              Generate with AI
            </Link>
            {isAdmin && (
              <Link
                href="/dashboard/templates/new"
                className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium"
                style={{ border: '1px solid var(--sidebar-border)', color: 'var(--text-primary)' }}
              >
                Start from scratch
              </Link>
            )}
          </div>
        </div>
      ) : (
        <TemplateGallery
          systemTemplates={SYSTEM_TEMPLATES}
          userTemplates={userTemplates}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}
