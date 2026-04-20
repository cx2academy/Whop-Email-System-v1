'use client';

/**
 * app/dashboard/revenue/revenue-client.tsx
 *
 * Client component — all 4 attribution models passed as props.
 * Switching models is instant with no extra server fetches.
 */

import { useState } from 'react';
import Link from 'next/link';
import type { AttributionModel, CampaignRevRow } from '@/lib/attribution/constants';
import { MODEL_LABELS, MODEL_DESCRIPTIONS } from '@/lib/attribution/constants';

// ── Types ─────────────────────────────────────────────────────────────────

interface ModelData {
  campaigns:         CampaignRevRow[];
  totalRevenue:      string;
  totalRevenueCents: number;
}

interface WorkflowRow {
  workflowId:   string;
  workflowName: string;
  revenue:      string;
  purchases:    number;
}

interface SubscriberRow {
  contactId:      string;
  email:          string;
  name:           string | null;
  totalRevenue:   string;
  totalPurchases: number;
}

interface PurchaseRow {
  id:           string;
  email:        string;
  productName:  string;
  amount:       string;
  attributedTo: string;
  createdAt:    string;
}

interface Props {
  allModels:       Record<AttributionModel, ModelData>;
  topWorkflows:    WorkflowRow[];
  topSubscribers:  SubscriberRow[];
  recentPurchases: PurchaseRow[];
  totalPurchases:  number;
  last30Days:      string;
  last7Days:       string;
}

const MODELS: AttributionModel[] = ['last_click', 'first_touch', 'linear', 'time_decay'];

// ── Component ──────────────────────────────────────────────────────────────

