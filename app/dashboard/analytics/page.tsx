/**
 * app/dashboard/analytics/page.tsx
 *
 * Analytics — upgraded with:
 *   - List growth (new contacts this month vs last month)
 *   - Unsubscribe rate (30d)
 *   - Best campaign highlight banner
 *   - Per-row engagement mini-bar in campaign table
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { requireWorkspaceAccess } from '@/lib/auth/session';
import { db } from '@/lib/db/client';
import { formatNumber, formatDate } from '@/lib/utils';
import {
  UsersIcon, MailIcon, BarChart2Icon,
  MousePointerClickIcon, TrendingUpIcon, UserMinusIcon,
  AlertTriangleIcon, InfoIcon, ArrowUpRightIcon
} from 'lucide-react';

export const metadata: Metadata = { title: 'Analytics' };

export default async function AnalyticsPage() {
  const { workspaceId } = await requireWorkspaceAccess();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000);
  const sixtyDaysAgo  = new Date(Date.now() - 60 * 86400_000);

  const [
    campaigns,
    contactCount,
    totalSent30d,
    totalOpened30d,
    newContacts30d,
    newContacts60to30d,
    unsubscribed30d,
    totalSent30dForUnsub,
    insights,
  ] = await Promise.all([
    db.emailCampaign.findMany({
      where:   { workspaceId, status: 'COMPLETED' },
      orderBy: { sentAt: 'desc' },
      take:    20,
      select: {
        id: true, name: true, subject: true,
        totalSent: true, totalOpened: true, totalClicked: true, totalBounced: true,
        sentAt: true,
      },
    }),
    db.contact.count({ where: { workspaceId, status: 'SUBSCRIBED' } }),
    db.emailSend.count({ where: { workspaceId, createdAt: { gte: thirtyDaysAgo } } }),
    db.emailSend.count({ where: { workspaceId, openedAt: { not: null }, createdAt: { gte: thirtyDaysAgo } } }),
    // List growth
    db.contact.count({ where: { workspaceId, createdAt: { gte: thirtyDaysAgo } } }),
    db.contact.count({ where: { workspaceId, createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
    // Unsubscribes
    db.contact.count({ where: { workspaceId, status: 'UNSUBSCRIBED', unsubscribedAt: { gte: thirtyDaysAgo } } }),
    db.emailSend.count({ where: { workspaceId, sentAt: { gte: thirtyDaysAgo } } }),
    // Insights
    db.campaignInsight.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        campaign: {
          select: { name: true, sentAt: true }
        }
      }
    }),
  ]);

  const hasData = campaigns.length > 0;

  // Aggregate metrics
  const avgOpenRate = hasData
    ? campaigns.reduce((s, c) => s + (c.totalSent > 0 ? (c.totalOpened / c.totalSent) * 100 : 0), 0) / campaigns.length
    : 0;

  const avgClickRate = hasData
    ? campaigns.reduce((s, c) => s + (c.totalSent > 0 ? (c.totalClicked / c.totalSent) * 100 : 0), 0) / campaigns.length
    : 0;

  const unsubscribeRate =
    totalSent30dForUnsub > 0 ? (unsubscribed30d / totalSent30dForUnsub) * 100 : 0;

  const listGrowthPct =
    newContacts60to30d > 0
      ? Math.round(((newContacts30d - newContacts60to30d) / newContacts60to30d) * 100)
      : null;

  // Best campaign by open rate (minimum 10 sends for statistical validity)
  const bestCampaign = hasData
    ? [...campaigns]
        .filter((c) => c.totalSent >= 10)
        .sort((a, b) => {
          const aRate = a.totalSent > 0 ? a.totalOpened / a.totalSent : 0;
          const bRate = b.totalSent > 0 ? b.totalOpened / b.totalSent : 0;
          return bRate - aRate;
        })[0] ?? null
    : null;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', letterSpacing: '-0.03em' }}
        >
          Analytics
        </h1>
        <p className="mt-0.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Campaign performance across all sends
        </p>
      </div>

      {/* ── Insights Feed ───────────────────────────────────────────────── */}
      {insights.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>AI Insights</h2>
          <div className="grid gap-4">
            {insights.map((insight) => (
              <div
                key={insight.id}
                className="rounded-xl p-5 flex gap-4 items-start"
                style={{
                  background: 'var(--surface-card)',
                  border: '1px solid var(--sidebar-border)'
                }}
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    background: insight.type === 'unsubscribe_risk' ? '#FEF2F2' :
                                insight.type === 'strong_performer' ? '#F0FDF4' : '#EFF6FF',
                    color: insight.type === 'unsubscribe_risk' ? '#DC2626' :
                           insight.type === 'strong_performer' ? '#16A34A' : '#3B82F6'
                  }}
                >
                  {insight.type === 'unsubscribe_risk' && <AlertTriangleIcon className="h-5 w-5" />}
                  {insight.type === 'strong_performer' && <ArrowUpRightIcon className="h-5 w-5" />}
                  {insight.type === 'low_engagement' && <InfoIcon className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-4 mb-1">
                    <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
                      {insight.headline}
                    </h3>
                    <Link
                      href={`/dashboard/campaigns/${insight.campaignId}`}
                      className="text-xs font-medium hover:underline shrink-0"
                      style={{ color: 'var(--brand)' }}
                    >
                      View campaign
                    </Link>
                  </div>
                  <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                    {insight.insight}
                  </p>
                  <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    <span className="font-medium truncate">{insight.campaign.name}</span>
                    <span>•</span>
                    <span>{insight.campaign.sentAt ? formatDate(insight.campaign.sentAt) : 'Unknown date'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 6 KPI cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Subscribers"
          value={formatNumber(contactCount)}
          sub={newContacts30d > 0 ? `+${newContacts30d} this month` : undefined}
          subGreen={newContacts30d > 0}
          icon={<UsersIcon className="h-4 w-4" />}
        />
        <StatCard
          label="List growth (30d)"
          value={newContacts30d > 0 ? `+${newContacts30d}` : '—'}
          sub={
            listGrowthPct !== null
              ? `${listGrowthPct >= 0 ? '+' : ''}${listGrowthPct}% vs prior 30d`
              : undefined
          }
          subGreen={(listGrowthPct ?? 0) >= 0}
          accent={newContacts30d > 0}
          icon={<TrendingUpIcon className="h-4 w-4" />}
        />
        <StatCard
          label="Emails sent (30d)"
          value={totalSent30d > 0 ? formatNumber(totalSent30d) : '—'}
          icon={<MailIcon className="h-4 w-4" />}
        />
        <StatCard
          label="Avg open rate"
          value={hasData ? `${avgOpenRate.toFixed(1)}%` : '—'}
          sub={hasData ? (avgOpenRate >= 20 ? 'Above average ✓' : 'Industry avg: 21%') : undefined}
          subGreen={avgOpenRate >= 20}
          accent={avgOpenRate >= 20}
          icon={<BarChart2Icon className="h-4 w-4" />}
        />
        <StatCard
          label="Avg click rate"
          value={hasData ? `${avgClickRate.toFixed(1)}%` : '—'}
          sub={hasData ? (avgClickRate >= 2.5 ? 'Above average ✓' : 'Industry avg: 2.5%') : undefined}
          subGreen={avgClickRate >= 2.5}
          icon={<MousePointerClickIcon className="h-4 w-4" />}
        />
        <StatCard
          label="Unsubscribe rate (30d)"
          value={hasData ? `${unsubscribeRate.toFixed(3)}%` : '—'}
          sub={
            hasData
              ? unsubscribeRate > 0.5
                ? 'High — check content relevance'
                : 'Healthy ✓'
              : undefined
          }
          subGreen={unsubscribeRate <= 0.5 && hasData}
          danger={unsubscribeRate > 0.5}
          icon={<UserMinusIcon className="h-4 w-4" />}
        />
      </div>

      {/* ── Best campaign banner ───────────────────────────────────────── */}
      {bestCampaign && (
        <div
          className="rounded-xl px-5 py-4 flex items-center gap-5"
          style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.25)' }}
        >
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ background: 'rgba(34,197,94,0.12)' }}
          >
            <TrendingUpIcon className="h-5 w-5" style={{ color: '#16A34A' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: '#16A34A' }}>
              Best campaign
            </p>
            <Link
              href={`/dashboard/campaigns/${bestCampaign.id}`}
              className="text-sm font-semibold truncate block hover:underline"
              style={{ color: 'var(--text-primary)' }}
            >
              {bestCampaign.name}
            </Link>
          </div>
          <div className="flex items-center gap-6 shrink-0">
            {[
              { label: 'Open rate',  value: bestCampaign.totalSent > 0 ? `${((bestCampaign.totalOpened / bestCampaign.totalSent) * 100).toFixed(1)}%` : '—', green: true },
              { label: 'Click rate', value: bestCampaign.totalSent > 0 ? `${((bestCampaign.totalClicked / bestCampaign.totalSent) * 100).toFixed(1)}%` : '—', green: false },
              { label: 'Sent',       value: formatNumber(bestCampaign.totalSent), green: false },
            ].map((m) => (
              <div key={m.label} className="text-right">
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{m.label}</p>
                <p
                  className="text-lg font-bold leading-tight"
                  style={{ color: m.green ? '#16A34A' : 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
                >
                  {m.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────── */}
      {!hasData && (
        <div
          className="rounded-xl p-10 text-center"
          style={{ border: '1.5px dashed var(--sidebar-border)', background: 'var(--surface-card)' }}
        >
          <div
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl mb-5"
            style={{ background: '#EFF6FF' }}
          >
            <BarChart2Icon className="h-6 w-6" style={{ color: '#3B82F6' }} />
          </div>
          <p className="text-base font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>
            No campaign data yet
          </p>
          <p className="text-sm max-w-xs mx-auto mb-6" style={{ color: 'var(--text-secondary)' }}>
            Send your first campaign and open rates, click rates, and performance trends will appear here.
          </p>
          <Link
            href="/dashboard/campaigns/new"
            className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white"
            style={{ background: 'var(--brand)' }}
          >
            Create a campaign
          </Link>
        </div>
      )}

      {/* ── Campaign performance table ─────────────────────────────────── */}
      {hasData && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--sidebar-border)', background: 'var(--surface-card)' }}
        >
          <div
            className="px-5 py-4"
            style={{ borderBottom: '1px solid var(--sidebar-border)', background: 'var(--surface-app)' }}
          >
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Campaign performance
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              Last {campaigns.length} completed campaigns
            </p>
          </div>

          <table className="w-full text-sm">
            <thead style={{ borderBottom: '1px solid var(--sidebar-border)' }}>
              <tr>
                {['Campaign', 'Sent', 'Engagement', 'Open rate', 'Click rate', 'Bounce', 'Date'].map((h, i) => (
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
              {campaigns.map((c, i) => {
                const openRate   = c.totalSent > 0 ? (c.totalOpened  / c.totalSent) * 100 : null;
                const clickRate  = c.totalSent > 0 ? (c.totalClicked / c.totalSent) * 100 : null;
                const bounceRate = c.totalSent > 0 ? (c.totalBounced / c.totalSent) * 100 : null;
                const engPct     = openRate ?? 0;
                const barColor   = engPct >= 30 ? '#16A34A' : engPct >= 15 ? '#D97706' : '#D1D5DB';

                return (
                  <tr
                    key={c.id}
                    className="group transition-colors hover:bg-[#F7F8FA]"
                    style={{ borderTop: i > 0 ? '1px solid var(--sidebar-border)' : undefined }}
                  >
                    <td className="px-5 py-4 max-w-[200px]">
                      <Link
                        href={`/dashboard/campaigns/${c.id}`}
                        className="font-medium truncate block transition-colors group-hover:text-[#16A34A]"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {c.name}
                      </Link>
                      <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-tertiary)' }}>
                        {c.subject}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-right text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {formatNumber(c.totalSent)}
                    </td>
                    {/* Engagement mini-bar */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end">
                        <div
                          className="rounded-full overflow-hidden"
                          style={{ width: 56, height: 6, background: 'var(--surface-app)' }}
                        >
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${Math.min(100, engPct)}%`, background: barColor }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span
                        className="text-sm font-medium"
                        style={{ color: openRate !== null && openRate >= 20 ? '#16A34A' : 'var(--text-secondary)' }}
                      >
                        {openRate !== null ? `${openRate.toFixed(1)}%` : '—'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {clickRate !== null ? `${clickRate.toFixed(1)}%` : '—'}
                    </td>
                    <td
                      className="px-5 py-4 text-right text-sm"
                      style={{ color: bounceRate !== null && bounceRate > 2 ? '#DC2626' : 'var(--text-secondary)' }}
                    >
                      {bounceRate !== null ? `${bounceRate.toFixed(2)}%` : '—'}
                    </td>
                    <td className="px-5 py-4 text-right text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {c.sentAt ? formatDate(c.sentAt) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── StatCard ───────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, subGreen, accent, danger, icon }: {
  label:     string;
  value:     string;
  sub?:      string;
  subGreen?: boolean;
  accent?:   boolean;
  danger?:   boolean;
  icon:      React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: danger ? '#FEF2F2'              : 'var(--surface-card)',
        border:     `1px solid ${danger ? '#FCA5A5' : 'var(--sidebar-border)'}`,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
          {label}
        </p>
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{
            background: accent  ? 'var(--brand-tint)'        :
                        danger  ? 'rgba(239,68,68,0.1)'      :
                                  'var(--surface-app)',
          }}
        >
          <span
            style={{
              color: accent ? 'var(--brand)'  :
                     danger ? '#DC2626'        :
                              'var(--text-tertiary)',
            }}
          >
            {icon}
          </span>
        </div>
      </div>

      <p
        className="text-[26px] font-bold leading-none"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', letterSpacing: '-0.03em' }}
      >
        {value}
      </p>

      {sub && (
        <p
          className="mt-1.5 text-xs font-medium"
          style={{ color: subGreen ? '#16A34A' : danger ? '#DC2626' : 'var(--text-tertiary)' }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}
