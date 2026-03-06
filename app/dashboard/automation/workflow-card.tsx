'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { setWorkflowStatus, deleteWorkflow, triggerForAll } from '@/lib/automation/actions';

interface WorkflowCardProps {
  workflow: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    totalRuns: number;
    totalEmailsSent: number;
    lastTriggeredAt: string | null;
    stepCount: number;
    enrollmentCount: number;
    errorCount: number;
  };
  isAdmin: boolean;
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE:   'bg-green-100 text-green-700',
  DRAFT:    'bg-muted text-muted-foreground',
  PAUSED:   'bg-yellow-100 text-yellow-700',
  DISABLED: 'bg-red-100 text-red-700',
};

export function WorkflowCard({ workflow, isAdmin }: WorkflowCardProps) {
  const [status, setStatus] = useState(workflow.status);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [isPending, startTransition] = useTransition();

  function toggleActive() {
    const next = status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    startTransition(async () => {
      setError('');
      const r = await setWorkflowStatus(workflow.id, next as 'ACTIVE' | 'PAUSED');
      if (r.success) setStatus(next);
      else setError(r.error ?? 'Failed');
    });
  }

  function handleDelete() {
    if (!confirm('Delete this workflow? All enrollments and jobs will be removed.')) return;
    startTransition(async () => {
      await deleteWorkflow(workflow.id);
    });
  }

  function handleRunAll() {
    if (!confirm('Trigger this workflow for all subscribed contacts?')) return;
    startTransition(async () => {
      setMsg('');
      const r = await triggerForAll(workflow.id);
      if (r.success) setMsg(`Enrolled ${r.data.enrolled} contacts`);
    });
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/automation/${workflow.id}`}
              className="font-semibold text-foreground hover:text-primary truncate"
            >
              {workflow.name}
            </Link>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status] ?? STATUS_STYLES.DRAFT}`}>
              {status.toLowerCase()}
            </span>
            {workflow.errorCount > 0 && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                {workflow.errorCount} errors
              </span>
            )}
          </div>
          {workflow.description && (
            <p className="mt-0.5 text-sm text-muted-foreground truncate">{workflow.description}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span>{workflow.stepCount} step{workflow.stepCount !== 1 ? 's' : ''}</span>
            <span>{workflow.totalRuns} runs</span>
            <span>{workflow.totalEmailsSent} emails sent</span>
            <span>{workflow.enrollmentCount} enrolled</span>
            {workflow.lastTriggeredAt && (
              <span>Last: {new Date(workflow.lastTriggeredAt).toLocaleDateString()}</span>
            )}
          </div>
        </div>

        {isAdmin && (
          <div className="flex shrink-0 gap-2">
            <Link
              href={`/dashboard/automation/${workflow.id}`}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
            >
              Edit
            </Link>
            {status !== 'DISABLED' && (
              <button
                onClick={toggleActive}
                disabled={isPending}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
              >
                {status === 'ACTIVE' ? 'Pause' : 'Activate'}
              </button>
            )}
            <button
              onClick={handleRunAll}
              disabled={isPending || status !== 'ACTIVE'}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
              title="Trigger for all subscribed contacts"
            >
              Run all
            </button>
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="rounded-md border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      {msg && <p className="mt-2 text-xs text-muted-foreground">{msg}</p>}
    </div>
  );
}
