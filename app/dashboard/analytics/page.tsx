/**
 * app/dashboard/analytics/page.tsx
 * Analytics — clean stat cards, strong empty state, no emojis
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { requireWorkspaceAccess } from '@/lib/auth/session';
import { db } from '@/lib/db/client';
import { formatNumber, formatDate } from '@/lib/utils';
import { UsersIcon, MailIcon, BarChart2Icon, MousePointerClickIcon } from 'lucide-react';

export const metadata: Metadata = { title: 'Analytics' };

export default async function AnalyticsPage() {
  const { workspaceId } = await requireWorkspaceAccess();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000);

  const [campaigns, contactCount, totalSent30d, totalOpened30d] = await Promise.all([
    db.emailCampaign.findMany({
      where: { workspaceId, status: 'COMPLETED' },
      orderBy: { sentAt: 'desc' },
      take: 10,
      select: {
        id: true, name: true, subject: true,
        totalSent: true, totalOpened: true, totalClicked: true, totalBounced: true,
        sentAt: true,
      },
    }),
    db.contact.count({ where: { workspaceId, status: 'SUBSCRIBED' } }),
    db.emailSend.count({ where: { workspaceId, createdAt: { gte: thirtyDaysAgo } } }),
    db.emailSend.count({ where: { workspaceId, openedAt: { not: null }, createdAt: { gte: thirtyDaysAgo } } }),
  ]);

  const avgOpenRate = campaigns.length > 0
    ? campaigns.reduce((s, c) => s + (c.totalSent > 0 ? (c.totalOpened / c.totalSent) * 100 : 0), 0) / campaigns.length
    : 0;
  const avgClickRate = campaigns.length > 0
    ? campaigns.reduce((s, c) => s + (c.totalSent > 0 ? (c.totalClicked / c.totalSent) * 100 : 0), 0) / campaigns.length
    : 0;

  const hasData = campaigns.length > 0;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
          Analytics
        </h1>
        <p className="mt-0.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Campaign performance across all sends
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Subscribers"
          value={formatNumber(contactCount)}
          icon={<UsersIcon className="h-4 w-4" />}
        />
        <StatCard
          label="Emails sent (30d)"
          value={totalSent30d > 0 ? formatNumber(totalSent30d) : '—'}
          icon={<MailIcon className="h-4 w-4" />}
        />
        <StatCard
          label="Avg open rate"
          value={hasData ? `${avgOpenRate.toFixed(1)}%` : '—'}
          sub={hasData && avgOpenRate >= 20 ? 'Above average' : hasData ? 'Industry avg: 21%' : undefined}
          subGreen={avgOpenRate >= 20}
          icon={<BarChart2Icon className="h-4 w-4" />}
          accent={avgOpenRate >= 20}
        />
        <StatCard
          label="Avg click rate"
          value={hasData ? `${avgClickRate.toFixed(1)}%` : '—'}
          icon={<MousePointerClickIcon className="h-4 w-4" />}
        />
      </div>

      {/* Empty state */}
      {!hasData ? (
        <div
          className="rounded-xl p-12 text-center"
          style={{ border: '1.5px dashed var(--sidebar-border)', background: 'var(--surface-card)' }}
        >
          <div
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl mb-5"
            style={{ background: '#F0FDF4' }}
          >
            <BarChart2Icon className="h-6 w-6" style={{ color: '#16A34A' }} />
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
      ) : (
        /* Campaign performance table */
        <div
          className="rounded-xl overflow-hidden shadow-card"
          style={{ border: '1px solid var(--sidebar-border)', background: 'var(--surface-card)' }}
        >
          <div
            className="px-5 py-4"
            style={{ borderBottom: '1px solid var(--sidebar-border)', background: 'var(--surface-app)' }}
          >
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Campaign performance</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Last {campaigns.length} completed campaigns</p>
          </div>
          <table className="w-full text-sm">
            <thead style={{ borderBottom: '1px solid var(--sidebar-border)' }}>
              <tr>
                {['Campaign', 'Sent', 'Open rate', 'Click rate', 'Bounce rate', 'Date'].map((h, i) => (
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
                const openRate  = c.totalSent > 0 ? (c.totalOpened  / c.totalSent) * 100 : null;
                const clickRate = c.totalSent > 0 ? (c.totalClicked / c.totalSent) * 100 : null;
                const bounceRate = c.totalSent > 0 ? (c.totalBounced / c.totalSent) * 100 : null;
                return (
                  <tr
                    key={c.id}
                    className="group transition-colors hover:bg-[#F7F8FA]"
                    style={{ borderTop: i > 0 ? '1px solid var(--sidebar-border)' : undefined }}
                  >
                    <td className="px-5 py-4">
                      <Link
                        href={`/dashboard/campaigns/${c.id}`}
                        className="font-medium transition-colors group-hover:text-[#16A34A]"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {c.name}
                      </Link>
                      <p className="text-xs mt-0.5 truncate max-w-[200px]" style={{ color: 'var(--text-tertiary)' }}>{c.subject}</p>
                    </td>
                    <td className="px-5 py-4 text-right text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {formatNumber(c.totalSent)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="text-sm font-medium" style={{ color: openRate !== null && openRate >= 20 ? '#16A34A' : 'var(--text-secondary)' }}>
                        {openRate !== null ? `${openRate.toFixed(1)}%` : '—'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {clickRate !== null ? `${clickRate.toFixed(1)}%` : '—'}
                    </td>
                    <td className="px-5 py-4 text-right text-sm" style={{ color: bounceRate !== null && bounceRate > 2 ? '#DC2626' : 'var(--text-secondary)' }}>
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

function StatCard({ label, value, sub, subGreen, accent, icon }: {
  label: string; value: string; sub?: string; subGreen?: boolean; accent?: boolean; icon: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl p-5 shadow-card"
      style={{ background: 'var(--surface-card)', border: '1px solid var(--sidebar-border)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
          {label}
        </p>
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ background: accent ? 'var(--brand-tint)' : 'var(--surface-app)' }}
        >
          <span style={{ color: accent ? 'var(--brand)' : 'var(--text-tertiary)' }}>{icon}</span>
        </div>
      </div>
      <p className="text-[26px] font-bold leading-none" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
        {value}
      </p>
      {sub && (
        <p className="mt-1.5 text-xs font-medium" style={{ color: subGreen ? '#16A34A' : 'var(--text-tertiary)' }}>{sub}</p>
      )}
    </div>
  );
}
