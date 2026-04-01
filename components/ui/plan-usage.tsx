'use client';

/**
 * components/ui/plan-usage.tsx
 *
 * All plan enforcement UI.
 */

import Link from 'next/link';
import { formatLimit } from '@/lib/plans/config';
import type { WorkspaceUsage } from '@/lib/plans/gates';
import type { UpgradeRequiredPayload } from '@/lib/plans/gates';

import { createContext, useContext, useState } from 'react';

// ── Upgrade Modal Context ─────────────────────────────────────────────────────

interface UpgradeModalContextType {
  isOpen: boolean;
  open: (suggestedPlan?: string) => void;
  close: () => void;
}

const UpgradeModalContext = createContext<UpgradeModalContextType | undefined>(undefined);

export function UpgradeModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Since we moved to a full-screen upgrade page, we can either:
  // 1. Keep the modal for quick upgrades
  // 2. Redirect to /upgrade when open() is called
  // For now, we'll just keep the state to avoid breaking existing code.
  
  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  return (
    <UpgradeModalContext.Provider value={{ isOpen, open, close }}>
      {children}
      {/* If you still want a modal, you'd render it here. 
          But we are prioritizing the full-screen /upgrade page. */}
    </UpgradeModalContext.Provider>
  );
}

export function useUpgradeModal() {
  const context = useContext(UpgradeModalContext);
  if (context === undefined) {
    // Return a fallback that redirects to /upgrade to ensure the app doesn't crash
    // and still achieves the goal of getting the user to the upgrade page.
    return {
      isOpen: false,
      open: () => { window.location.href = '/upgrade'; },
      close: () => {},
    };
  }
  return context;
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
          <Link
            href="/upgrade"
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            Upgrade
          </Link>
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
      <Link
        href="/upgrade"
        className="shrink-0 rounded-md bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 whitespace-nowrap"
      >
        Upgrade to {payload.suggestedPlan}
      </Link>
    </div>
  );
}
