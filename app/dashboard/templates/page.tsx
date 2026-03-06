/**
 * app/dashboard/templates/page.tsx
 * Template library — browse system templates + manage personal templates.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { requireWorkspaceAccess } from '@/lib/auth/session';
import { getTemplateStats, getUserTemplates } from '@/lib/templates/actions';
import { SYSTEM_TEMPLATES, CATEGORY_LABELS, getAllCategories } from '@/lib/templates/library';
import { TemplateCard } from './template-card';
import { UserTemplateCard } from './user-template-card';

export const metadata: Metadata = { title: 'Templates' };

export default async function TemplatesPage() {
  const { workspaceRole } = await requireWorkspaceAccess();
  const isAdmin = workspaceRole === 'OWNER' || workspaceRole === 'ADMIN';
  const [userTemplates] = await Promise.all([getUserTemplates()]);
  const categories = getAllCategories();

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Templates</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Start from a proven template or build your own
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/templates/generate"
            className="flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            ✨ AI Generate
          </Link>
          {isAdmin && (
            <Link
              href="/dashboard/templates/new"
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              + New template
            </Link>
          )}
        </div>
      </div>

      {/* Personal templates */}
      {userTemplates.length > 0 && (
        <section>
          <h2 className="mb-4 text-base font-semibold text-foreground">Your Templates</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {userTemplates.map((t) => (
              <UserTemplateCard key={t.id} template={t} isAdmin={isAdmin} />
            ))}
          </div>
        </section>
      )}

      {/* System templates by category */}
      {categories.map((category) => {
        const templates = SYSTEM_TEMPLATES.filter((t) => t.category === category);
        return (
          <section key={category}>
            <h2 className="mb-4 text-base font-semibold text-foreground">
              {CATEGORY_LABELS[category]}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {templates.length} template{templates.length !== 1 ? 's' : ''}
              </span>
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((t) => (
                <TemplateCard key={t.id} template={t} isAdmin={isAdmin} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
