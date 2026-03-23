'use client';

/**
 * app/dashboard/automation/new/page.tsx
 * Create a new automation workflow with steps.
 * Includes Whop-native trigger types and product picker.
 */

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createWorkflow, addStep } from '@/lib/automation/actions';
import { getWhopProducts } from '@/lib/whop/products';
import { UpgradeBanner } from '@/components/ui/plan-usage';
import { isUpgradeRequired } from '@/types';
import type { AutomationStepType } from '@prisma/client';
import type { WhopProduct } from '@/lib/whop/products';

// ── Trigger config ────────────────────────────────────────────────────────────

const TRIGGER_GROUPS = [
  {
    label: 'Whop events',
    options: [
      { value: 'membership_activated',   label: '👋 Membership activated',     desc: 'Someone joins or reactivates in your community' },
      { value: 'membership_deactivated', label: '👋 Membership canceled',       desc: 'Someone cancels or their membership expires' },
      { value: 'payment_succeeded',      label: '💳 Payment succeeded',         desc: 'Any successful payment in your community' },
      { value: 'product_purchased',      label: '🛍 Specific product purchased', desc: 'A specific product or plan is purchased' },
      { value: 'product_not_purchased',  label: '⏰ Product not purchased',      desc: 'Member hasn\'t bought a product after X days' },
    ],
  },
  {
    label: 'Other',
    options: [
      { value: 'new_member', label: '➕ New member synced', desc: 'Contact is added via member sync' },
      { value: 'api',        label: '🔌 API trigger',        desc: 'Triggered via the REST API' },
      { value: 'manual',     label: '🖱 Manual trigger',      desc: 'Triggered manually from the dashboard' },
    ],
  },
];

const PRODUCT_TRIGGERS = new Set(['product_purchased', 'product_not_purchased']);

