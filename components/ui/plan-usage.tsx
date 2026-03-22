'use client';

/**
 * components/ui/plan-usage.tsx
 *
 * All plan enforcement UI.
 *
 * KEY FIX: handleUpgrade() and handleAddon() now redirect to
 * result.checkoutUrl when the server returns one. Previously the
 * checkoutUrl was returned but silently ignored — so no payment
 * ever happened. This fix makes Whop checkout actually open.
 */

import { useState, useTransition, createContext, useContext } from 'react';
import { upgradePlan, purchaseAddon, ADDON_PACKAGES } from '@/lib/plans/actions';
import { PLANS, PLAN_ORDER, formatLimit, type PlanKey } from '@/lib/plans/config';
import type { WorkspaceUsage } from '@/lib/plans/gates';
import type { UpgradeRequiredPayload } from '@/lib/plans/gates';
import type { AddonPackageId } from '@/lib/plans/actions';

// ── Context ───────────────────────────────────────────────────────────────────

const UpgradeModalContext = createContext<{
  open: (payload?: Partial<UpgradeRequiredPayload>) => void;
}>({ open: () => {} });

export function UpgradeModalProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [payload, setPayload] = useState<Partial<UpgradeRequiredPayload> | undefined>();

  return (
    <UpgradeModalContext.Provider value={{ open: (p) => { setPayload(p); setVisible(true); } }}>
      {children}
      {visible && <UpgradeModal payload={payload} onClose={() => setVisible(false)} />}
    </UpgradeModalContext.Provider>
  );
}

