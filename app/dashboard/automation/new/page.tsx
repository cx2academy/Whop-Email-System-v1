'use client';

/**
 * app/dashboard/automation/new/page.tsx
 * Create a new automation workflow with steps.
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createWorkflow, addStep } from '@/lib/automation/actions';
import { UpgradeBanner } from '@/components/ui/plan-usage';
import { isUpgradeRequired } from '@/types';
import type { AutomationStepType } from '@prisma/client';

const STEP_TYPES: { type: AutomationStepType; label: string; description: string }[] = [
  { type: 'TRIGGER',    label: 'Trigger',    description: 'When this workflow starts' },
  { type: 'DELAY',      label: 'Delay',      description: 'Wait before next step' },
  { type: 'SEND_EMAIL', label: 'Send Email', description: 'Send an email to the contact' },
  { type: 'ADD_TAG',    label: 'Add Tag',    description: 'Add a tag to the contact' },
  { type: 'WEBHOOK',    label: 'Webhook',    description: 'Call an external URL' },
];

const TRIGGER_TYPES = [
  { value: 'new_member', label: 'New member joins' },
  { value: 'purchase',   label: 'Purchase event' },
  { value: 'api',        label: 'API trigger' },
  { value: 'manual',     label: 'Manual trigger' },
];

interface StepDraft {
  type: AutomationStepType;
  config: Record<string, unknown>;
}

export default function NewWorkflowPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState<StepDraft[]>([
    { type: 'TRIGGER', config: { triggerType: 'new_member' } },
  ]);
  const [error, setError] = useState('');
  const [upgradePayload, setUpgradePayload] = useState<Parameters<typeof UpgradeBanner>[0]['payload'] | null>(null);

  function addNewStep(type: AutomationStepType) {
    const defaults: Record<AutomationStepType, Record<string, unknown>> = {
      TRIGGER:    { triggerType: 'new_member' },
      DELAY:      { amount: 1, unit: 'days' },
      SEND_EMAIL: { subject: '', html: '' },
      ADD_TAG:    { tagName: '' },
      WEBHOOK:    { url: '', method: 'POST', payload: '' },
    };
    setSteps((prev) => [...prev, { type, config: defaults[type] }]);
  }

  function updateStep(i: number, config: Record<string, unknown>) {
    setSteps((prev) => prev.map((s, idx) => idx === i ? { ...s, config } : s));
  }

  function removeStep(i: number) {
    setSteps((prev) => prev.filter((_, idx) => idx !== i));
  }

  function handleSave() {
    if (!name.trim()) { setError('Workflow name is required'); return; }
    if (steps.length < 2) { setError('Add at least one action after the trigger'); return; }
    setError('');

    startTransition(async () => {
      const wf = await createWorkflow(name.trim(), description.trim() || undefined);
      if (!wf.success) {
        if (isUpgradeRequired(wf)) {
          setUpgradePayload(wf);
        } else {
          setError(wf.error ?? 'Failed');
        }
        return;
      }

      for (let i = 0; i < steps.length; i++) {
        await addStep(wf.data.workflowId, steps[i].type, steps[i].config, i);
      }

      router.push(`/dashboard/automation/${wf.data.workflowId}`);
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">New Workflow</h1>
        <p className="mt-1 text-sm text-muted-foreground">Build an automated email sequence</p>
      </div>

      {/* Name + description */}
      <div className="space-y-3 rounded-lg border border-border bg-card p-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Workflow name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Welcome sequence"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this workflow do?"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Steps</h2>
        {steps.map((step, i) => (
          <StepEditor
            key={i}
            index={i}
            step={step}
            onChange={(config) => updateStep(i, config)}
            onRemove={i > 0 ? () => removeStep(i) : undefined}
          />
        ))}

        {/* Add step menu */}
        <div className="flex flex-wrap gap-2">
          {STEP_TYPES.filter((t) => t.type !== 'TRIGGER').map((t) => (
            <button
              key={t.type}
              onClick={() => addNewStep(t.type)}
              className="rounded-md border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary"
            >
              + {t.label}
            </button>
          ))}
        </div>
      </div>

      {upgradePayload && (
        <UpgradeBanner payload={upgradePayload} />
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? 'Saving…' : 'Save workflow'}
        </button>
        <button
          onClick={() => router.push('/dashboard/automation')}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step editor sub-component
// ---------------------------------------------------------------------------

function StepEditor({
  index, step, onChange, onRemove,
}: {
  index: number;
  step: StepDraft;
  onChange: (c: Record<string, unknown>) => void;
  onRemove?: () => void;
}) {
  const labels: Record<AutomationStepType, string> = {
    TRIGGER: 'Trigger', DELAY: 'Delay', SEND_EMAIL: 'Send Email', ADD_TAG: 'Add Tag', WEBHOOK: 'Webhook',
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {index + 1}. {labels[step.type]}
        </span>
        {onRemove && (
          <button onClick={onRemove} className="text-xs text-destructive hover:underline">Remove</button>
        )}
      </div>

      {step.type === 'TRIGGER' && (
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">Trigger event</label>
          <select
            value={String(step.config.triggerType)}
            onChange={(e) => onChange({ ...step.config, triggerType: e.target.value })}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {TRIGGER_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      )}

      {step.type === 'DELAY' && (
        <div className="flex gap-2">
          <input
            type="number"
            min={1}
            value={Number(step.config.amount)}
            onChange={(e) => onChange({ ...step.config, amount: parseInt(e.target.value) || 1 })}
            className="w-24 rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <select
            value={String(step.config.unit)}
            onChange={(e) => onChange({ ...step.config, unit: e.target.value })}
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="minutes">Minutes</option>
            <option value="hours">Hours</option>
            <option value="days">Days</option>
          </select>
        </div>
      )}

      {step.type === 'SEND_EMAIL' && (
        <div className="space-y-2">
          <input
            placeholder="Subject line (use {{firstName}} for personalization)"
            value={String(step.config.subject ?? '')}
            onChange={(e) => onChange({ ...step.config, subject: e.target.value })}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Email HTML body"
            rows={4}
            value={String(step.config.html ?? '')}
            onChange={(e) => onChange({ ...step.config, html: e.target.value })}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
          />
        </div>
      )}

      {step.type === 'ADD_TAG' && (
        <input
          placeholder="Tag name (e.g. buyer, warm-lead)"
          value={String(step.config.tagName ?? '')}
          onChange={(e) => onChange({ ...step.config, tagName: e.target.value })}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      )}

      {step.type === 'WEBHOOK' && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <select
              value={String(step.config.method ?? 'POST')}
              onChange={(e) => onChange({ ...step.config, method: e.target.value })}
              className="w-24 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="POST">POST</option>
              <option value="GET">GET</option>
            </select>
            <input
              placeholder="https://hooks.example.com/..."
              value={String(step.config.url ?? '')}
              onChange={(e) => onChange({ ...step.config, url: e.target.value })}
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          {step.config.method === 'POST' && (
            <textarea
              placeholder='JSON payload (use {{email}}, {{firstName}})'
              rows={2}
              value={String(step.config.payload ?? '')}
              onChange={(e) => onChange({ ...step.config, payload: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
            />
          )}
        </div>
      )}
    </div>
  );
}