export function RevenueClient({
  allModels, topWorkflows, topSubscribers, recentPurchases,
  totalPurchases, last30Days, last7Days,
}: Props) {
  const [model, setModel]                 = useState<AttributionModel>('last_click');
  const [showComparison, setShowComparison] = useState(false);
  const current = allModels[model];

  return (
    <div className="space-y-6">

      {/* ── Attribution model card ─────────────────────────────────────── */}
      <div
        id="tour-revenue-models"
        className="rounded-xl p-5 space-y-4"
        style={{ background: 'var(--surface-card)', border: '1px solid var(--sidebar-border)' }}
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Attribution model
            </p>
            <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {MODEL_DESCRIPTIONS[model]}
            </p>
          </div>
          <button
            onClick={() => setShowComparison((v) => !v)}
            className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
            style={{
              border:     '1px solid var(--sidebar-border)',
              color:      'var(--text-secondary)',
              background: 'none',
            }}
          >
            {showComparison ? 'Hide comparison' : 'Compare models'}
          </button>
        </div>

        {/* Model pills */}
        <div className="flex flex-wrap gap-2">
          {MODELS.map((m) => (
            <button
              key={m}
              onClick={() => setModel(m)}
              className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all"
              style={{
                background: model === m ? 'var(--brand)'         : 'var(--surface-app)',
                color:      model === m ? '#fff'                  : 'var(--text-secondary)',
                border:     model === m ? '1px solid transparent' : '1px solid var(--sidebar-border)',
                boxShadow:  model === m ? '0 2px 8px rgba(34,197,94,0.22)' : 'none',
              }}
            >
              {MODEL_LABELS[m]}
            </button>
          ))}
        </div>

        {/* Comparison grid */}
        {showComparison && (
          <div className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-4">
            {MODELS.map((m) => {
              const d      = allModels[m];
              const active = model === m;
              return (
                <button
                  key={m}
                  onClick={() => setModel(m)}
                  className="rounded-xl px-4 py-3 text-left transition-all"
                  style={{
                    background: active ? 'rgba(34,197,94,0.07)' : 'var(--surface-app)',
                    border:     active ? '1.5px solid rgba(34,197,94,0.35)' : '1px solid var(--sidebar-border)',
                  }}
                >
                  <p
                    className="text-[11px] font-semibold uppercase tracking-wider mb-1"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {MODEL_LABELS[m]}
                  </p>
                  <p
                    className="text-lg font-bold"
                    style={{ color: '#16A34A', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}
                  >
                    {d.totalRevenue}
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    {d.campaigns.length} campaign{d.campaigns.length !== 1 ? 's' : ''}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── KPI cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total attributed',     value: current.totalRevenue, green: true },
          { label: 'Last 30 days',          value: last30Days,           green: false },
          { label: 'Last 7 days',           value: last7Days,            green: false },
          { label: 'Purchases attributed',  value: String(totalPurchases), green: false },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl p-5"
            style={{ background: 'var(--surface-card)', border: '1px solid var(--sidebar-border)' }}
          >
            <p
              className="text-[11px] font-semibold uppercase tracking-wider mb-2"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {card.label}
            </p>
            <p
              className="text-[26px] font-bold leading-none"
              style={{
                fontFamily:    'var(--font-display)',
                letterSpacing: '-0.03em',
                color:         card.green ? '#16A34A' : 'var(--text-primary)',
              }}
            >
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Top campaigns table ────────────────────────────────────────── */}
      {current.campaigns.length > 0 && (
        <TableSection
          title={`Top campaigns — ${MODEL_LABELS[model]}`}
          sub={MODEL_DESCRIPTIONS[model]}
        >
          <table className="w-full text-sm">
            <thead style={{ borderBottom: '1px solid var(--sidebar-border)', background: 'var(--surface-app)' }}>
              <tr>
                {['Campaign', 'Revenue', 'Purchases', 'Per email', 'Conv. rate'].map((h, i) => (
                  <th
                    key={h}
                    className={`px-5 py-3 text-[11px] font-semibold uppercase tracking-wider ${i === 0 ? 'text-left' : 'text-right'}`}
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {current.campaigns.map((c, i) => (
                <tr
                  key={c.campaignId}
                  className="group transition-colors hover:bg-[#F7F8FA]"
                  style={{ borderTop: i > 0 ? '1px solid var(--sidebar-border)' : undefined }}
                >
                  <td className="px-5 py-4">
                    <Link
                      href={`/dashboard/campaigns/${c.campaignId}`}
                      className="font-medium transition-colors group-hover:text-[#16A34A]"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {c.campaignName}
                    </Link>
                    <p className="text-xs mt-0.5 truncate max-w-[240px]" style={{ color: 'var(--text-tertiary)' }}>
                      {c.subject}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-right font-semibold" style={{ color: '#16A34A' }}>
                    {c.revenue}
                  </td>
                  <td className="px-5 py-4 text-right text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {c.purchases}
                  </td>
                  <td className="px-5 py-4 text-right text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {c.revenuePerEmail}
                  </td>
                  <td className="px-5 py-4 text-right text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {c.conversionRate}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableSection>
      )}

      {/* ── Automations + Top subscribers ─────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {topWorkflows.length > 0 && (
          <TableSection title="Top automations">
            <table className="w-full text-sm">
              <thead style={{ borderBottom: '1px solid var(--sidebar-border)', background: 'var(--surface-app)' }}>
                <tr>
                  {['Workflow', 'Revenue', 'Purchases'].map((h, i) => (
                    <th
                      key={h}
                      className={`px-5 py-3 text-[11px] font-semibold uppercase tracking-wider ${i === 0 ? 'text-left' : 'text-right'}`}
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topWorkflows.map((w, i) => (
                  <tr
                    key={w.workflowId}
                    className="hover:bg-[#F7F8FA] transition-colors"
                    style={{ borderTop: i > 0 ? '1px solid var(--sidebar-border)' : undefined }}
                  >
                    <td className="px-5 py-4">
                      <Link
                        href={`/dashboard/automation/${w.workflowId}`}
                        className="text-sm font-medium hover:text-[#16A34A] transition-colors"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {w.workflowName}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-right font-semibold" style={{ color: '#16A34A' }}>
                      {w.revenue}
                    </td>
                    <td className="px-5 py-4 text-right text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {w.purchases}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableSection>
        )}

        {topSubscribers.length > 0 && (
          <TableSection title="Top subscribers by revenue">
            <table className="w-full text-sm">
              <thead style={{ borderBottom: '1px solid var(--sidebar-border)', background: 'var(--surface-app)' }}>
                <tr>
                  {['Subscriber', 'Revenue', 'Purchases'].map((h, i) => (
                    <th
                      key={h}
                      className={`px-5 py-3 text-[11px] font-semibold uppercase tracking-wider ${i === 0 ? 'text-left' : 'text-right'}`}
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topSubscribers.map((s, i) => (
                  <tr
                    key={s.contactId}
                    className="hover:bg-[#F7F8FA] transition-colors"
                    style={{ borderTop: i > 0 ? '1px solid var(--sidebar-border)' : undefined }}
                  >
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {s.name ?? s.email}
                      </p>
                      {s.name && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{s.email}</p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right font-semibold" style={{ color: '#16A34A' }}>
                      {s.totalRevenue}
                    </td>
                    <td className="px-5 py-4 text-right text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {s.totalPurchases}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableSection>
        )}
      </div>

      {/* ── Recent purchases ──────────────────────────────────────────── */}
      {recentPurchases.length > 0 && (
        <TableSection title="Recent purchases">
          <table className="w-full text-sm">
            <thead style={{ borderBottom: '1px solid var(--sidebar-border)', background: 'var(--surface-app)' }}>
              <tr>
                {['Subscriber', 'Product', 'Amount', 'Attributed to', 'Date'].map((h, i) => (
                  <th
                    key={h}
                    className={`px-5 py-3 text-[11px] font-semibold uppercase tracking-wider ${i === 2 || i === 4 ? 'text-right' : 'text-left'}`}
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentPurchases.map((p, i) => (
                <tr
                  key={p.id}
                  className="hover:bg-[#F7F8FA] transition-colors"
                  style={{ borderTop: i > 0 ? '1px solid var(--sidebar-border)' : undefined }}
                >
                  <td className="px-5 py-4 text-sm" style={{ color: 'var(--text-primary)' }}>{p.email}</td>
                  <td className="px-5 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{p.productName}</td>
                  <td className="px-5 py-4 text-right font-semibold" style={{ color: '#16A34A' }}>{p.amount}</td>
                  <td className="px-5 py-4 text-xs" style={{ color: 'var(--text-tertiary)' }}>{p.attributedTo}</td>
                  <td className="px-5 py-4 text-right text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableSection>
      )}
    </div>
  );
}

// ── Helper ─────────────────────────────────────────────────────────────────

function TableSection({ title, sub, children }: {
  title:    string;
  sub?:     string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: '1px solid var(--sidebar-border)', background: 'var(--surface-card)' }}
    >
      <div
        className="px-5 py-4"
        style={{ borderBottom: '1px solid var(--sidebar-border)', background: 'var(--surface-app)' }}
      >
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</p>
        {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{sub}</p>}
      </div>
      {children}
    </div>
  );
}
