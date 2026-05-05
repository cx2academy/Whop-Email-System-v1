'use client';

/**
 * app/dashboard/settings/billing-success-banner.tsx
 *
 * Shown on the settings page when returning from a successful Whop
 * billing checkout. The `message` prop comes from the `billing_success`
 * search param set by /api/whop/billing-success.
 *
 * Example URLs that render this banner:
 *   /dashboard/settings?billing_success=plan_upgraded
 *   /dashboard/settings?billing_success=addon_applied
 */

import { useState } from 'react';
import { CheckCircleIcon, XIcon } from 'lucide-react';

interface BillingSuccessBannerProps {
  message: string;
}

const MESSAGE_LABELS: Record<string, { title: string; body: string }> = {
  plan_upgraded: {
    title: 'Plan upgraded successfully!',
    body: 'Your new plan is active. Limits and features have been updated.',
  },
  addon_applied: {
    title: 'Add-on applied!',
    body: 'Your extra credits or quota have been added to your account.',
  },
};

function getLabel(message: string): { title: string; body: string } {
  return (
    MESSAGE_LABELS[message] ?? {
      title: 'Payment successful!',
      body: 'Your account has been updated.',
    }
  );
}

export function BillingSuccessBanner({ message }: BillingSuccessBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const { title, body } = getLabel(message);

  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3"
    >
      <CheckCircleIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-400" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-emerald-400">{title}</p>
        <p className="mt-0.5 text-xs text-zinc-400">{body}</p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="flex-shrink-0 rounded p-0.5 text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <XIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
