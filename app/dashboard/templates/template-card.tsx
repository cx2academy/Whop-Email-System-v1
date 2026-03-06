'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { SystemTemplate } from '@/lib/templates/library';
import { CATEGORY_LABELS } from '@/lib/templates/library';
import { cloneSystemTemplate } from '@/lib/templates/actions';

export function TemplateCard({ template, isAdmin }: { template: SystemTemplate; isAdmin: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [cloned, setCloned] = useState(false);

  function handleUse() {
    // Navigate to new campaign pre-filled with this template
    router.push(`/dashboard/campaigns/new?templateId=${template.id}`);
  }

  function handleClone() {
    startTransition(async () => {
      const r = await cloneSystemTemplate(template.id);
      if (r.success) setCloned(true);
    });
  }

  const readingTime = Math.ceil(template.estimatedReadingSeconds / 60);

  return (
    <div className="flex flex-col rounded-lg border border-border bg-card overflow-hidden hover:border-primary/40 transition-colors">
      {/* Color band by category */}
      <div className={`h-1.5 ${CATEGORY_COLORS[template.category] ?? 'bg-primary'}`} />

      <div className="flex flex-col gap-3 p-4 flex-1">
        <div>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {CATEGORY_LABELS[template.category]}
          </span>
          <h3 className="mt-0.5 font-semibold text-foreground leading-tight">{template.name}</h3>
        </div>

        <p className="text-xs text-muted-foreground line-clamp-1 font-mono bg-muted/40 rounded px-2 py-1">
          {template.subject}
        </p>

        <div className="flex gap-3 text-xs text-muted-foreground">
          <span>~{readingTime} min read</span>
          <span>{template.tags.slice(0, 2).join(' · ')}</span>
        </div>

        <div className="mt-auto flex gap-2 pt-2">
          <button
            onClick={() => router.push(`/dashboard/templates/${template.id}`)}
            className="flex-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
          >
            Preview
          </button>
          {isAdmin && (
            <button
              onClick={handleUse}
              className="flex-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
            >
              Use template
            </button>
          )}
        </div>
        {isAdmin && (
          <button
            onClick={handleClone}
            disabled={isPending || cloned}
            className="w-full rounded-md border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-border disabled:opacity-50"
          >
            {cloned ? '✓ Saved to your templates' : isPending ? 'Saving…' : 'Save as personal template'}
          </button>
        )}
      </div>
    </div>
  );
}

const CATEGORY_COLORS: Record<string, string> = {
  course_launch:  'bg-indigo-500',
  announcement:   'bg-blue-500',
  promotion:      'bg-amber-500',
  scarcity:       'bg-red-500',
  webinar:        'bg-green-500',
  community:      'bg-purple-500',
  reengagement:   'bg-sky-500',
  upsell:         'bg-cyan-500',
};