interface StepDraft {
  type: AutomationStepType;
  config: Record<string, unknown>;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function NewWorkflowPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name,        setName]        = useState('');
  const [description, setDescription] = useState('');
  const [steps,       setSteps]       = useState<StepDraft[]>([
    { type: 'TRIGGER', config: { triggerType: 'membership_activated' } },
  ]);
  const [error,          setError]          = useState('');
  const [upgradePayload, setUpgradePayload] = useState<Parameters<typeof UpgradeBanner>[0]['payload'] | null>(null);
  const [products,       setProducts]       = useState<WhopProduct[]>([]);
  const [workspaceId,    setWorkspaceId]    = useState('');

  // Fetch workspace ID + products on mount
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/workspace');
        if (res.ok) {
          const json = await res.json();
          const wsId = json.workspaceId ?? json.id;
          if (wsId) {
            setWorkspaceId(wsId);
            const prods = await getWhopProducts(wsId);
            setProducts(prods);
          }
        }
      } catch { /* no products, no problem */ }
    }
    load();
  }, []);

  function addNewStep(type: AutomationStepType) {
    const defaults: Record<AutomationStepType, Record<string, unknown>> = {
      TRIGGER:    { triggerType: 'membership_activated' },
      DELAY:      { amount: 1, unit: 'days' },
      SEND_EMAIL: { subject: '', html: '' },
      ADD_TAG:    { tagName: '' },
      WEBHOOK:    { url: '', method: 'POST', payload: '' },
    };
    setSteps(prev => [...prev, { type, config: defaults[type] }]);
  }

  function updateStep(i: number, config: Record<string, unknown>) {
    setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, config } : s));
  }

  function removeStep(i: number) {
    setSteps(prev => prev.filter((_, idx) => idx !== i));
  }

  function handleSave() {
    if (!name.trim()) { setError('Workflow name is required'); return; }
    if (steps.length < 2) { setError('Add at least one action after the trigger'); return; }
    setError('');

    startTransition(async () => {
      const wf = await createWorkflow(name.trim(), description.trim() || undefined);
      if (!wf.success) {
        if (isUpgradeRequired(wf)) setUpgradePayload(wf);
        else setError(wf.error ?? 'Failed');
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
        <h1 className="text-2xl font-bold" style={{ fontFamily:'var(--font-display)', color:'var(--text-primary)' }}>New Workflow</h1>
        <p className="mt-1 text-sm" style={{ color:'var(--text-secondary)' }}>Build an automated email sequence triggered by Whop events</p>
      </div>

      {/* Name + description */}
      <div className="space-y-3 rounded-xl p-5" style={{ background:'var(--surface-card)', border:'1px solid var(--sidebar-border)' }}>
        <div>
          <label className="mb-1.5 block text-sm font-medium" style={{ color:'var(--text-primary)' }}>Workflow name</label>
          <input
            value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. Welcome new members"
            className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
            style={{ border:'1.5px solid var(--sidebar-border)', background:'var(--surface-card)', color:'var(--text-primary)' }}
            onFocus={e => (e.target.style.borderColor='var(--brand)')}
            onBlur={e => (e.target.style.borderColor='var(--sidebar-border)')}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium" style={{ color:'var(--text-primary)' }}>
            Description <span style={{ color:'var(--text-tertiary)', fontWeight:400 }}>(optional)</span>
          </label>
          <input
            value={description} onChange={e => setDescription(e.target.value)}
            placeholder="What does this workflow do?"
            className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
            style={{ border:'1.5px solid var(--sidebar-border)', background:'var(--surface-card)', color:'var(--text-primary)' }}
            onFocus={e => (e.target.style.borderColor='var(--brand)')}
            onBlur={e => (e.target.style.borderColor='var(--sidebar-border)')}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold" style={{ color:'var(--text-primary)' }}>Steps</h2>
        {steps.map((step, i) => (
          <StepEditor
            key={i} index={i} step={step} products={products}
            onChange={config => updateStep(i, config)}
            onRemove={i > 0 ? () => removeStep(i) : undefined}
          />
        ))}

        {/* Add step buttons */}
        <div className="flex flex-wrap gap-2 pt-1">
          {(['DELAY', 'SEND_EMAIL', 'ADD_TAG', 'WEBHOOK'] as AutomationStepType[]).map(t => {
            const labels: Record<string, string> = { DELAY:'Delay', SEND_EMAIL:'Send Email', ADD_TAG:'Add Tag', WEBHOOK:'Webhook' };
            return (
              <button key={t} onClick={() => addNewStep(t)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                style={{ border:'1px dashed var(--sidebar-border)', color:'var(--text-secondary)', background:'none' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor='var(--brand)'; (e.currentTarget as HTMLElement).style.color='var(--brand)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor='var(--sidebar-border)'; (e.currentTarget as HTMLElement).style.color='var(--text-secondary)'; }}
              >
                + {labels[t]}
              </button>
            );
          })}
        </div>
      </div>

      {upgradePayload && <UpgradeBanner payload={upgradePayload} />}
      {error && <p className="text-sm" style={{ color:'#DC2626' }}>{error}</p>}

      <div className="flex gap-3">
        <button onClick={handleSave} disabled={isPending}
          className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
          style={{ background:'var(--brand)' }}>
          {isPending ? 'Saving…' : 'Save workflow'}
        </button>
        <button onClick={() => router.push('/dashboard/automation')}
          className="rounded-lg px-5 py-2.5 text-sm font-medium transition-colors"
          style={{ border:'1px solid var(--sidebar-border)', color:'var(--text-secondary)', background:'none' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── StepEditor ────────────────────────────────────────────────────────────────

function StepEditor({ index, step, products, onChange, onRemove }: {
  index:    number;
  step:     StepDraft;
  products: WhopProduct[];
  onChange: (c: Record<string, unknown>) => void;
  onRemove?: () => void;
}) {
  const labels: Record<AutomationStepType, string> = {
    TRIGGER:'Trigger', DELAY:'Delay', SEND_EMAIL:'Send Email', ADD_TAG:'Add Tag', WEBHOOK:'Webhook',
  };

  const triggerType = String(step.config.triggerType ?? '');
  const needsProduct = PRODUCT_TRIGGERS.has(triggerType);

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background:'var(--surface-card)', border:'1px solid var(--sidebar-border)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background:'var(--brand)' }}>
            {index + 1}
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color:'var(--text-tertiary)' }}>
            {labels[step.type]}
          </span>
        </div>
        {onRemove && (
          <button onClick={onRemove} className="text-xs hover:underline" style={{ color:'#EF4444' }}>Remove</button>
        )}
      </div>

      {/* Trigger */}
      {step.type === 'TRIGGER' && (
        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium" style={{ color:'var(--text-secondary)' }}>Trigger event</label>
            <select
              value={triggerType}
              onChange={e => onChange({ ...step.config, triggerType: e.target.value, productId: undefined, daysThreshold: undefined })}
              className="w-full rounded-lg px-3 py-2 text-sm"
              style={{ border:'1px solid var(--sidebar-border)', background:'var(--surface-card)', color:'var(--text-primary)' }}
            >
              {TRIGGER_GROUPS.map(group => (
                <optgroup key={group.label} label={group.label}>
                  {group.options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            {/* Description */}
            {(() => {
              const opt = TRIGGER_GROUPS.flatMap(g => g.options).find(o => o.value === triggerType);
              return opt ? <p className="mt-1.5 text-xs" style={{ color:'var(--text-tertiary)' }}>{opt.desc}</p> : null;
            })()}
          </div>

          {/* Product picker */}
          {needsProduct && (
            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color:'var(--text-secondary)' }}>
                Product {triggerType === 'product_not_purchased' ? 'to check' : 'to match'}
                <span style={{ color:'var(--text-tertiary)', fontWeight:400, marginLeft:4 }}>(optional — leave blank to match any)</span>
              </label>
              {products.length > 0 ? (
                <select
                  value={String(step.config.productId ?? '')}
                  onChange={e => onChange({ ...step.config, productId: e.target.value || undefined })}
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{ border:'1px solid var(--sidebar-border)', background:'var(--surface-card)', color:'var(--text-primary)' }}
                >
                  <option value="">Any product</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.price ? ` — $${(p.price / 100).toFixed(2)}` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-xs rounded-lg px-3 py-2" style={{ border:'1px solid var(--sidebar-border)', color:'var(--text-tertiary)', background:'var(--surface-app)' }}>
                  No products found. Make sure your Whop API key is set in Settings.
                </p>
              )}
            </div>
          )}

          {/* Days threshold for product_not_purchased */}
          {triggerType === 'product_not_purchased' && (
            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color:'var(--text-secondary)' }}>
                Trigger if no purchase after
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number" min={1} max={365}
                  value={Number(step.config.daysThreshold ?? 7)}
                  onChange={e => onChange({ ...step.config, daysThreshold: parseInt(e.target.value) || 7 })}
                  className="w-24 rounded-lg px-3 py-2 text-sm"
                  style={{ border:'1px solid var(--sidebar-border)', background:'var(--surface-card)', color:'var(--text-primary)' }}
                />
                <span className="text-sm" style={{ color:'var(--text-secondary)' }}>days</span>
              </div>
              <p className="mt-1.5 text-xs" style={{ color:'var(--text-tertiary)' }}>
                Checked every 15 minutes by the automation processor
              </p>
            </div>
          )}
        </div>
      )}

      {/* Delay */}
      {step.type === 'DELAY' && (
        <div className="flex gap-2">
          <input type="number" min={1}
            value={Number(step.config.amount)}
            onChange={e => onChange({ ...step.config, amount: parseInt(e.target.value) || 1 })}
            className="w-24 rounded-lg px-3 py-2 text-sm"
            style={{ border:'1px solid var(--sidebar-border)', background:'var(--surface-card)', color:'var(--text-primary)' }}
          />
          <select value={String(step.config.unit)}
            onChange={e => onChange({ ...step.config, unit: e.target.value })}
            className="flex-1 rounded-lg px-3 py-2 text-sm"
            style={{ border:'1px solid var(--sidebar-border)', background:'var(--surface-card)', color:'var(--text-primary)' }}
          >
            <option value="minutes">Minutes</option>
            <option value="hours">Hours</option>
            <option value="days">Days</option>
          </select>
        </div>
      )}

      {/* Send Email */}
      {step.type === 'SEND_EMAIL' && (
        <div className="space-y-2">
          <input
            placeholder="Subject line (use {{firstName}} for personalization)"
            value={String(step.config.subject ?? '')}
            onChange={e => onChange({ ...step.config, subject: e.target.value })}
            className="w-full rounded-lg px-3 py-2 text-sm"
            style={{ border:'1px solid var(--sidebar-border)', background:'var(--surface-card)', color:'var(--text-primary)' }}
          />
          <textarea
            placeholder="Email HTML body"
            rows={4}
            value={String(step.config.html ?? '')}
            onChange={e => onChange({ ...step.config, html: e.target.value })}
            className="w-full rounded-lg px-3 py-2 text-sm font-mono resize-none"
            style={{ border:'1px solid var(--sidebar-border)', background:'var(--surface-card)', color:'var(--text-primary)' }}
          />
        </div>
      )}

      {/* Add Tag */}
      {step.type === 'ADD_TAG' && (
        <input
          placeholder="Tag name (e.g. buyer, warm-lead)"
          value={String(step.config.tagName ?? '')}
          onChange={e => onChange({ ...step.config, tagName: e.target.value })}
          className="w-full rounded-lg px-3 py-2 text-sm"
          style={{ border:'1px solid var(--sidebar-border)', background:'var(--surface-card)', color:'var(--text-primary)' }}
        />
      )}

      {/* Webhook */}
      {step.type === 'WEBHOOK' && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <select value={String(step.config.method ?? 'POST')}
              onChange={e => onChange({ ...step.config, method: e.target.value })}
              className="w-24 rounded-lg px-3 py-2 text-sm"
              style={{ border:'1px solid var(--sidebar-border)', background:'var(--surface-card)', color:'var(--text-primary)' }}
            >
              <option value="POST">POST</option>
              <option value="GET">GET</option>
            </select>
            <input
              placeholder="https://hooks.example.com/..."
              value={String(step.config.url ?? '')}
              onChange={e => onChange({ ...step.config, url: e.target.value })}
              className="flex-1 rounded-lg px-3 py-2 text-sm"
              style={{ border:'1px solid var(--sidebar-border)', background:'var(--surface-card)', color:'var(--text-primary)' }}
            />
          </div>
          {step.config.method === 'POST' && (
            <textarea
              placeholder='JSON payload (use {{email}}, {{firstName}})'
              rows={2}
              value={String(step.config.payload ?? '')}
              onChange={e => onChange({ ...step.config, payload: e.target.value })}
              className="w-full rounded-lg px-3 py-2 text-sm font-mono resize-none"
              style={{ border:'1px solid var(--sidebar-border)', background:'var(--surface-card)', color:'var(--text-primary)' }}
            />
          )}
        </div>
      )}
    </div>
  );
}
