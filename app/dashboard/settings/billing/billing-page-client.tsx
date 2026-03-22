'use client';

/**
 * app/dashboard/settings/billing/billing-page-client.tsx
 *
 * Full-page pricing UI.
 * Layout inspired by Claude's pricing page — 3 cards across, big headline,
 * clean feature lists — but in RevTray's light design system.
 */

import { useState } from 'react';
import { CheckIcon, ZapIcon, ArrowRightIcon } from 'lucide-react';
import { upgradePlan, purchaseAddon, ADDON_PACKAGES, type AddonPackageId } from '@/lib/plans/actions';
import { PLANS, PLAN_ORDER, formatLimit, type PlanKey } from '@/lib/plans/config';
import type { WorkspaceUsage } from '@/lib/plans/gates';

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  brand:       '#22C55E',
  brandHover:  '#16A34A',
  brandTint:   'rgba(34,197,94,0.08)',
  brandBorder: 'rgba(34,197,94,0.3)',
  text:        '#0D0F12',
  textSub:     '#5A6472',
  textHint:    '#9AA3AF',
  bg:          '#F7F8FA',
  card:        '#FFFFFF',
  border:      '#E6E8EC',
  green:       '#16A34A',
  greenBg:     '#F0FDF4',
  greenBorder: '#BBF7D0',
};

// ── Feature lists per plan ────────────────────────────────────────────────────
const FEATURES: Record<string, string[]> = {
  FREE: [
    '500 emails / month',
    '250 contacts',
    '10 AI credits / month',
    'Campaign builder',
    'Basic analytics',
  ],
  STARTER: [
    '5,000 emails / month',
    '2,500 contacts',
    '50 AI credits / month',
    '3 automation workflows',
    'Custom sending domain',
    'Full analytics (30 days)',
  ],
  GROWTH: [
    '25,000 emails / month',
    '10,000 contacts',
    '150 AI credits / month',
    'Unlimited automations',
    'Revenue attribution',
    'A/B testing',
    'Full analytics (1 year)',
    'API access',
    'AI deliverability rewrite',
  ],
  SCALE: [
    'Unlimited emails',
    'Unlimited contacts',
    '500 AI credits / month',
    'Unlimited automations',
    'All Growth features',
    'Multiple email providers',
    'Priority support',
    'Full analytics (unlimited)',
  ],
};

interface Props {
  currentPlan:    string;
  usage:          WorkspaceUsage;
  isAdmin:        boolean;
  billingStatus:  string;
  billingPeriodEnd: string | null;
}

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.7s linear infinite', flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.3"/>
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}

