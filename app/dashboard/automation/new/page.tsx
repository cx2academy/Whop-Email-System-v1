'use client';

/**
 * app/dashboard/automation/new/page.tsx
 *
 * Visual flow builder for automation workflows.
 * Renders a vertical node-based flow with IF/ELSE condition branching.
 *
 * Data model:
 *   FlowStep[] — top-level steps (stored as AutomationStep rows in DB)
 *   CONDITION steps embed trueBranch/falseBranch in their config JSON.
 *   The workflow engine reads these branches at execution time.
 */

import { useState, useTransition, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createWorkflow, addStep } from '@/lib/automation/actions';
import { getWhopProducts } from '@/lib/whop/products';
import { UpgradeBanner } from '@/components/ui/plan-usage';
import { isUpgradeRequired } from '@/types';
import type { AutomationStepType } from '@prisma/client';
import type { WhopProduct } from '@/lib/whop/products';

// ── Types ─────────────────────────────────────────────────────────────────

type StepBaseType = 'DELAY' | 'SEND_EMAIL' | 'ADD_TAG' | 'REMOVE_TAG' | 'WEBHOOK';
type AllStepType = 'TRIGGER' | 'CONDITION' | StepBaseType;

interface EmbeddedStep {
  id: string;
  type: StepBaseType;
  config: Record<string, unknown>;
}

interface ConditionStepData {
  id: string;
  type: 'CONDITION';
  config: {
    field: string;
    tagName?: string;
    days?: number;
    trueBranch: EmbeddedStep[];
    falseBranch: EmbeddedStep[];
  };
}

interface SimpleStepData {
  id: string;
  type: 'TRIGGER' | StepBaseType;
  config: Record<string, unknown>;
}

type FlowStep = SimpleStepData | ConditionStepData;

// ── Constants ─────────────────────────────────────────────────────────────

const STEP_META: Record<AllStepType, { label: string; icon: string; color: string; bgColor: string }> = {
  TRIGGER:    { label: 'Trigger',    icon: '⚡', color: '#0284C7', bgColor: '#F0F9FF' },
  DELAY:      { label: 'Wait',       icon: '⏱', color: '#7C3AED', bgColor: '#F5F3FF' },
  SEND_EMAIL: { label: 'Send email', icon: '📧', color: '#059669', bgColor: '#F0FDF4' },
  ADD_TAG:    { label: 'Add tag',    icon: '🏷', color: '#D97706', bgColor: '#FFFBEB' },
  REMOVE_TAG: { label: 'Remove tag', icon: '✂️', color: '#DC2626', bgColor: '#FEF2F2' },
  WEBHOOK:    { label: 'Webhook',    icon: '🔗', color: '#6B7280', bgColor: '#F9FAFB' },
  CONDITION:  { label: 'If / Else',  icon: '◇', color: '#7C3AED', bgColor: '#F5F3FF' },
};

const TRIGGER_OPTIONS = [
  { group: 'Whop events', options: [
    { value: 'membership_activated',   label: '👋 Membership activated' },
    { value: 'membership_deactivated', label: '❌ Membership canceled' },
    { value: 'payment_succeeded',      label: '💳 Payment succeeded' },
    { value: 'product_purchased',      label: '🛍 Product purchased' },
    { value: 'product_not_purchased',  label: '⏰ Product not purchased' },
  ]},
  { group: 'Other', options: [
    { value: 'new_member', label: '➕ New member synced' },
    { value: 'api',        label: '🔌 API trigger' },
    { value: 'manual',     label: '🖱 Manual' },
  ]},
];

const CONDITION_FIELDS = [
  { value: 'opened_last_email',  label: 'Opened an email in last 7 days' },
  { value: 'clicked_last_email', label: 'Clicked a link in last 7 days' },
  { value: 'any_email_opened',   label: 'Has ever opened an email' },
  { value: 'opened_in_days',     label: 'Opened an email in last N days' },
  { value: 'has_tag',            label: 'Has a specific tag' },
];

let _id = 0;
function uid() { return `step_${++_id}_${Date.now()}`; }

