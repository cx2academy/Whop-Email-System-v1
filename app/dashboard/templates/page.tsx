/**
 * app/dashboard/templates/page.tsx
 * Templates — light theme, strong empty state, clean grid
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { requireWorkspaceAccess } from '@/lib/auth/session';
import { getUserTemplates } from '@/lib/templates/actions';
import { SYSTEM_TEMPLATES, CATEGORY_LABELS, getAllCategories } from '@/lib/templates/library';
import { TemplateCard } from './template-card';
import { UserTemplateCard } from './user-template-card';
import { LayoutTemplateIcon, SparklesIcon, PlusIcon } from 'lucide-react';

export const metadata: Metadata = { title: 'Templates' };

export default async function TemplatesPage() {
  const { workspaceRole } = await requireWorkspaceAccess();
  const isAdmin = workspaceRole === 'OWNER' || workspaceRole === 'ADMIN';
  const userTemplates = await getUserTemplates();
  const categories = getAllCategories();
  const totalSystemTemplates = SYSTEM_TEMPLATES.length;

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            Templates
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {totalSystemTemplates} ready-to-use templates
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/templates/generate"
            className="flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-secondary)' }}
          >
            <SparklesIcon className="h-3.5 w-3.5" style={{ color: 'var(--brand)' }} />
            AI generate
          </Link>
          {isAdmin && (
            <Link
              href="/dashboard/templates/new"
              className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'var(--brand)', boxShadow: '0 2px 8px rgba(34,197,94,0.22)' }}
            >
              <PlusIcon className="h-4 w-4" />
              New template
            </Link>
          )}
        </div>
      </div>

      {/* Your templates */}
      {userTemplates.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-tertiary)' }}>
            Your templates
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {userTemplates.map((t) => (
              <UserTemplateCard key={t.id} template={t} isAdmin={isAdmin} />
            ))}
          </div>
        </section>
      )}

      {/* System templates by category */}
      {categories.length === 0 ? (
        /* Empty state if no system templates */
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
          <p className="text-base font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>No templates yet</p>
          <p className="text-sm max-w-xs mx-auto mb-6" style={{ color: 'var(--text-secondary)' }}>
            Create your first template or let AI generate one for you.
          </p>
          <div className="flex justify-center gap-3">
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
                className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors"
                style={{ border: '1px solid var(--sidebar-border)', color: 'var(--text-primary)' }}
              >
                Start from scratch
              </Link>
            )}
          </div>
        </div>
      ) : (
        categories.map((category) => {
          const templates = SYSTEM_TEMPLATES.filter((t) => t.category === category);
          if (templates.length === 0) return null;
          return (
            <section key={category}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {CATEGORY_LABELS[category]}
                </h2>
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {templates.length} template{templates.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {templates.map((t) => (
                  <TemplateCard key={t.id} template={t} isAdmin={isAdmin} />
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
