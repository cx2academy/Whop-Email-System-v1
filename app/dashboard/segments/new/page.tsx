'use client';

/**
 * app/dashboard/segments/new/page.tsx
 * Segment builder — create a new segment with AND/OR conditions.
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeftIcon, SparklesIcon, AlertTriangleIcon } from 'lucide-react';
import { createSegment, previewSegment } from '@/lib/segmentation/actions';
import type { SegmentCondition, SegmentRules } from '@/lib/segmentation/segment-engine';
import type { NLSegmentResult } from '@/lib/ai/segment-builder';

const FIELD_OPTIONS = [
  { value: 'tag',         label: 'Has tag' },
  { value: 'status',      label: 'Subscription status' },
  { value: 'createdAt',   label: 'Subscriber since' },
  { value: 'lastOpened',  label: 'Last opened email' },
  { value: 'lastClicked', label: 'Last clicked email' },
  { value: 'opensCount',  label: 'Total opens count' },
  { value: 'emailsSent',  label: 'Total emails received' },
  { value: 'whopStatus',  label: 'Whop Membership Status' },
  { value: 'whopPasses',  label: 'Whop Product/Pass' },
];

const OP_OPTIONS: Record<string, { value: string; label: string }[]> = {
  tag:         [{ value: 'has', label: 'has tag' }, { value: 'not_has', label: 'does not have tag' }],
  status:      [{ value: 'eq', label: 'is' }],
  createdAt:   [{ value: 'within_days', label: 'within last N days' }, { value: 'older_than_days', label: 'more than N days ago' }],
  lastOpened:  [{ value: 'within_days', label: 'within last N days' }, { value: 'older_than_days', label: 'more than N days ago' }, { value: 'never', label: 'never opened' }],
  lastClicked: [{ value: 'within_days', label: 'within last N days' }, { value: 'older_than_days', label: 'more than N days ago' }, { value: 'never', label: 'never clicked' }],
  opensCount:  [{ value: 'gt', label: 'more than' }, { value: 'lt', label: 'less than' }],
  emailsSent:  [{ value: 'gt', label: 'more than' }, { value: 'lt', label: 'less than' }],
  whopStatus:  [{ value: 'eq', label: 'is' }, { value: 'not_eq', label: 'is not' }],
  whopPasses:  [{ value: 'has', label: 'has product ID' }, { value: 'not_has', label: 'does not have product ID' }],
};

function defaultCondition(): SegmentCondition {
  return { field: 'status', op: 'eq', value: 'SUBSCRIBED' };
}

export default function NewSegmentPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [operator, setOperator] = useState<'AND' | 'OR'>('AND');
  const [conditions, setConditions] = useState<SegmentCondition[]>([defaultCondition()]);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<{ count: number; sample: { email: string; firstName?: string | null }[] } | null>(null);

  // NL Builder State
  const [nlDescription, setNlDescription] = useState('');
  const [nlResult, setNlResult] = useState<NLSegmentResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [nlError, setNlError] = useState('');

  async function handleGenerateRules() {
    if (!nlDescription.trim()) return;
    setIsGenerating(true);
    setNlError('');
    setNlResult(null);
    try {
      const res = await fetch('/api/ai/build-segment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: nlDescription }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNlResult(data.data);
      } else {
        setNlError(data.error || 'Failed to generate rules');
      }
    } catch (err) {
      setNlError('Network error');
    } finally {
      setIsGenerating(false);
    }
  }

  function handleUseRules() {
    if (!nlResult) return;
    setOperator(nlResult.rules.operator);
    setConditions(nlResult.rules.conditions.map(c => ({
      field: c.field as any,
      op: c.op as any,
      value: c.value
    })));
    setNlResult(null);
    setNlDescription('');
  }

  function updateCondition(i: number, patch: Partial<SegmentCondition>) {
    setConditions((prev) => prev.map((c, idx) => idx === i ? { ...c, ...patch } : c));
  }

  function removeCondition(i: number) {
    setConditions((prev) => prev.filter((_, idx) => idx !== i));
  }

  function handlePreview() {
    const rules: SegmentRules = { operator, conditions };
    startTransition(async () => {
      setError('');
      const r = await previewSegment(rules);
      if (r.success) setPreview(r.data);
      else setError((r as any).error ?? 'Preview failed');
    });
  }

  function handleSave() {
    if (!name.trim()) { setError('Name is required'); return; }
    if (conditions.length === 0) { setError('Add at least one condition'); return; }
    const rules: SegmentRules = { operator, conditions };
    startTransition(async () => {
      setError('');
      const r = await createSegment({ name: name.trim(), description: description.trim() || undefined, rules });
      if (r.success) router.push(`/dashboard/segments/${r.data.segmentId}`);
      else setError('Failed to save segment');
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard/segments" className="flex items-center gap-1 hover:text-foreground">
          <ChevronLeftIcon className="h-4 w-4" /> Segments
        </Link>
        <span>/</span>
        <span className="text-foreground">New segment</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">New Segment</h1>
        <p className="mt-1 text-sm text-muted-foreground">Build a dynamic filter to target specific contacts</p>
      </div>

      {/* AI Segment Builder */}
      <div className="space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-5">
        <div className="flex items-center gap-2">
          <SparklesIcon className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">AI Segment Builder</h2>
        </div>
        
        {!nlResult ? (
          <div className="space-y-3">
            <textarea
              value={nlDescription}
              onChange={(e) => setNlDescription(e.target.value)}
              placeholder="Describe your audience in plain English... (e.g., 'People who joined last month but haven't opened anything')"
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Costs 3 AI credits</p>
              <button
                onClick={handleGenerateRules}
                disabled={isGenerating || !nlDescription.trim()}
                className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {isGenerating ? 'Generating...' : 'Generate rules'}
              </button>
            </div>
            {nlError && <p className="text-sm text-destructive">{nlError}</p>}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md bg-background p-4 border border-border">
              <p className="text-sm font-medium text-foreground mb-3">
                <span className="text-primary font-semibold">I understood:</span> {nlResult.understood}
              </p>
              
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Generated Rules (Match {nlResult.rules.operator})</p>
                <ul className="space-y-1.5">
                  {nlResult.rules.conditions.map((c, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      <span className="text-foreground">{c.humanReadable}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {nlResult.warnings.length > 0 && (
                <div className="mt-4 rounded-md bg-yellow-500/10 p-3 border border-yellow-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangleIcon className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-400">Warnings</p>
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    {nlResult.warnings.map((w, i) => (
                      <li key={i} className="text-xs text-yellow-700 dark:text-yellow-500">{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleUseRules}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Use these rules
              </button>
              <button
                onClick={() => setNlResult(null)}
                className="text-sm font-medium text-muted-foreground hover:text-foreground underline underline-offset-4"
              >
                Edit manually
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Name */}
      <div className="space-y-3 rounded-lg border border-border bg-card p-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Segment name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Engaged buyers"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Description <span className="font-normal text-muted-foreground">(optional)</span></label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this segment target?"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>
      </div>

      {/* Rules */}
      <div className="space-y-3 rounded-lg border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Conditions</h2>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Match</span>
            <button onClick={() => setOperator('AND')}
              className={`rounded px-2 py-1 font-medium ${operator === 'AND' ? 'bg-primary text-primary-foreground' : 'border border-border text-foreground hover:bg-muted'}`}>
              ALL (AND)
            </button>
            <button onClick={() => setOperator('OR')}
              className={`rounded px-2 py-1 font-medium ${operator === 'OR' ? 'bg-primary text-primary-foreground' : 'border border-border text-foreground hover:bg-muted'}`}>
              ANY (OR)
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {conditions.map((cond, i) => (
            <ConditionEditor
              key={i}
              condition={cond}
              onChange={(patch) => updateCondition(i, patch)}
              onRemove={conditions.length > 1 ? () => removeCondition(i) : undefined}
            />
          ))}
        </div>

        <button onClick={() => setConditions((p) => [...p, defaultCondition()])}
          className="rounded-md border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary">
          + Add condition
        </button>
      </div>

      {/* Preview */}
      {preview && (
        <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm">
          <p className="font-semibold text-foreground">{preview.count.toLocaleString()} contacts match this segment</p>
          {preview.sample.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-muted-foreground">
              {preview.sample.map((c) => (
                <li key={c.email}>{c.firstName ? `${c.firstName} — ` : ''}{c.email}</li>
              ))}
              {preview.count > preview.sample.length && (
                <li className="text-xs">…and {preview.count - preview.sample.length} more</li>
              )}
            </ul>
          )}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <button onClick={handleSave} disabled={isPending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
          {isPending ? 'Saving…' : 'Save segment'}
        </button>
        <button onClick={handlePreview} disabled={isPending}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50">
          {isPending ? 'Previewing…' : 'Preview contacts'}
        </button>
        <Link href="/dashboard/segments"
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
          Cancel
        </Link>
      </div>
    </div>
  );
}

function ConditionEditor({
  condition, onChange, onRemove,
}: {
  condition: SegmentCondition;
  onChange: (patch: Partial<SegmentCondition>) => void;
  onRemove?: () => void;
}) {
  const ops = OP_OPTIONS[condition.field] ?? [];
  const needsValue = condition.op !== 'never';

  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-background p-2">
      <select value={condition.field} onChange={(e) => onChange({ field: e.target.value as any, op: (OP_OPTIONS[e.target.value]?.[0]?.value ?? 'eq') as any, value: undefined })}
        className="rounded border border-input bg-background px-2 py-1 text-xs">
        {FIELD_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
      </select>

      <select value={condition.op} onChange={(e) => onChange({ op: e.target.value as any })}
        className="rounded border border-input bg-background px-2 py-1 text-xs">
        {ops.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      {needsValue && (
        condition.field === 'status' ? (
          <select value={String(condition.value ?? 'SUBSCRIBED')} onChange={(e) => onChange({ value: e.target.value })}
            className="rounded border border-input bg-background px-2 py-1 text-xs">
            <option value="SUBSCRIBED">Subscribed</option>
            <option value="UNSUBSCRIBED">Unsubscribed</option>
            <option value="BOUNCED">Bounced</option>
          </select>
        ) : condition.field === 'whopStatus' ? (
          <select value={String(condition.value ?? 'active')} onChange={(e) => onChange({ value: e.target.value })}
            className="rounded border border-input bg-background px-2 py-1 text-xs">
            <option value="active">Active</option>
            <option value="canceled">Canceled</option>
            <option value="past_due">Past Due</option>
            <option value="trialing">Trialing</option>
            <option value="completed">Completed</option>
          </select>
        ) : (
          <input
            value={String(condition.value ?? '')}
            onChange={(e) => onChange({ value: e.target.value })}
            placeholder={condition.field === 'tag' ? 'tag name' : condition.field === 'whopPasses' ? 'product ID' : 'number'}
            className="w-28 rounded border border-input bg-background px-2 py-1 text-xs"
          />
        )
      )}

      {onRemove && (
        <button onClick={onRemove} className="ml-auto text-xs text-destructive hover:underline">Remove</button>
      )}
    </div>
  );
}