function defaultConfig(type: AllStepType): Record<string, unknown> {
  switch (type) {
    case 'TRIGGER':    return { triggerType: 'membership_activated' };
    case 'DELAY':      return { amount: 1, unit: 'days' };
    case 'SEND_EMAIL': return { subject: '', html: '' };
    case 'ADD_TAG':    return { tagName: '' };
    case 'REMOVE_TAG': return { tagName: '' };
    case 'WEBHOOK':    return { url: '', method: 'POST' };
    case 'CONDITION':  return { field: 'opened_last_email', trueBranch: [], falseBranch: [] };
    default:           return {};
  }
}

// ── Hook: flow state management ────────────────────────────────────────────

function useFlowState(initial: FlowStep[]) {
  const [steps, setSteps] = useState<FlowStep[]>(initial);

  const addAt = useCallback((afterId: string | null, type: AllStepType) => {
    const newStep: FlowStep =
      type === 'CONDITION'
        ? { id: uid(), type: 'CONDITION', config: { field: 'opened_last_email', trueBranch: [], falseBranch: [] } }
        : { id: uid(), type: type as StepBaseType | 'TRIGGER', config: defaultConfig(type) };

    setSteps((prev) => {
      if (afterId === null) return [newStep, ...prev];
      const idx = prev.findIndex((s) => s.id === afterId);
      if (idx === -1) return [...prev, newStep];
      const next = [...prev];
      next.splice(idx + 1, 0, newStep);
      return next;
    });
  }, []);

  const addToBranch = useCallback((condId: string, branch: 'true' | 'false', type: StepBaseType) => {
    const newStep: EmbeddedStep = { id: uid(), type, config: defaultConfig(type) as Record<string, unknown> };
    setSteps((prev) =>
      prev.map((s) => {
        if (s.id !== condId || s.type !== 'CONDITION') return s;
        const c = s as ConditionStepData;
        const key = branch === 'true' ? 'trueBranch' : 'falseBranch';
        return { ...c, config: { ...c.config, [key]: [...c.config[key], newStep] } };
      })
    );
  }, []);

  const updateStep = useCallback((id: string, config: Record<string, unknown>) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, config } : s)));
  }, []);

  const updateBranchStep = useCallback(
    (condId: string, branch: 'true' | 'false', stepId: string, config: Record<string, unknown>) => {
      setSteps((prev) =>
        prev.map((s) => {
          if (s.id !== condId || s.type !== 'CONDITION') return s;
          const c = s as ConditionStepData;
          const key = branch === 'true' ? 'trueBranch' : 'falseBranch';
          return {
            ...c,
            config: {
              ...c.config,
              [key]: c.config[key].map((bs) => (bs.id === stepId ? { ...bs, config } : bs)),
            },
          };
        })
      );
    },
    []
  );

  const removeStep = useCallback((id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const removeBranchStep = useCallback((condId: string, branch: 'true' | 'false', stepId: string) => {
    setSteps((prev) =>
      prev.map((s) => {
        if (s.id !== condId || s.type !== 'CONDITION') return s;
        const c = s as ConditionStepData;
        const key = branch === 'true' ? 'trueBranch' : 'falseBranch';
        return { ...c, config: { ...c.config, [key]: c.config[key].filter((bs) => bs.id !== stepId) } };
      })
    );
  }, []);

  return { steps, addAt, addToBranch, updateStep, updateBranchStep, removeStep, removeBranchStep };
}

// ── Add Step Picker ────────────────────────────────────────────────────────

function AddStepPicker({
  onAdd,
  allowCondition = true,
  compact = false,
}: {
  onAdd: (type: AllStepType | StepBaseType) => void;
  allowCondition?: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const actions: { type: AllStepType; label: string; icon: string }[] = [
    { type: 'SEND_EMAIL', label: 'Send email', icon: '📧' },
    { type: 'DELAY',      label: 'Wait',        icon: '⏱' },
    { type: 'ADD_TAG',    label: 'Add tag',      icon: '🏷' },
    { type: 'REMOVE_TAG', label: 'Remove tag',   icon: '✂️' },
    { type: 'WEBHOOK',    label: 'Webhook',       icon: '🔗' },
    ...(allowCondition ? [{ type: 'CONDITION' as AllStepType, label: 'If / Else', icon: '◇' }] : []),
  ];

  if (!open) {
    return (
      <div className="flex justify-center">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all hover:opacity-100"
          style={{
            border: '1.5px dashed var(--sidebar-border)',
            color: 'var(--text-tertiary)',
            background: 'none',
            opacity: compact ? 0.6 : 0.8,
          }}
        >
          <span style={{ fontSize: 14 }}>+</span>
          Add step
        </button>
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <div
        className="rounded-xl p-3 shadow-lg"
        style={{ background: 'var(--surface-card)', border: '1px solid var(--sidebar-border)', minWidth: 220 }}
      >
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
          Add step
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {actions.map((a) => {
            const meta = STEP_META[a.type];
            return (
              <button
                key={a.type}
                onClick={() => { onAdd(a.type); setOpen(false); }}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors"
                style={{ background: meta.bgColor, color: meta.color }}
              >
                <span>{a.icon}</span>
                {a.label}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setOpen(false)}
          className="mt-2 w-full rounded-lg py-1.5 text-xs transition-colors"
          style={{ color: 'var(--text-tertiary)', background: 'none' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Connector Line ─────────────────────────────────────────────────────────

function Connector({ color = 'var(--sidebar-border)' }: { color?: string }) {
  return (
    <div className="flex justify-center">
      <div style={{ width: 2, height: 24, background: color, borderRadius: 1 }} />
    </div>
  );
}

// ── Step Config Editors ────────────────────────────────────────────────────

function TriggerConfig({
  config, onChange, products,
}: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void; products: WhopProduct[] }) {
  const t = String(config.triggerType ?? 'membership_activated');
  const needsProduct = ['product_purchased', 'product_not_purchased'].includes(t);
  return (
    <div className="space-y-3 mt-3">
      <select
        value={t}
        onChange={(e) => onChange({ ...config, triggerType: e.target.value })}
        className="w-full rounded-lg px-3 py-2 text-xs"
        style={{ border: '1px solid var(--sidebar-border)', background: 'var(--surface-app)', color: 'var(--text-primary)' }}
      >
        {TRIGGER_OPTIONS.map((g) => (
          <optgroup key={g.group} label={g.group}>
            {g.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </optgroup>
        ))}
      </select>
      {needsProduct && products.length > 0 && (
        <select
          value={String(config.productId ?? '')}
          onChange={(e) => onChange({ ...config, productId: e.target.value || undefined })}
          className="w-full rounded-lg px-3 py-2 text-xs"
          style={{ border: '1px solid var(--sidebar-border)', background: 'var(--surface-app)', color: 'var(--text-primary)' }}
        >
          <option value="">Any product</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      )}
      {t === 'product_not_purchased' && (
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>After</span>
          <input
            type="number" min={1} max={365}
            value={Number(config.daysThreshold ?? 7)}
            onChange={(e) => onChange({ ...config, daysThreshold: parseInt(e.target.value) || 7 })}
            className="w-16 rounded-lg px-2 py-1.5 text-xs text-center"
            style={{ border: '1px solid var(--sidebar-border)', background: 'var(--surface-app)', color: 'var(--text-primary)' }}
          />
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>days without purchase</span>
        </div>
      )}
    </div>
  );
}

function DelayConfigEditor({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  return (
    <div className="flex items-center gap-2 mt-3">
      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Wait</span>
      <input
        type="number" min={1}
        value={Number(config.amount ?? 1)}
        onChange={(e) => onChange({ ...config, amount: parseInt(e.target.value) || 1 })}
        className="w-16 rounded-lg px-2 py-1.5 text-xs text-center"
        style={{ border: '1px solid var(--sidebar-border)', background: 'var(--surface-app)', color: 'var(--text-primary)' }}
      />
      <select
        value={String(config.unit ?? 'days')}
        onChange={(e) => onChange({ ...config, unit: e.target.value })}
        className="flex-1 rounded-lg px-2 py-1.5 text-xs"
        style={{ border: '1px solid var(--sidebar-border)', background: 'var(--surface-app)', color: 'var(--text-primary)' }}
      >
        <option value="minutes">minutes</option>
        <option value="hours">hours</option>
        <option value="days">days</option>
      </select>
    </div>
  );
}

function SendEmailConfigEditor({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-2 mt-3">
      <input
        placeholder="Subject line — use {{firstName}} to personalise"
        value={String(config.subject ?? '')}
        onChange={(e) => onChange({ ...config, subject: e.target.value })}
        className="w-full rounded-lg px-3 py-2 text-xs"
        style={{ border: '1px solid var(--sidebar-border)', background: 'var(--surface-app)', color: 'var(--text-primary)' }}
      />
      <textarea
        placeholder="Email body HTML — keep it short and personal"
        rows={5}
        value={String(config.html ?? '')}
        onChange={(e) => onChange({ ...config, html: e.target.value })}
        className="w-full rounded-lg px-3 py-2 text-xs font-mono resize-none"
        style={{ border: '1px solid var(--sidebar-border)', background: 'var(--surface-app)', color: 'var(--text-primary)' }}
      />
    </div>
  );
}

function TagConfigEditor({
  config, onChange, label,
}: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void; label: string }) {
  return (
    <div className="mt-3">
      <input
        placeholder={label}
        value={String(config.tagName ?? '')}
        onChange={(e) => onChange({ ...config, tagName: e.target.value })}
        className="w-full rounded-lg px-3 py-2 text-xs"
        style={{ border: '1px solid var(--sidebar-border)', background: 'var(--surface-app)', color: 'var(--text-primary)' }}
      />
    </div>
  );
}

function WebhookConfigEditor({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-2 mt-3">
      <div className="flex gap-2">
        <select
          value={String(config.method ?? 'POST')}
          onChange={(e) => onChange({ ...config, method: e.target.value })}
          className="w-20 rounded-lg px-2 py-1.5 text-xs"
          style={{ border: '1px solid var(--sidebar-border)', background: 'var(--surface-app)', color: 'var(--text-primary)' }}
        >
          <option value="POST">POST</option>
          <option value="GET">GET</option>
        </select>
        <input
          placeholder="https://hooks.example.com/..."
          value={String(config.url ?? '')}
          onChange={(e) => onChange({ ...config, url: e.target.value })}
          className="flex-1 rounded-lg px-3 py-1.5 text-xs"
          style={{ border: '1px solid var(--sidebar-border)', background: 'var(--surface-app)', color: 'var(--text-primary)' }}
        />
      </div>
      {config.method === 'POST' && (
        <textarea
          placeholder={'JSON payload — use {{email}}, {{firstName}}'}
          rows={2}
          value={String(config.payload ?? '')}
          onChange={(e) => onChange({ ...config, payload: e.target.value })}
          className="w-full rounded-lg px-3 py-2 text-xs font-mono resize-none"
          style={{ border: '1px solid var(--sidebar-border)', background: 'var(--surface-app)', color: 'var(--text-primary)' }}
        />
      )}
    </div>
  );
}

function ConditionConfigEditor({
  config, onChange,
}: {
  config: ConditionStepData['config'];
  onChange: (c: ConditionStepData['config']) => void;
}) {
  return (
    <div className="space-y-3 mt-3">
      <div>
        <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Check whether contact…</label>
        <select
          value={config.field}
          onChange={(e) => onChange({ ...config, field: e.target.value })}
          className="w-full rounded-lg px-3 py-2 text-xs"
          style={{ border: '1px solid var(--sidebar-border)', background: 'var(--surface-app)', color: 'var(--text-primary)' }}
        >
          {CONDITION_FIELDS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </div>
      {config.field === 'has_tag' && (
        <input
          placeholder="Tag name"
          value={config.tagName ?? ''}
          onChange={(e) => onChange({ ...config, tagName: e.target.value })}
          className="w-full rounded-lg px-3 py-2 text-xs"
          style={{ border: '1px solid var(--sidebar-border)', background: 'var(--surface-app)', color: 'var(--text-primary)' }}
        />
      )}
      {config.field === 'opened_in_days' && (
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>In last</span>
          <input
            type="number" min={1} max={365}
            value={config.days ?? 30}
            onChange={(e) => onChange({ ...config, days: parseInt(e.target.value) || 30 })}
            className="w-16 rounded-lg px-2 py-1.5 text-xs text-center"
            style={{ border: '1px solid var(--sidebar-border)', background: 'var(--surface-app)', color: 'var(--text-primary)' }}
          />
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>days</span>
        </div>
      )}
    </div>
  );
}

// ── Step Summary (collapsed view) ─────────────────────────────────────────

function stepSummary(step: FlowStep | EmbeddedStep): string {
  const c = step.config as Record<string, unknown>;
  switch (step.type) {
    case 'TRIGGER':    return String(c.triggerType ?? '').replace(/_/g, ' ');
    case 'DELAY':      return `Wait ${c.amount} ${c.unit}`;
    case 'SEND_EMAIL': return String(c.subject || 'No subject') ;
    case 'ADD_TAG':    return `Tag: ${c.tagName || 'not set'}`;
    case 'REMOVE_TAG': return `Remove tag: ${c.tagName || 'not set'}`;
    case 'WEBHOOK':    return String(c.url || 'No URL');
    case 'CONDITION': {
      const cf = c as ConditionStepData['config'];
      const field = CONDITION_FIELDS.find((f) => f.value === cf.field);
      return field?.label ?? cf.field;
    }
    default: return '';
  }
}

// ── Embedded Branch Node ───────────────────────────────────────────────────

function BranchNode({
  step, onUpdate, onRemove,
}: {
  step: EmbeddedStep;
  onUpdate: (config: Record<string, unknown>) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = STEP_META[step.type];

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: `1px solid ${meta.color}33`, background: meta.bgColor }}
    >
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <span style={{ fontSize: 13 }}>{meta.icon}</span>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-semibold" style={{ color: meta.color }}>{meta.label}</span>
          {!expanded && (
            <span className="block truncate text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {stepSummary(step)}
            </span>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="shrink-0 rounded p-1 text-xs transition-colors hover:bg-black/10"
          style={{ color: '#DC2626' }}
        >
          ✕
        </button>
      </div>
      {expanded && (
        <div className="border-t px-3 pb-3" style={{ borderColor: `${meta.color}22` }}>
          {step.type === 'DELAY' && <DelayConfigEditor config={step.config} onChange={onUpdate} />}
          {step.type === 'SEND_EMAIL' && <SendEmailConfigEditor config={step.config} onChange={onUpdate} />}
          {step.type === 'ADD_TAG' && <TagConfigEditor config={step.config} onChange={onUpdate} label="Tag name (e.g. buyer)" />}
          {step.type === 'REMOVE_TAG' && <TagConfigEditor config={step.config} onChange={onUpdate} label="Tag to remove" />}
          {step.type === 'WEBHOOK' && <WebhookConfigEditor config={step.config} onChange={onUpdate} />}
        </div>
      )}
    </div>
  );
}

// ── Branch Column ──────────────────────────────────────────────────────────

function BranchColumn({
  label, color, steps, onAddStep, onUpdate, onRemove,
}: {
  label: string;
  color: string;
  steps: EmbeddedStep[];
  onAddStep: (type: StepBaseType) => void;
  onUpdate: (stepId: string, config: Record<string, unknown>) => void;
  onRemove: (stepId: string) => void;
}) {
  return (
    <div className="flex-1 min-w-0 rounded-xl p-3 space-y-2" style={{ background: `${color}0A`, border: `1.5px solid ${color}33` }}>
      <div className="flex items-center gap-1.5 mb-2">
        <div className="h-2 w-2 rounded-full" style={{ background: color }} />
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color }}>{label}</span>
      </div>

      {steps.length === 0 && (
        <p className="text-center py-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          No steps — branch completes immediately
        </p>
      )}

      {steps.map((step) => (
        <BranchNode
          key={step.id}
          step={step}
          onUpdate={(config) => onUpdate(step.id, config)}
          onRemove={() => onRemove(step.id)}
        />
      ))}

      <AddStepPicker
        allowCondition={false}
        compact
        onAdd={(type) => onAddStep(type as StepBaseType)}
      />
    </div>
  );
}

// ── Flow Node ──────────────────────────────────────────────────────────────

function FlowNode({
  step, onUpdate, onRemove, onAddAfter, onAddToBranch, onUpdateBranchStep, onRemoveBranchStep, products, isFirst,
}: {
  step: FlowStep;
  onUpdate: (config: Record<string, unknown>) => void;
  onRemove: () => void;
  onAddAfter: (type: AllStepType) => void;
  onAddToBranch: (branch: 'true' | 'false', type: StepBaseType) => void;
  onUpdateBranchStep: (branch: 'true' | 'false', stepId: string, config: Record<string, unknown>) => void;
  onRemoveBranchStep: (branch: 'true' | 'false', stepId: string) => void;
  products: WhopProduct[];
  isFirst: boolean;
}) {
  const [expanded, setExpanded] = useState(step.type === 'TRIGGER');
  const meta = STEP_META[step.type];

  if (step.type === 'CONDITION') {
    const cs = step as ConditionStepData;
    return (
      <>
        {/* Condition header node */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: `1.5px solid ${meta.color}44`, background: 'var(--surface-card)' }}
        >
          <div
            className="flex items-center gap-3 px-4 py-3 cursor-pointer"
            onClick={() => setExpanded((v) => !v)}
          >
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base"
              style={{ background: meta.bgColor }}
            >
              ◇
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: meta.color }}>If / Else condition</p>
              {!expanded && (
                <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                  {stepSummary(step)}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{expanded ? '▲' : '▼'}</span>
              {!isFirst && (
                <button
                  onClick={(e) => { e.stopPropagation(); onRemove(); }}
                  className="rounded p-1 text-xs transition-colors hover:bg-destructive/10"
                  style={{ color: '#DC2626' }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {expanded && (
            <div className="border-t px-4 pb-4" style={{ borderColor: 'var(--sidebar-border)' }}>
              <ConditionConfigEditor
                config={cs.config}
                onChange={(c) => onUpdate(c as Record<string, unknown>)}
              />
            </div>
          )}
        </div>

        {/* Two-column branches */}
        <div className="flex gap-3">
          <BranchColumn
            label="✓ True"
            color="#16A34A"
            steps={cs.config.trueBranch}
            onAddStep={(type) => onAddToBranch('true', type)}
            onUpdate={(sid, config) => onUpdateBranchStep('true', sid, config)}
            onRemove={(sid) => onRemoveBranchStep('true', sid)}
          />
          <BranchColumn
            label="✗ False"
            color="#DC2626"
            steps={cs.config.falseBranch}
            onAddStep={(type) => onAddToBranch('false', type)}
            onUpdate={(sid, config) => onUpdateBranchStep('false', sid, config)}
            onRemove={(sid) => onRemoveBranchStep('false', sid)}
          />
        </div>

        <Connector />
        <AddStepPicker onAdd={onAddAfter} />
      </>
    );
  }

  return (
    <>
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: `1px solid ${expanded ? meta.color + '44' : 'var(--sidebar-border)'}`, background: 'var(--surface-card)' }}
      >
        <div
          className="flex items-center gap-3 px-4 py-3 cursor-pointer"
          onClick={() => !isFirst && setExpanded((v) => !v)}
        >
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base"
            style={{ background: meta.bgColor }}
          >
            {meta.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: meta.color }}>
              {meta.label}
            </p>
            {!expanded && (
              <p className="text-sm truncate font-medium" style={{ color: 'var(--text-primary)' }}>
                {stepSummary(step) || <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>Click to configure</span>}
              </p>
            )}
          </div>
          {!isFirst && (
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              className="shrink-0 rounded p-1 text-xs transition-colors hover:bg-destructive/10"
              style={{ color: '#DC2626' }}
            >
              ✕
            </button>
          )}
        </div>

        {(expanded || step.type === 'TRIGGER') && (
          <div className="border-t px-4 pb-4" style={{ borderColor: 'var(--sidebar-border)' }}>
            {step.type === 'TRIGGER' && (
              <TriggerConfig config={step.config} onChange={onUpdate} products={products} />
            )}
            {step.type === 'DELAY' && <DelayConfigEditor config={step.config} onChange={onUpdate} />}
            {step.type === 'SEND_EMAIL' && <SendEmailConfigEditor config={step.config} onChange={onUpdate} />}
            {step.type === 'ADD_TAG' && <TagConfigEditor config={step.config} onChange={onUpdate} label="Tag name (e.g. buyer)" />}
            {step.type === 'REMOVE_TAG' && <TagConfigEditor config={step.config} onChange={onUpdate} label="Tag to remove" />}
            {step.type === 'WEBHOOK' && <WebhookConfigEditor config={step.config} onChange={onUpdate} />}
          </div>
        )}
      </div>

      <Connector />
      <AddStepPicker onAdd={onAddAfter} />
    </>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function NewWorkflowPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [upgradePayload, setUpgradePayload] = useState<Parameters<typeof UpgradeBanner>[0]['payload'] | null>(null);
  const [products, setProducts] = useState<WhopProduct[]>([]);

  const { steps, addAt, addToBranch, updateStep, updateBranchStep, removeStep, removeBranchStep } = useFlowState([
    { id: uid(), type: 'TRIGGER', config: { triggerType: 'membership_activated' } },
  ]);

  useEffect(() => {
    fetch('/api/workspace')
      .then((r) => r.ok ? r.json() : null)
      .then(async (j) => {
        if (j?.workspaceId || j?.id) {
          const prods = await getWhopProducts(j.workspaceId ?? j.id);
          setProducts(prods);
        }
      })
      .catch(() => {});
  }, []);

  function validate(): boolean {
    if (!name.trim()) { setError('Give your workflow a name'); return false; }
    if (steps.length < 2) { setError('Add at least one action after the trigger'); return false; }
    const hasTrigger = steps.some((s) => s.type === 'TRIGGER');
    if (!hasTrigger) { setError('The flow must start with a trigger'); return false; }
    setError('');
    return true;
  }

  function handleSave() {
    if (!validate()) return;
    startTransition(async () => {
      const wf = await createWorkflow(name.trim());
      if (!wf.success) {
        if (isUpgradeRequired(wf)) setUpgradePayload(wf);
        else setError(wf.error ?? 'Failed to create workflow');
        return;
      }
      for (let i = 0; i < steps.length; i++) {
        await addStep(
          wf.data.workflowId,
          steps[i].type as AutomationStepType,
          steps[i].config,
          i
        );
      }
      router.push(`/dashboard/automation/${wf.data.workflowId}`);
    });
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '2rem', maxWidth: 900, margin: '0 auto' }}>

      {/* Left: Flow */}
      <div className="space-y-0">
        <div className="mb-6">
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', letterSpacing: '-0.03em' }}
          >
            New workflow
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Build your flow below — steps run in order top to bottom
          </p>
        </div>

        {/* Flow nodes */}
        <div className="space-y-0">
          {steps.map((step, i) => (
            <FlowNode
              key={step.id}
              step={step}
              isFirst={i === 0}
              products={products}
              onUpdate={(config) => updateStep(step.id, config)}
              onRemove={() => removeStep(step.id)}
              onAddAfter={(type) => addAt(step.id, type)}
              onAddToBranch={(branch, type) => addToBranch(step.id, branch, type)}
              onUpdateBranchStep={(branch, stepId, config) => updateBranchStep(step.id, branch, stepId, config)}
              onRemoveBranchStep={(branch, stepId) => removeBranchStep(step.id, branch, stepId)}
            />
          ))}
        </div>

        {/* End cap */}
        <div className="flex justify-center pt-2">
          <div
            className="rounded-full px-4 py-1.5 text-xs font-medium"
            style={{ background: 'var(--surface-app)', color: 'var(--text-tertiary)', border: '1px solid var(--sidebar-border)' }}
          >
            Flow ends
          </div>
        </div>
      </div>

      {/* Right: Sidebar */}
      <div className="space-y-4">
        <div
          className="sticky top-8 rounded-xl p-5 space-y-4"
          style={{ background: 'var(--surface-card)', border: '1px solid var(--sidebar-border)' }}
        >
          <div>
            <label className="mb-1.5 block text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
              Workflow name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Welcome new members"
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
              style={{
                border: '1.5px solid var(--sidebar-border)',
                background: 'var(--surface-app)',
                color: 'var(--text-primary)',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--brand)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--sidebar-border)')}
            />
          </div>

          {/* Step count summary */}
          <div className="rounded-lg px-3 py-3 space-y-1.5" style={{ background: 'var(--surface-app)' }}>
            <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Flow summary</p>
            {steps.map((s) => {
              const meta = STEP_META[s.type];
              return (
                <div key={s.id} className="flex items-center gap-2">
                  <span style={{ fontSize: 12 }}>{meta.icon}</span>
                  <span className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                    {meta.label}: {stepSummary(s) || '—'}
                  </span>
                </div>
              );
            })}
          </div>

          {upgradePayload && <UpgradeBanner payload={upgradePayload} />}
          {error && <p className="text-xs rounded-lg px-3 py-2 bg-red-50 text-red-600 border border-red-200">{error}</p>}

          <button
            onClick={handleSave}
            disabled={isPending || steps.length < 2}
            className="w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40"
            style={{ background: 'var(--brand)', boxShadow: '0 2px 8px rgba(34,197,94,0.22)' }}
          >
            {isPending ? 'Saving…' : 'Save workflow'}
          </button>

          <button
            onClick={() => router.push('/dashboard/automation')}
            className="w-full rounded-lg py-2 text-xs transition-colors"
            style={{ color: 'var(--text-secondary)', background: 'none' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
