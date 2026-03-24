'use client';

/**
 * app/dashboard/templates/user-template-card.tsx
 *
 * Personal saved template card — restyled to match CSS var design system.
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteUserTemplate } from '@/lib/templates/actions';
import type { EmailTemplate } from '@prisma/client';
import { Trash2Icon, PencilIcon } from 'lucide-react';

export function UserTemplateCard({ template, isAdmin }: { template: EmailTemplate; isAdmin: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleted, setDeleted] = useState(false);

  if (deleted) return null;

  function handleUse() {
    router.push(`/dashboard/campaigns/new?userTemplateId=${template.id}`);
  }

  function handleDelete() {
    if (!confirm('Delete this template? This cannot be undone.')) return;
    startTransition(async () => {
      const r = await deleteUserTemplate(template.id);
      if (r.success) setDeleted(true);
    });
  }

  return (
    <div
      className="group flex flex-col rounded-xl overflow-hidden transition-all"
      style={{
        background:  'var(--surface-card)',
        border:      '1px solid var(--sidebar-border)',
        transition:  'box-shadow 0.15s, border-color 0.15s',
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--brand)')}
      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--sidebar-border)')}
    >
      {/* Accent bar — personal purple */}
      <div style={{ height: 3, background: 'linear-gradient(90deg,#7C3AED,#22C55E)', flexShrink: 0 }} />

      {/* Thumbnail placeholder */}
      <div
        className="flex items-center justify-center"
        style={{ height: 80, background: 'var(--surface-app)' }}
      >
        <svg className="h-8 w-8 opacity-20" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-2 p-4 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ background: 'rgba(124,58,237,0.1)', color: '#7C3AED' }}
          >
            Personal · {template.category}
          </span>
          {isAdmin && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => router.push(`/dashboard/templates/user/${template.id}`)}
                className="rounded p-1 transition-colors"
                style={{ color: 'var(--text-tertiary)' }}
                title="Edit"
              >
                <PencilIcon className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="rounded p-1 transition-colors disabled:opacity-50"
                style={{ color: '#EF4444' }}
                title="Delete"
              >
                <Trash2Icon className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
          {template.name}
        </p>

        <p
          className="text-xs truncate rounded px-2 py-1"
          style={{ color: 'var(--text-tertiary)', background: 'var(--surface-app)', fontFamily: 'monospace' }}
        >
          {template.subject}
        </p>

        {template.usageCount > 0 && (
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Used {template.usageCount} time{template.usageCount !== 1 ? 's' : ''}
            {template.avgOpenRate > 0 && ` · ${template.avgOpenRate.toFixed(1)}% avg open`}
          </p>
        )}

        {isAdmin && (
          <button
            onClick={handleUse}
            className="mt-auto w-full rounded-lg py-2 text-xs font-semibold text-white transition-all hover:opacity-90"
            style={{ background: 'var(--brand)', marginTop: 8 }}
          >
            Use template →
          </button>
        )}
      </div>
    </div>
  );
}