export function useUpgradeModal() {
  return useContext(UpgradeModalContext);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ── UsageBar ──────────────────────────────────────────────────────────────────

export function UsageBar({
  label, used, limit, pct, unit = '',
}: {
  label: string; used: number; limit: number | null; pct: number; unit?: string;
}) {
  const color = pct >= 95 ? 'bg-destructive' : pct >= 80 ? 'bg-amber-500' : 'bg-primary';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">
          {used.toLocaleString()}{unit} / {formatLimit(limit, unit)}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

// ── UsageBarsWidget ───────────────────────────────────────────────────────────

export function UsageBarsWidget({ usage, compact = false }: { usage: WorkspaceUsage; compact?: boolean }) {
  const { open } = useUpgradeModal();

  return (
    <div className={`space-y-4 ${compact ? '' : 'rounded-lg border border-border bg-card p-5'}`}>
      {!compact && (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Plan usage</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              <span className="font-medium text-foreground">{usage.planName}</span> plan
            </p>
          </div>
          <button
            onClick={() => open()}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            Upgrade
          </button>
        </div>
      )}
      <UsageBar label="Emails this month" used={usage.emails.used} limit={usage.emails.limit} pct={usage.emails.pct} />
      <UsageBar label="Contacts" used={usage.contacts.used} limit={usage.contacts.limit} pct={usage.contacts.pct} />
      <UsageBar label="AI credits" used={usage.aiCredits.used} limit={usage.aiCredits.limit} pct={usage.aiCredits.pct} />
      {usage.automations.limit !== null && (
        <UsageBar label="Automations" used={usage.automations.used} limit={usage.automations.limit} pct={usage.automations.pct} />
      )}
    </div>
  );
}

// ── UpgradeBanner ─────────────────────────────────────────────────────────────

export function UpgradeBanner({ payload }: { payload: UpgradeRequiredPayload }) {
  const { open } = useUpgradeModal();

  return (
    <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3.5">
      <svg className="mt-0.5 h-5 w-5 shrink-0 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{payload.message}</p>
        {payload.currentUsage !== undefined && payload.limit !== undefined && payload.limit !== null && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {payload.currentUsage.toLocaleString()} / {payload.limit.toLocaleString()} used
          </p>
        )}
      </div>
      <button
        onClick={() => open(payload)}
        className="shrink-0 rounded-md bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 whitespace-nowrap"
      >
        Upgrade to {payload.suggestedPlan}
      </button>
    </div>
  );
}

// ── UpgradeModal ──────────────────────────────────────────────────────────────

type ModalTab = 'plans' | 'addons';

function UpgradeModal({
  payload, onClose,
}: {
  payload?: Partial<UpgradeRequiredPayload>;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<ModalTab>('plans');
  const [, startTransition] = useTransition();
  const [upgrading,  setUpgrading]  = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [message,    setMessage]    = useState('');

  // ── THE FIX: redirect to Whop checkout when URL is returned ──────────────
  async function handleUpgrade(planKey: PlanKey) {
    setUpgrading(planKey);
    setMessage('');
    const result = await upgradePlan(planKey);
    setUpgrading(null);

    if (!result.success) {
      setMessage(result.error ?? 'Upgrade failed. Try again.');
      return;
    }

    // If a Whop checkout URL came back, redirect there now
    if (result.checkoutUrl) {
      window.location.href = result.checkoutUrl;
      return;
    }

    // No checkout URL = dev-mode simulated upgrade
    setMessage('Plan updated.');
    setTimeout(onClose, 1200);
  }

  async function handleAddon(pkgId: AddonPackageId) {
    setPurchasing(pkgId);
    setMessage('');
    const result = await purchaseAddon(pkgId);
    setPurchasing(null);

    if (!result.success) {
      setMessage(result.error ?? 'Purchase failed.');
      return;
    }

    // Same fix for add-ons
    if (result.checkoutUrl) {
      window.location.href = result.checkoutUrl;
      return;
    }

    setMessage('Add-on applied.');
    setTimeout(onClose, 1200);
  }

  const suggestedKey = payload?.suggestedPlan
    ? PLAN_ORDER.find((k) => PLANS[k].name === payload.suggestedPlan)
    : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-2xl rounded-xl border border-border bg-card shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border px-6 py-5">
          <div>
            <p className="text-lg font-semibold text-foreground">Upgrade your plan</p>
            {payload?.message && (
              <p className="mt-1 text-sm text-muted-foreground">{payload.message}</p>
            )}
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-6">
          {(['plans', 'addons'] as ModalTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                'py-3 px-1 mr-6 text-sm font-medium border-b-2 transition-colors',
                tab === t
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              {t === 'plans' ? 'Plans' : 'Add-ons'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6">
          {tab === 'plans' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {PLAN_ORDER.map((key) => {
                const plan = PLANS[key];
                const isSuggested = key === suggestedKey;
                return (
                  <div
                    key={key}
                    className={[
                      'relative rounded-xl border p-5 transition-colors',
                      isSuggested
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border bg-background',
                    ].join(' ')}
                  >
                    {isSuggested && (
                      <span className="absolute -top-3 left-4 rounded-full bg-primary px-3 py-0.5 text-[11px] font-semibold text-primary-foreground">
                        Recommended
                      </span>
                    )}
                    {plan.popular && !isSuggested && (
                      <span className="absolute -top-3 left-4 rounded-full bg-muted border border-border px-3 py-0.5 text-[11px] font-medium text-muted-foreground">
                        Most popular
                      </span>
                    )}

                    <div className="mb-4">
                      <p className="font-semibold text-foreground">{plan.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{plan.tagline}</p>
                      <p className="mt-2 text-2xl font-bold text-foreground">
                        {plan.monthlyUsd === 0 ? 'Free' : `$${plan.monthlyUsd}`}
                        {plan.monthlyUsd > 0 && <span className="text-sm font-normal text-muted-foreground">/mo</span>}
                      </p>
                    </div>

                    <div className="space-y-1.5 mb-5 text-xs text-muted-foreground">
                      <p><span className="font-medium text-foreground">{formatLimit(plan.limits.emailsPerMonth)}</span> emails/mo</p>
                      <p><span className="font-medium text-foreground">{formatLimit(plan.limits.contacts)}</span> contacts</p>
                      <p><span className="font-medium text-foreground">{formatLimit(plan.limits.automations)}</span> automations</p>
                      <p><span className="font-medium text-foreground">{formatLimit(plan.limits.aiCreditsMonthly)}</span> AI credits/mo</p>
                    </div>

                    {plan.monthlyUsd === 0 ? (
                      <div className="rounded-md border border-border px-3 py-2 text-center text-xs text-muted-foreground">
                        Current free tier
                      </div>
                    ) : (
                      <button
                        onClick={() => handleUpgrade(key)}
                        disabled={upgrading === key || !!upgrading}
                        className={[
                          'flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50',
                          isSuggested
                            ? 'bg-primary text-primary-foreground hover:opacity-90'
                            : 'border border-border text-foreground hover:bg-muted',
                        ].join(' ')}
                      >
                        {upgrading === key && <Spinner />}
                        {upgrading === key ? 'Opening checkout…' : `Upgrade to ${plan.name}`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'addons' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Add-ons stack on top of your plan limits. Email and contact add-ons renew monthly; AI credit add-ons are one-time.
              </p>

              {(['emails', 'contacts', 'ai_credits'] as const).map((type) => {
                const pkgs = Object.entries(ADDON_PACKAGES).filter(([, p]) => p.type === type);
                const typeLabel = type === 'emails' ? 'Extra emails' : type === 'contacts' ? 'Extra contacts' : 'AI credits';
                return (
                  <div key={type}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{typeLabel}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {pkgs.map(([id, pkg]) => (
                        <div key={id} className="flex items-center justify-between rounded-lg border border-border p-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">{pkg.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {type === 'ai_credits' ? 'one-time' : '/month'}
                            </p>
                          </div>
                          <button
                            onClick={() => handleAddon(id as AddonPackageId)}
                            disabled={!!purchasing}
                            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-50"
                          >
                            {purchasing === id && <Spinner />}
                            ${pkg.priceUsd.toFixed(2)}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {message && (
            <p className={`mt-4 text-sm text-center ${message.includes('fail') || message.includes('error') ? 'text-destructive' : 'text-green-600 dark:text-green-400'}`}>
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
