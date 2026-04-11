'use client';

/**
 * components/ui/ai-credits.tsx
 *
 * All AI credit UI in one file:
 *
 *   AiCreditBadge      — compact badge for the topbar (shows balance)
 *   AiCreditWarning    — amber banner shown when credits are low (≤5)
 *   AiCreditBlocked    — full overlay shown when credits are zero
 *   AiCreditGate       — wrapper that blocks children when credits are zero
 *   usePurchaseCredits — hook that drives the purchase modal
 *
 * The topbar fetches balance server-side and passes it as a prop so there's
 * no client-side fetch on every render. Purchase triggers a POST and refreshes
 * the balance in local state.
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { LOW_CREDIT_THRESHOLD } from '@/lib/ai/credits';
import type { CreditPackageId } from '@/app/api/ai/purchase-credits/route';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CreditPackage {
  id: string;
  label: string;
  credits: number;
  priceUsd: number;
  popular: boolean;
}

interface AiCreditsProps {
  initialBalance: number;
}

// ---------------------------------------------------------------------------
// Spinner
// ---------------------------------------------------------------------------

function Spinner() {
  return (
    <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Purchase modal
// ---------------------------------------------------------------------------

function PurchaseModal({
  onClose,
  onPurchased,
}: {
  onClose: () => void;
  onPurchased: (newBalance: number) => void;
}) {
  const [packages, setPackages] = useState<CreditPackage[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Load packages on mount
  useState(() => {
    setLoading(true);
    fetch('/api/ai/purchase-credits')
      .then((r) => r.json())
      .then((data: { packages: CreditPackage[] }) => {
        setPackages(data.packages);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load packages.');
        setLoading(false);
      });
  });

  async function handlePurchase(pkgId: CreditPackageId) {
    setPurchasing(pkgId);
    setError('');
    try {
      const res = await fetch('/api/ai/purchase-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: pkgId }),
      });
      const data = await res.json() as { success?: boolean; checkoutUrl?: string; error?: string };
      if (!res.ok || !data.success || !data.checkoutUrl) {
        setError(data.error ?? 'Purchase failed.');
        return;
      }
      window.location.href = data.checkoutUrl;
    } catch {
      setError('Network error. Try again.');
    } finally {
      setPurchasing(null);
    }
  }

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="font-semibold text-foreground">Get AI Credits</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Credits power all AI features — subject optimizer, copy improver, template generator & more.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {loading && (
            <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
              <Spinner />
              <span className="text-sm">Loading packages…</span>
            </div>
          )}

          {!loading && packages && (
            <div className="space-y-3">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className={[
                    'relative flex items-center justify-between rounded-lg border p-4 transition-colors',
                    pkg.popular
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-background hover:bg-muted/30',
                  ].join(' ')}
                >
                  {pkg.popular && (
                    <span className="absolute -top-2.5 left-3 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                      Most popular
                    </span>
                  )}
                  <div>
                    <p className="font-medium text-foreground">{pkg.label}</p>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">{pkg.credits}</span> credits
                      <span className="mx-1.5 text-border">·</span>
                      ${(pkg.priceUsd / pkg.credits).toFixed(2)}/credit
                    </p>
                  </div>
                  <button
                    onClick={() => handlePurchase(pkg.id as CreditPackageId)}
                    disabled={!!purchasing}
                    className={[
                      'flex items-center gap-1.5 rounded-md px-3.5 py-2 text-sm font-semibold transition-opacity disabled:opacity-50',
                      pkg.popular
                        ? 'bg-primary text-primary-foreground hover:opacity-90'
                        : 'border border-border bg-background text-foreground hover:bg-muted',
                    ].join(' ')}
                  >
                    {purchasing === pkg.id && <Spinner />}
                    ${pkg.priceUsd}
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && (
            <p className="mt-3 text-sm text-destructive">{error}</p>
          )}

          {/* Note */}
          <p className="mt-4 text-xs text-muted-foreground text-center">
            Payment processing coming soon. Credits are added instantly for now.
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AiCreditBadge — compact badge for the topbar
// ---------------------------------------------------------------------------

