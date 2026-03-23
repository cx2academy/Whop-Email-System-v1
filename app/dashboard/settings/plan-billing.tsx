'use client';

/**
 * app/dashboard/settings/plan-billing.tsx
 *
 * Plan & Billing settings card.
 *
 * Shows:
 *   - Current plan name, price, and tagline
 *   - Four usage bars (emails, contacts, AI credits, automations)
 *   - Upgrade button (opens the shared UpgradeModal)
 *   - Add-ons section with quick-purchase buttons
 *   - Stripe billing note (placeholder until payment is wired)
 *
 * The UpgradeModalProvider must be an ancestor (it's in dashboard layout.tsx).
 */

import { useUpgradeModal, UsageBar } from '@/components/ui/plan-usage';
import { purchaseAddon, ADDON_PACKAGES } from '@/lib/plans/actions';
import { PLANS, formatLimit } from '@/lib/plans/config';
import type { WorkspaceUsage } from '@/lib/plans/gates';
import type { AddonPackageId } from '@/lib/plans/actions';
import { useState, useTransition } from 'react';

interface PlanBillingProps {
  usage: WorkspaceUsage;
  isAdmin: boolean;
}

function Spinner() {
  return (
    <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export function PlanBillingSettings({ usage, isAdmin }: PlanBillingProps) {
  const { open } = useUpgradeModal();
  const plan = PLANS[usage.plan];
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [addonMsg, setAddonMsg] = useState('');
  const [, startTransition] = useTransition();

  function handleAddon(pkgId: AddonPackageId) {
    setPurchasing(pkgId);
    setAddonMsg('');
    startTransition(async () => {
      const result = await purchaseAddon(pkgId);
      setPurchasing(null);
      if (result.success) {
        setAddonMsg('Add-on applied.');
        setTimeout(() => setAddonMsg(''), 3000);
      } else {
        setAddonMsg(result.error ?? 'Failed.');
      }
    });
  }

  return (
    <div className="space-y-6">

      {/* Current plan card */}
      <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-muted/30 px-5 py-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-base font-semibold text-foreground">{plan.name}</span>
            {plan.monthlyUsd === 0 ? (
              <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">Free</span>
            ) : (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                ${plan.monthlyUsd}/mo
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{plan.tagline}</p>

          {/* Key limits inline */}
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
            <span><span className="font-medium text-foreground">{formatLimit(plan.limits.emailsPerMonth)}</span> emails/mo</span>
            <span><span className="font-medium text-foreground">{formatLimit(plan.limits.contacts)}</span> contacts</span>
            <span><span className="font-medium text-foreground">{formatLimit(plan.limits.automations)}</span> automations</span>
            <span><span className="font-medium text-foreground">{formatLimit(plan.limits.aiCreditsMonthly)}</span> AI credits/mo</span>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={() => open()}
            className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            {plan.monthlyUsd === 0 ? 'Upgrade plan' : 'Change plan'}
          </button>
        )}
      </div>

      {/* Usage bars */}
      <div className="space-y-4">
        <p className="text-sm font-medium text-foreground">Usage this month</p>
        <UsageBar
          label="Emails sent"
          used={usage.emails.used}
          limit={usage.emails.limit}
          pct={usage.emails.pct}
        />
        <UsageBar
          label="Contacts"
          used={usage.contacts.used}
          limit={usage.contacts.limit}
          pct={usage.contacts.pct}
        />
        <UsageBar
          label="AI credits used"
          used={usage.aiCredits.used}
          limit={usage.aiCredits.limit}
          pct={usage.aiCredits.pct}
        />
        {usage.automations.limit !== null && (
          <UsageBar
            label="Active automations"
            used={usage.automations.used}
            limit={usage.automations.limit}
            pct={usage.automations.pct}
          />
        )}
      </div>

      {/* Add-ons */}
      {isAdmin && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Add-ons</p>
            <p className="text-xs text-muted-foreground">Stack on top of your plan limits</p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(Object.entries(ADDON_PACKAGES) as [AddonPackageId, typeof ADDON_PACKAGES[AddonPackageId]][]).map(([id, pkg]) => (
              <div key={id} className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{pkg.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {pkg.type === 'ai_credits' ? 'One-time' : 'Per month'}
                  </p>
                </div>
                <button
                  onClick={() => handleAddon(id)}
                  disabled={!!purchasing}
                  className="ml-3 flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-50"
                >
                  {purchasing === id && <Spinner />}
                  ${pkg.priceUsd.toFixed(2)}
                </button>
              </div>
            ))}
          </div>

          {addonMsg && (
            <p className={`text-xs ${addonMsg.includes('Failed') ? 'text-destructive' : 'text-green-600 dark:text-green-400'}`}>
              {addonMsg}
            </p>
          )}
        </div>
      )}

      {/* Stripe note */}
      <div className="rounded-md border border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Billing:</span> Payment processing is coming soon. Plan upgrades and add-ons are applied instantly for now.
        {plan.monthlyUsd > 0 && (
          <span className="ml-1">
            Your subscription will be managed via Stripe when billing goes live.
          </span>
        )}
      </div>
    </div>
  );
}