export function BillingPageClient({ currentPlan, usage, isAdmin, billingStatus, billingPeriodEnd }: Props) {
  const [upgrading,  setUpgrading]  = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error,      setError]      = useState('');

  // Show 4 plans: Free, Starter, Growth (highlighted), Scale
  const displayPlans = PLAN_ORDER.filter(k => ['FREE', 'STARTER', 'GROWTH', 'SCALE'].includes(k));

  async function handleUpgrade(planKey: PlanKey) {
    if (!isAdmin || planKey === 'FREE') return;
    setUpgrading(planKey);
    setError('');
    const result = await upgradePlan(planKey);
    setUpgrading(null);
    if (!result.success) { setError(result.error ?? 'Upgrade failed.'); return; }
    if (result.checkoutUrl) { window.location.href = result.checkoutUrl; return; }
    // Dev mode — simulated
  }

  async function handleAddon(pkgId: AddonPackageId) {
    if (!isAdmin) return;
    setPurchasing(pkgId);
    setError('');
    const result = await purchaseAddon(pkgId);
    setPurchasing(null);
    if (!result.success) { setError(result.error ?? 'Purchase failed.'); return; }
    if (result.checkoutUrl) { window.location.href = result.checkoutUrl; return; }
  }

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', padding: '48px 0 40px' }}>
        <h1 style={{
          fontFamily: "'Bricolage Grotesque', system-ui, sans-serif",
          fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 700,
          color: C.text, letterSpacing: '-0.035em', lineHeight: 1.1,
          margin: '0 0 14px',
        }}>
          Plans that grow with you
        </h1>
        <p style={{ fontSize: 17, color: C.textSub, margin: 0, lineHeight: 1.6 }}>
          Start free. Upgrade when you're ready. Cancel anytime.
        </p>

        {/* Current plan badge */}
        {billingStatus === 'active' && billingPeriodEnd && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            marginTop: 16, padding: '6px 14px', borderRadius: 99,
            background: C.greenBg, border: `1px solid ${C.greenBorder}`,
            fontSize: 13, color: C.green, fontWeight: 500,
          }}>
            <CheckIcon size={13} />
            {PLANS[currentPlan as PlanKey]?.name} plan active · renews {new Date(billingPeriodEnd).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* ── Plan cards ─────────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16,
        marginBottom: 56,
      }}>
        {displayPlans.map((key) => {
          const plan = PLANS[key];
          const isCurrent  = key === currentPlan;
          const isHighlight = key === 'GROWTH';
          const features = FEATURES[key] ?? [];

          return (
            <div
              key={key}
              style={{
                background: C.card,
                border: isHighlight
                  ? `2px solid ${C.brand}`
                  : `1px solid ${C.border}`,
                borderRadius: 16,
                padding: '28px 24px',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                boxShadow: isHighlight ? '0 4px 24px rgba(34,197,94,0.12)' : 'none',
              }}
            >
              {/* Most popular badge */}
              {isHighlight && (
                <div style={{
                  position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
                  background: C.brand, color: '#fff',
                  padding: '4px 16px', borderRadius: 99,
                  fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                }}>
                  Most popular
                </div>
              )}

              {/* Plan icon */}
              <div style={{
                width: 40, height: 40, borderRadius: 10, marginBottom: 16,
                background: isHighlight ? C.brandTint : C.bg,
                border: `1px solid ${isHighlight ? C.brandBorder : C.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ZapIcon size={18} color={isHighlight ? C.brand : C.textHint} />
              </div>

              {/* Name + tagline */}
              <p style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: '0 0 4px' }}>
                {plan.name}
              </p>
              <p style={{ fontSize: 13, color: C.textSub, margin: '0 0 20px', minHeight: 36 }}>
                {plan.tagline}
              </p>

              {/* Price */}
              <div style={{ marginBottom: 24 }}>
                {plan.monthlyUsd === 0 ? (
                  <p style={{ fontSize: 36, fontWeight: 800, color: C.text, margin: 0, letterSpacing: '-0.03em', fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}>
                    $0
                  </p>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                    <span style={{ fontSize: 36, fontWeight: 800, color: C.text, letterSpacing: '-0.03em', fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}>
                      ${plan.monthlyUsd}
                    </span>
                    <span style={{ fontSize: 14, color: C.textHint }}>USD / month</span>
                  </div>
                )}
              </div>

              {/* CTA */}
              {isCurrent ? (
                <div style={{
                  width: '100%', padding: '11px 0', borderRadius: 8,
                  border: `1px solid ${C.border}`, background: C.bg,
                  textAlign: 'center', fontSize: 14, fontWeight: 600,
                  color: C.textHint, marginBottom: 24, boxSizing: 'border-box',
                }}>
                  Current plan
                </div>
              ) : plan.monthlyUsd === 0 ? (
                <div style={{
                  width: '100%', padding: '11px 0', borderRadius: 8,
                  border: `1px solid ${C.border}`, background: C.bg,
                  textAlign: 'center', fontSize: 14, fontWeight: 600,
                  color: C.textHint, marginBottom: 24, boxSizing: 'border-box',
                }}>
                  Free tier
                </div>
              ) : (
                <button
                  onClick={() => handleUpgrade(key)}
                  disabled={!isAdmin || upgrading === key || !!upgrading}
                  style={{
                    width: '100%', padding: '11px 0', borderRadius: 8, border: 'none',
                    marginBottom: 24, cursor: isAdmin ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    fontSize: 14, fontWeight: 600,
                    background: isHighlight ? C.brand : C.text,
                    color: '#fff',
                    opacity: (upgrading && upgrading !== key) ? 0.5 : 1,
                    transition: 'all 0.15s',
                    boxSizing: 'border-box',
                  }}
                >
                  {upgrading === key ? (
                    <><Spinner /> Opening checkout…</>
                  ) : (
                    <>Get {plan.name} plan <ArrowRightIcon size={14} /></>
                  )}
                </button>
              )}

              {/* Feature list */}
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.textHint, margin: '0 0 10px' }}>
                  {key === 'FREE' ? 'Includes' : key === 'STARTER' ? 'Everything in Free, plus' : key === 'GROWTH' ? 'Everything in Starter, plus' : 'Everything in Growth, plus'}
                </p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {features.map((f, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <CheckIcon size={14} color={C.green} style={{ flexShrink: 0, marginTop: 1 }} />
                      <span style={{ fontSize: 13, color: C.textSub, lineHeight: 1.5 }}>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Usage bars ─────────────────────────────────────────────────────── */}
      <div style={{
        background: C.card, border: `1px solid ${C.border}`,
        borderRadius: 12, padding: '24px 28px', marginBottom: 40,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: C.text, margin: 0 }}>Current usage</p>
            <p style={{ fontSize: 13, color: C.textSub, margin: '2px 0 0' }}>
              {PLANS[currentPlan as PlanKey]?.name} plan · this month
            </p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
          {[
            { label: 'Emails sent',      used: usage.emails.used,      limit: usage.emails.limit,      pct: usage.emails.pct },
            { label: 'Contacts',         used: usage.contacts.used,    limit: usage.contacts.limit,    pct: usage.contacts.pct },
            { label: 'AI credits used',  used: usage.aiCredits.used,   limit: usage.aiCredits.limit,   pct: usage.aiCredits.pct },
            ...(usage.automations.limit !== null ? [
              { label: 'Automations', used: usage.automations.used, limit: usage.automations.limit, pct: usage.automations.pct }
            ] : []),
          ].map(({ label, used, limit, pct }) => (
            <div key={label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: C.textSub }}>{label}</span>
                <span style={{ fontSize: 12, color: C.textHint }}>
                  {used.toLocaleString()} / {formatLimit(limit)}
                </span>
              </div>
              <div style={{ height: 5, borderRadius: 99, background: C.bg, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 99, transition: 'width 0.5s',
                  width: `${Math.min(pct, 100)}%`,
                  background: pct >= 95 ? '#DC2626' : pct >= 80 ? '#D97706' : C.brand,
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Add-ons ─────────────────────────────────────────────────────────── */}
      <div>
        <h2 style={{
          fontFamily: "'Bricolage Grotesque', system-ui, sans-serif",
          fontSize: 24, fontWeight: 700, color: C.text, letterSpacing: '-0.03em',
          margin: '0 0 6px',
        }}>
          Add-ons
        </h2>
        <p style={{ fontSize: 14, color: C.textSub, margin: '0 0 20px' }}>
          Stack extra capacity on top of your plan. Email and contact add-ons renew monthly.
        </p>

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FCA5A5', fontSize: 13, color: '#DC2626', marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {(Object.entries(ADDON_PACKAGES) as [AddonPackageId, typeof ADDON_PACKAGES[AddonPackageId]][]).map(([id, pkg]) => (
            <div key={id} style={{
              background: C.card, border: `1px solid ${C.border}`,
              borderRadius: 10, padding: '16px 18px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0 }}>{pkg.label}</p>
                <p style={{ fontSize: 12, color: C.textHint, margin: '2px 0 0' }}>
                  {pkg.type === 'ai_credits' ? 'One-time grant' : 'Monthly · auto-renews'}
                </p>
              </div>
              <button
                onClick={() => handleAddon(id)}
                disabled={!isAdmin || !!purchasing}
                style={{
                  flexShrink: 0, padding: '8px 16px', borderRadius: 8,
                  border: `1px solid ${C.border}`, background: C.bg,
                  fontSize: 13, fontWeight: 600, color: C.text,
                  cursor: isAdmin ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', gap: 6,
                  opacity: (purchasing && purchasing !== id) ? 0.5 : 1,
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                  fontFamily: 'inherit',
                }}
              >
                {purchasing === id && <Spinner />}
                ${pkg.priceUsd.toFixed(2)}
              </button>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 12, color: C.textHint, marginTop: 16, textAlign: 'center' }}>
          Payments processed securely through Whop · Cancel anytime
        </p>
      </div>
    </div>
  );
}
