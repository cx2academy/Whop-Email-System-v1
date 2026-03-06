'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setWorkflowStatus, deleteWorkflow, triggerForAll } from '@/lib/automation/actions';

export function WorkflowControls({ workflowId, status: initialStatus }: {
  workflowId: string;
  status: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  function toggle() {
    const next = status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    startTransition(async () => {
      setError(''); setMsg('');
      const r = await setWorkflowStatus(workflowId, next as 'ACTIVE' | 'PAUSED');
      if (r.success) { setStatus(next); setMsg(next === 'ACTIVE' ? 'Workflow activated' : 'Workflow paused'); }
      else setError(r.error ?? 'Failed');
    });
  }

  function handleDelete() {
    if (!confirm('Delete this workflow?')) return;
    startTransition(async () => {
      await deleteWorkflow(workflowId);
      router.push('/dashboard/automation');
    });
  }

  function handleRunAll() {
    if (!confirm('Trigger for all subscribed contacts?')) return;
    startTransition(async () => {
      setMsg(''); setError('');
      const r = await triggerForAll(workflowId);
      if (r.success) setMsg(`Enrolled ${r.data.enrolled} contacts (${r.data.skipped} skipped)`);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        {status !== 'DISABLED' && (
          <button onClick={toggle} disabled={isPending}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50">
            {status === 'ACTIVE' ? 'Pause' : 'Activate'}
          </button>
        )}
        <button onClick={handleRunAll} disabled={isPending || status !== 'ACTIVE'}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50">
          Run for all contacts
        </button>
        <button onClick={handleDelete} disabled={isPending}
          className="rounded-md border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50">
          Delete
        </button>
      </div>
      {msg   && <p className="text-xs text-muted-foreground">{msg}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