export function AiCreditBadge({ initialBalance }: AiCreditsProps) {
  const [balance, setBalance] = useState(initialBalance);
  const [showModal, setShowModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams?.get('credit_success') === '1') {
      setShowSuccess(true);
      // Remove query param to avoid showing it again on refresh
      const url = new URL(window.location.href);
      url.searchParams.delete('credit_success');
      window.history.replaceState(null, '', url.toString());
      
      setTimeout(() => setShowSuccess(false), 5000);
    }
  }, [searchParams]);

  const isLow  = balance > 0 && balance <= LOW_CREDIT_THRESHOLD;
  const isEmpty = balance === 0;

  const badgeStyle = isEmpty
    ? 'border-destructive/50 bg-destructive/10 text-destructive'
    : isLow
    ? 'border-amber-400/50 bg-amber-400/10 text-amber-600 dark:text-amber-400'
    : 'border-border bg-muted/50 text-muted-foreground';

  return (
    <>
      {showSuccess && (
        <div className="fixed top-4 right-4 z-50 rounded-md bg-green-500 px-4 py-2 text-sm font-medium text-white shadow-lg animate-in fade-in slide-in-from-top-2">
          Credits added!
        </div>
      )}
      <button
        onClick={() => setShowModal(true)}
        className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted ${badgeStyle}`}
        title="AI Credits — click to get more"
      >
        {/* Sparkle icon */}
        <svg className="h-3 w-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
        {isEmpty ? 'No credits' : `${balance} credit${balance === 1 ? '' : 's'}`}
        {isLow && <span className="text-amber-500">!</span>}
      </button>

      {showModal && (
        <PurchaseModal
          onClose={() => setShowModal(false)}
          onPurchased={(newBalance) => {
            setBalance(newBalance);
            setShowModal(false);
          }}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// AiCreditWarning — amber banner, shown inline on pages with AI features
// ---------------------------------------------------------------------------

export function AiCreditWarning({ initialBalance }: AiCreditsProps) {
  const [balance, setBalance] = useState(initialBalance);
  const [dismissed, setDismissed] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const isLow  = balance > 0 && balance <= LOW_CREDIT_THRESHOLD;
  const isEmpty = balance === 0;

  if ((!isLow && !isEmpty) || dismissed) return null;

  return (
    <>
      <div
        className={[
          'flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm',
          isEmpty
            ? 'border-destructive/30 bg-destructive/5 text-destructive'
            : 'border-amber-300/50 bg-amber-50 text-amber-800 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-300',
        ].join(' ')}
      >
        <div className="flex items-center gap-2.5">
          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>
            {isEmpty
              ? 'You have no AI credits left. Purchase more to use AI features.'
              : `Low AI credits — ${balance} remaining. Top up to keep using AI features.`}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => setShowModal(true)}
            className={[
              'rounded-md px-3 py-1 text-xs font-semibold',
              isEmpty
                ? 'bg-destructive text-destructive-foreground hover:opacity-90'
                : 'bg-amber-600 text-white hover:opacity-90 dark:bg-amber-500',
            ].join(' ')}
          >
            Get credits
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="rounded p-1 opacity-60 hover:opacity-100"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {showModal && (
        <PurchaseModal
          onClose={() => setShowModal(false)}
          onPurchased={(newBalance) => {
            setBalance(newBalance);
            setShowModal(false);
          }}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// AiCreditGate — wraps AI feature UI and blocks interaction when empty
// Shows a semi-transparent overlay with a "Get credits" prompt
// ---------------------------------------------------------------------------

export function AiCreditGate({
  balance,
  featureLabel,
  cost,
  children,
}: {
  balance: number;
  featureLabel: string;
  cost: number;
  children: React.ReactNode;
}) {
  const [showModal, setShowModal] = useState(false);
  const [currentBalance, setCurrentBalance] = useState(balance);

  const isBlocked = cost > 0 && currentBalance < cost;

  if (!isBlocked) return <>{children}</>;

  return (
    <>
      <div className="relative">
        {/* Blurred children */}
        <div className="pointer-events-none select-none opacity-40 blur-[1px]">
          {children}
        </div>

        {/* Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-background/70 backdrop-blur-[2px]">
          <div className="rounded-xl border border-border bg-card p-5 text-center shadow-lg max-w-xs mx-4">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="font-semibold text-foreground text-sm">{featureLabel} needs {cost} credits</p>
            <p className="mt-1 text-xs text-muted-foreground">
              You have {currentBalance} credit{currentBalance !== 1 ? 's' : ''}. Get more to unlock this feature.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-3 w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Get credits
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <PurchaseModal
          onClose={() => setShowModal(false)}
          onPurchased={(newBalance) => {
            setCurrentBalance(newBalance);
            setShowModal(false);
          }}
        />
      )}
    </>
  );
}
