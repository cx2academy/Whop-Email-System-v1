'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteUserTemplate } from '@/lib/templates/actions';
import type { EmailTemplate } from '@prisma/client';

export function UserTemplateCard({ template, isAdmin }: { template: EmailTemplate; isAdmin: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleUse() {
    router.push(`/dashboard/campaigns/new?userTemplateId=${template.id}`);
  }

  function handleDelete() {
    if (!confirm('Delete this template?')) return;
    startTransition(async () => {
      await deleteUserTemplate(template.id);
    });
  }

  return (
    <div className="flex flex-col rounded-lg border border-border bg-card overflow-hidden hover:border-primary/40 transition-colors">
      <div className="h-1.5 bg-muted" />
      <div className="flex flex-col gap-3 p-4 flex-1">
        <div>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {template.category} · Personal
          </span>
          <h3 className="mt-0.5 font-semibold text-foreground leading-tight">{template.name}</h3>
        </div>

        <p className="text-xs text-muted-foreground line-clamp-1 font-mono bg-muted/40 rounded px-2 py-1">
          {template.subject}
        </p>

        {template.usageCount > 0 && (
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span>{template.usageCount} use{template.usageCount !== 1 ? 's' : ''}</span>
            {template.avgOpenRate > 0 && (
              <span>{template.avgOpenRate.toFixed(1)}% avg open rate</span>
            )}
          </div>
        )}

        <div className="mt-auto flex gap-2 pt-2">
          <button
            onClick={() => router.push(`/dashboard/templates/user/${template.id}`)}
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
            onClick={handleDelete}
            disabled={isPending}
            className="w-full rounded-md border border-dashed border-destructive/30 px-3 py-1.5 text-xs text-destructive/70 hover:text-destructive disabled:opacity-50"
          >
            {isPending ? 'Deleting…' : 'Delete'}
          </button>
        )}
      </div>
    </div>
  );
}
