/**
 * app/dashboard/revenue/page.tsx
 * Revenue attribution — strong empty state with clear setup path
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { requireWorkspaceAccess } from '@/lib/auth/session';
import {
  getRevenueSummary,
  getTopCampaignsByRevenue,
  getTopWorkflowsByRevenue,
  getTopSubscribersByRevenue,
  getRecentPurchases,
} from '@/lib/attribution/actions';
import { TrendingUpIcon, DollarSignIcon, ShoppingCartIcon, ZapIcon } from 'lucide-react';

export const metadata: Metadata = { title: 'Revenue' };

export default async function RevenuePage() {
  await requireWorkspaceAccess();

  const [summary, topCampaigns, topWorkflows, topSubscribers, recentPurchases] = await Promise.all([
    getRevenueSummary(),
    getTopCampaignsByRevenue(8),
    getTopWorkflowsByRevenue(5),
    getTopSubscribersByRevenue(5),
    getRecentPurchases(15),
  ]);

  const hasData = summary.totalRevenueCents > 0;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            Revenue
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {hasData ? 'Which emails are making you money' : 'Track which emails drive purchases'}
          </p>
        </div>
        {hasData && (
          <a
            href="/api/attribution/export?format=csv"
            className="rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:bg-[#F3F4F6]"
            style={{ border: '1px solid var(--sidebar-border)', color: 'var(--text-secondary)' }}
          >
            Export CSV
          </a>
        )}
      </div>

      {/* Summary KPIs — always show */}
      {hasData && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total revenue', value: summary.totalRevenue, icon: <TrendingUpIcon className="h-4 w-4" />, accent: true },
            { label: 'Last 30 days',  value: summary.last30Days,  icon: <DollarSignIcon className="h-4 w-4" /> },
            { label: 'Last 7 days',   value: summary.last7Days,   icon: <DollarSignIcon className="h-4 w-4" /> },
            { label: 'Purchases attributed', value: String(summary.totalPurchases), icon: <ShoppingCartIcon className="h-4 w-4" /> },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-xl p-5 shadow-card"
              style={{ background: 'var(--surface-card)', border: '1px solid var(--sidebar-border)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                  {card.label}
                </p>
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-lg"
                  style={{ background: card.accent ? 'var(--brand-tint)' : 'var(--surface-app)' }}
                >
                  <span style={{ color: card.accent ? 'var(--brand)' : 'var(--text-tertiary)' }}>{card.icon}</span>
                </div>
              </div>
              <p className="text-[26px] font-bold" style={{ fontFamily: 'var(--font-display)', color: card.accent ? '#16A34A' : 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                {card.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Empty state — no revenue yet */}
      {!hasData ? (
        <div className="space-y-4">
          <div
            className="rounded-xl p-10 text-center"
            style={{ border: '1.5px dashed var(--sidebar-border)', background: 'var(--surface-card)' }}
          >
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl mb-5"
              style={{ background: '#F0FDF4' }}
            >
              <TrendingUpIcon className="h-6 w-6" style={{ color: '#16A34A' }} />
            </div>
            <p className="text-base font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>
              No revenue attributed yet
            </p>
            <p className="text-sm max-w-sm mx-auto mb-8 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              When a subscriber buys within 7 days of clicking an email, the revenue is credited to that campaign automatically.
            </p>
            {/* Setup steps */}
            <div className="max-w-sm mx-auto text-left space-y-2">
              {[
                { n: 1, label: 'Connect Whop webhook', href: '/dashboard/settings?tab=integrations', done: false },
                { n: 2, label: 'Send a campaign', href: '/dashboard/campaigns/new', done: false },
                { n: 3, label: 'Watch revenue roll in', href: '#', done: false },
              ].map((step) => (
                <div
                  key={step.n}
                  className="flex items-center gap-3 rounded-lg px-4 py-3"
                  style={{ background: 'var(--surface-app)', border: '1px solid var(--sidebar-border)' }}
                >
                  <div
                    className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
                    style={{ background: 'var(--brand-tint)', color: '#16A34A' }}
                  >
                    {step.n}
                  </div>
                  {step.href !== '#' ? (
                    <Link href={step.href} className="text-sm font-medium underline-offset-2 hover:underline" style={{ color: 'var(--text-primary)' }}>
                      {step.label}
                    </Link>
                  ) : (
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{step.label}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">

          {/* Top campaigns */}
          {topCampaigns.length > 0 && (
            <TableSection title="Top campaigns by revenue">
              <table className="w-full text-sm">
                <thead style={{ borderBottom: '1px solid var(--sidebar-border)', background: 'var(--surface-app)' }}>
                  <tr>
                    {['Campaign', 'Revenue', 'Purchases', 'Per email', 'Conv. rate'].map((h, i) => (
                      <th key={h} className={`px-5 py-3 text-[11px] font-semibold uppercase tracking-wider ${i === 0 ? 'text-left' : 'text-right'}`} style={{ color: 'var(--text-tertiary)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topCampaigns.map((c, i) => (
                    <tr key={c.campaignId} className="group transition-colors hover:bg-[#F7F8FA]" style={{ borderTop: i > 0 ? '1px solid var(--sidebar-border)' : undefined }}>
                      <td className="px-5 py-4">
                        <Link href={`/dashboard/campaigns/${c.campaignId}`} className="font-medium transition-colors group-hover:text-[#16A34A]" style={{ color: 'var(--text-primary)' }}>{c.campaignName}</Link>
                        <p className="text-xs mt-0.5 truncate max-w-xs" style={{ color: 'var(--text-tertiary)' }}>{c.subject}</p>
                      </td>
                      <td className="px-5 py-4 text-right font-semibold" style={{ color: '#16A34A' }}>{c.revenue}</td>
                      <td className="px-5 py-4 text-right text-sm" style={{ color: 'var(--text-secondary)' }}>{c.purchases}</td>
                      <td className="px-5 py-4 text-right text-sm" style={{ color: 'var(--text-secondary)' }}>{c.revenuePerEmail}</td>
                      <td className="px-5 py-4 text-right text-sm" style={{ color: 'var(--text-secondary)' }}>{c.conversionRate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableSection>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {topWorkflows.length > 0 && (
              <TableSection title="Top automations">
                <table className="w-full text-sm">
                  <thead style={{ borderBottom: '1px solid var(--sidebar-border)', background: 'var(--surface-app)' }}>
                    <tr>
                      {['Workflow', 'Revenue', 'Purchases'].map((h, i) => (
                        <th key={h} className={`px-5 py-3 text-[11px] font-semibold uppercase tracking-wider ${i === 0 ? 'text-left' : 'text-right'}`} style={{ color: 'var(--text-tertiary)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {topWorkflows.map((w, i) => (
                      <tr key={w.workflowId} className="hover:bg-[#F7F8FA] transition-colors" style={{ borderTop: i > 0 ? '1px solid var(--sidebar-border)' : undefined }}>
                        <td className="px-5 py-4">
                          <Link href={`/dashboard/automation/${w.workflowId}`} className="text-sm font-medium hover:text-[#16A34A] transition-colors" style={{ color: 'var(--text-primary)' }}>{w.workflowName}</Link>
                        </td>
                        <td className="px-5 py-4 text-right font-semibold" style={{ color: '#16A34A' }}>{w.revenue}</td>
                        <td className="px-5 py-4 text-right text-sm" style={{ color: 'var(--text-secondary)' }}>{w.purchases}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableSection>
            )}

            {topSubscribers.length > 0 && (
              <TableSection title="Top subscribers">
                <table className="w-full text-sm">
                  <thead style={{ borderBottom: '1px solid var(--sidebar-border)', background: 'var(--surface-app)' }}>
                    <tr>
                      {['Subscriber', 'Revenue', 'Purchases'].map((h, i) => (
                        <th key={h} className={`px-5 py-3 text-[11px] font-semibold uppercase tracking-wider ${i === 0 ? 'text-left' : 'text-right'}`} style={{ color: 'var(--text-tertiary)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {topSubscribers.map((s, i) => (
                      <tr key={s.contactId} className="hover:bg-[#F7F8FA] transition-colors" style={{ borderTop: i > 0 ? '1px solid var(--sidebar-border)' : undefined }}>
                        <td className="px-5 py-4">
                          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{s.name ?? s.email}</p>
                          {s.name && <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{s.email}</p>}
                        </td>
                        <td className="px-5 py-4 text-right font-semibold" style={{ color: '#16A34A' }}>{s.totalRevenue}</td>
                        <td className="px-5 py-4 text-right text-sm" style={{ color: 'var(--text-secondary)' }}>{s.totalPurchases}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableSection>
            )}
          </div>

          {/* Recent purchases */}
          {recentPurchases.length > 0 && (
            <TableSection title="Recent purchases">
              <table className="w-full text-sm">
                <thead style={{ borderBottom: '1px solid var(--sidebar-border)', background: 'var(--surface-app)' }}>
                  <tr>
                    {['Subscriber', 'Product', 'Amount', 'Attributed to', 'Date'].map((h, i) => (
                      <th key={h} className={`px-5 py-3 text-[11px] font-semibold uppercase tracking-wider ${i === 2 || i === 4 ? 'text-right' : 'text-left'}`} style={{ color: 'var(--text-tertiary)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentPurchases.map((p, i) => (
                    <tr key={p.id} className="hover:bg-[#F7F8FA] transition-colors" style={{ borderTop: i > 0 ? '1px solid var(--sidebar-border)' : undefined }}>
                      <td className="px-5 py-4 text-sm" style={{ color: 'var(--text-primary)' }}>{p.email}</td>
                      <td className="px-5 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{p.productName}</td>
                      <td className="px-5 py-4 text-right font-semibold" style={{ color: '#16A34A' }}>{p.amount}</td>
                      <td className="px-5 py-4 text-xs" style={{ color: 'var(--text-tertiary)' }}>{p.attributedTo}</td>
                      <td className="px-5 py-4 text-right text-xs" style={{ color: 'var(--text-tertiary)' }}>{new Date(p.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableSection>
          )}
        </div>
      )}
    </div>
  );
}

function TableSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl overflow-hidden shadow-card" style={{ border: '1px solid var(--sidebar-border)', background: 'var(--surface-card)' }}>
      <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--sidebar-border)', background: 'var(--surface-app)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</p>
      </div>
      {children}
    </div>
  );
}
