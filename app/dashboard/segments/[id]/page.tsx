/**
 * app/dashboard/segments/[id]/page.tsx
 * Segment detail — view rules, edit, preview contacts.
 */
'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeftIcon } from 'lucide-react';
import { getSegment, updateSegment, deleteSegment, previewSavedSegment } from '@/lib/segmentation/actions';
import type { SegmentCondition, SegmentRules } from '@/lib/segmentation/segment-engine';

const FIELD_OPTIONS = [
  { value: 'tag',         label: 'Has tag' },
  { value: 'status',      label: 'Status' },
  { value: 'createdAt',   label: 'Subscriber since' },
  { value: 'lastOpened',  label: 'Last opened' },
  { value: 'lastClicked', label: 'Last clicked' },
  { value: 'opensCount',  label: 'Opens count' },
  { value: 'emailsSent',  label: 'Emails received' },
];

const OP_OPTIONS: Record<string, { value: string; label: string }[]> = {
  tag:         [{ value: 'has', label: 'has tag' }, { value: 'not_has', label: 'does not have tag' }],
  status:      [{ value: 'eq', label: 'is' }],
  createdAt:   [{ value: 'within_days', label: 'within last N days' }, { value: 'older_than_days', label: 'more than N days ago' }],
  lastOpened:  [{ value: 'within_days', label: 'within last N days' }, { value: 'older_than_days', label: 'more than N days ago' }, { value: 'never', label: 'never opened' }],
  lastClicked: [{ value: 'within_days', label: 'within last N days' }, { value: 'older_than_days', label: 'more than N days ago' }, { value: 'never', label: 'never clicked' }],
  opensCount:  [{ value: 'gt', label: 'more than' }, { value: 'lt', label: 'less than' }],
  emailsSent:  [{ value: 'gt', label: 'more than' }, { value: 'lt', label: 'less than' }],
};

export default function SegmentDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [operator, setOperator] = useState<'AND' | 'OR'>('AND');
  const [conditions, setConditions] = useState<SegmentCondition[]>([]);
  const [preview, setPreview] = useState<{ count: number; sample: { email: string; firstName?: string | null }[] } | null>(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getSegment(params.id).then((seg) => {
      if (!seg) { router.push('/dashboard/segments'); return; }
      setName(seg.name);
      setDescription(seg.description ?? '');
      try {
        const rules = JSON.parse(seg.rules) as SegmentRules;
        setOperator(rules.operator ?? 'AND');
        setConditions(rules.conditions ?? []);
      } catch { /* empty */ }
    });
  }, [params.id]);

  function updateCondition(i: number, patch: Partial<SegmentCondition>) {
    setConditions((prev) => prev.map((c, idx) => idx === i ? { ...c, ...patch } : c));
  }

  function handlePreview() {
    startTransition(async () => {
      setError(''); setMsg('');
      const r = await previewSavedSegment(params.id);
      if (r.success) setPreview(r.data);
      else setError(r.error ?? 'Preview failed');
    });
  }

  function handleSave() {
    startTransition(async () => {
      setError(''); setMsg('');
      const rules: SegmentRules = { operator, conditions };
      const r = await updateSegment(params.id, { name, description: description || undefined, rules });
      if (r.success) setMsg('Saved');
      else setError('Save failed');
    });
  }

  function handleDelete() {
    if (!confirm('Delete this segment?')) return;
    startTransition(async () => {
      await deleteSegment(params.id);
      router.push('/dashboard/segments');
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard/segments" className="flex items-center gap-1 hover:text-foreground">
          <ChevronLeftIcon className="h-4 w-4" /> Segments
        </Link>
        <span>/</span>
        <span className="text-foreground truncate">{name || 'Loading…'}</span>
      </div>

      <div className="space-y-3 rounded-lg border border-border bg-card p-5">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Segment name"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium" />
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </div>

      <div className="space-y-3 rounded-lg border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Conditions</h2>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Match</span>
            {(['AND', 'OR'] as const).map((op) => (
              <button key={op} onClick={() => setOperator(op)}
                className={`rounded px-2 py-1 font-medium ${operator === op ? 'bg-primary text-primary-foreground' : 'border border-border text-foreground hover:bg-muted'}`}>
                {op === 'AND' ? 'ALL (AND)' : 'ANY (OR)'}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {conditions.map((cond, i) => (
            <div key={i} className="flex items-center gap-2 rounded-md border border-border bg-background p-2">
              <select value={cond.field} onChange={(e) => updateCondition(i, { field: e.target.value as any, op: (OP_OPTIONS[e.target.value]?.[0]?.value ?? 'eq') as any, value: undefined })}
                className="rounded border border-input bg-background px-2 py-1 text-xs">
                {FIELD_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
              <select value={cond.op} onChange={(e) => updateCondition(i, { op: e.target.value as any })}
                className="rounded border border-input bg-background px-2 py-1 text-xs">
                {(OP_OPTIONS[cond.field] ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {cond.op !== 'never' && (
                cond.field === 'status' ? (
                  <select value={String(cond.value ?? 'SUBSCRIBED')} onChange={(e) => updateCondition(i, { value: e.target.value })}
                    className="rounded border border-input bg-background px-2 py-1 text-xs">
                    <option value="SUBSCRIBED">Subscribed</option>
                    <option value="UNSUBSCRIBED">Unsubscribed</option>
                    <option value="BOUNCED">Bounced</option>
                  </select>
                ) : (
                  <input value={String(cond.value ?? '')} onChange={(e) => updateCondition(i, { value: e.target.value })}
                    placeholder={cond.field === 'tag' ? 'tag name' : 'number'}
                    className="w-28 rounded border border-input bg-background px-2 py-1 text-xs" />
                )
              )}
              {conditions.length > 1 && (
                <button onClick={() => setConditions((p) => p.filter((_, idx) => idx !== i))}
                  className="ml-auto text-xs text-destructive hover:underline">Remove</button>
              )}
            </div>
          ))}
        </div>
        <button onClick={() => setConditions((p) => [...p, { field: 'status', op: 'eq', value: 'SUBSCRIBED' }])}
          className="rounded-md border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary">
          + Add condition
        </button>
      </div>

      {preview && (
        <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm">
          <p className="font-semibold text-foreground">{preview.count.toLocaleString()} contacts match</p>
          {preview.sample.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
              {preview.sample.map((c) => <li key={c.email}>{c.firstName ? `${c.firstName} — ` : ''}{c.email}</li>)}
              {preview.count > preview.sample.length && <li>…and {preview.count - preview.sample.length} more</li>}
            </ul>
          )}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      {msg   && <p className="text-sm text-green-600">{msg}</p>}

      <div className="flex gap-3">
        <button onClick={handleSave} disabled={isPending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
          {isPending ? 'Saving…' : 'Save changes'}
        </button>
        <button onClick={handlePreview} disabled={isPending}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50">
          Preview contacts
        </button>
        <button onClick={handleDelete} disabled={isPending}
          className="rounded-md border border-destructive/40 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50">
          Delete
        </button>
      </div>
    </div>
  );
}
