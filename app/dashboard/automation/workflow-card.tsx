'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { setWorkflowStatus, deleteWorkflow, triggerForAll } from '@/lib/automation/actions';
import { WHOP_TRIGGER_LABELS } from '@/lib/automation/trigger-system';
import type { TriggerType } from '@/lib/automation/trigger-system';

interface WorkflowCardProps {
  workflow: {
    id:              string;
    name:            string;
    description:     string | null;
    status:          string;
    totalRuns:       number;
    totalEmailsSent: number;
    lastTriggeredAt: string | null;
    stepCount:       number;
    enrollmentCount: number;
    errorCount:      number;
    triggerType?:    string | null; // parsed from step 0 config
  };
  isAdmin: boolean;
}

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  ACTIVE:   { bg: 'rgba(34,197,94,0.1)',  color: '#16A34A' },
  DRAFT:    { bg: 'var(--surface-app)',    color: 'var(--text-tertiary)' },
  PAUSED:   { bg: 'rgba(234,179,8,0.1)',   color: '#B45309' },
  DISABLED: { bg: 'rgba(239,68,68,0.1)',   color: '#DC2626' },
};

// Icons for trigger types
const TRIGGER_ICONS: Record<string, string> = {
  membership_activated:   '👋',
  membership_deactivated: '🔕',
  payment_succeeded:      '💳',
  product_purchased:      '🛍',
  product_not_purchased:  '⏰',
  new_member:             '➕',
  purchase:               '💰',
  api:                    '🔌',
  manual:                 '🖱',
};

export function WorkflowCard({ workflow, isAdmin }: WorkflowCardProps) {
  const [status,    setStatus]    = useState(workflow.status);
  const [error,     setError]     = useState('');
  const [msg,       setMsg]       = useState('');
  const [isPending, startTransition] = useTransition();

  const st = STATUS_STYLES[status] ?? STATUS_STYLES.DRAFT;
  const triggerLabel = workflow.triggerType
    ? (WHOP_TRIGGER_LABELS[workflow.triggerType as TriggerType] ?? workflow.triggerType)
    : null;
  const triggerIcon = workflow.triggerType ? (TRIGGER_ICONS[workflow.triggerType] ?? '⚡') : '⚡';

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
    startTransition(async () => { await deleteWorkflow(workflow.id); });
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
    <div className="rounded-xl p-5" style={{ background: 'var(--surface-card)', border: '1px solid var(--sidebar-border)' }}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">

          {/* Name + status */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/dashboard/automation/${workflow.id}`}
              className="font-semibold truncate hover:opacity-70 transition-opacity"
              style={{ color: 'var(--text-primary)' }}
            >
              {workflow.name}
            </Link>
            <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: st.bg, color: st.color }}>
              {status.toLowerCase()}
            </span>
            {workflow.errorCount > 0 && (
              <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: 'rgba(239,68,68,0.1)', color: '#DC2626' }}>
                {workflow.errorCount} errors
              </span>
            )}
          </div>

          {/* Trigger label */}
          {triggerLabel && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="text-xs">{triggerIcon}</span>
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                When: {triggerLabel}
              </span>
            </div>
          )}

          {workflow.description && (
            <p className="mt-0.5 text-sm truncate" style={{ color: 'var(--text-tertiary)' }}>{workflow.description}</p>
          )}

          {/* Stats */}
          <div className="mt-2 flex flex-wrap gap-4 text-xs" style={{ color: 'var(--text-tertiary)' }}>
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
          <div className="flex shrink-0 gap-2 flex-wrap">
            <Link href={`/dashboard/automation/${workflow.id}`}
              className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              style={{ border: '1px solid var(--sidebar-border)', color: 'var(--text-secondary)', background: 'none' }}
            >
              Edit
            </Link>
            {status !== 'DISABLED' && (
              <button onClick={toggleActive} disabled={isPending}
                className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
                style={{ border: '1px solid var(--sidebar-border)', color: 'var(--text-secondary)', background: 'none' }}
              >
                {status === 'ACTIVE' ? 'Pause' : 'Activate'}
              </button>
            )}
            <button onClick={handleRunAll} disabled={isPending || status !== 'ACTIVE'}
              className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
              style={{ border: '1px solid var(--sidebar-border)', color: 'var(--text-secondary)', background: 'none' }}
              title="Trigger for all subscribed contacts"
            >
              Run all
            </button>
            <button onClick={handleDelete} disabled={isPending}
              className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
              style={{ border: '1px solid rgba(239,68,68,0.3)', color: '#DC2626', background: 'none' }}
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {error && <p className="mt-2 text-xs" style={{ color: '#DC2626' }}>{error}</p>}
      {msg   && <p className="mt-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>{msg}</p>}
    </div>
  );
}
