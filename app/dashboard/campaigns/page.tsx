/**
 * app/dashboard/campaigns/page.tsx
 * RevTray campaigns — revenue-first table, single primary action
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { PlusIcon, SparklesIcon } from 'lucide-react';
import { requireWorkspaceAccess } from '@/lib/auth/session';
import { getCampaigns } from '@/lib/campaigns/actions';
import { formatDate, formatNumber } from '@/lib/utils';
import type { CampaignStatus } from '@prisma/client';

export const metadata: Metadata = { title: 'Campaigns' };

const STATUS_BADGE: Record<CampaignStatus, string> = {
  DRAFT: 'badge-draft', SCHEDULED: 'badge-scheduled', SENDING: 'badge-sending',
  COMPLETED: 'badge-completed', FAILED: 'badge-failed', PAUSED: 'badge-paused',
};

const STATUS_LABEL: Record<CampaignStatus, string> = {
  DRAFT: 'Draft', SCHEDULED: 'Scheduled', SENDING: 'Sending',
  COMPLETED: 'Sent', FAILED: 'Failed', PAUSED: 'Paused',
};

export default async function CampaignsPage() {
  const { workspaceRole } = await requireWorkspaceAccess();
  const campaigns = await getCampaigns();
  const isAdmin = workspaceRole === 'OWNER' || workspaceRole === 'ADMIN';

  const sentCampaigns = campaigns.filter((c) => c.totalSent > 0);
  const totalRevenue = sentCampaigns.reduce((s, c) => s + ((c as any).totalRevenue ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Header — one primary action */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
          >
            Campaigns
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}
            {totalRevenue > 0 && (
              <span className="ml-2 font-semibold" style={{ color: '#16A34A' }}>
                · ${(totalRevenue / 100).toLocaleString()} attributed
              </span>
            )}
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            {/* AI Sequence — secondary, text link style */}
            <Link
              href="/dashboard/campaigns/sequence"
              className="flex items-center gap-1.5 text-sm font-medium transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              <SparklesIcon className="h-3.5 w-3.5" style={{ color: 'var(--brand)' }} />
              AI sequence
            </Link>

            {/* Primary: New campaign */}
            <Link
              href="/dashboard/campaigns/new"
              className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] ml-4"
              style={{ background: 'var(--brand)', boxShadow: '0 2px 8px rgba(34,197,94,0.25)' }}
            >
              <PlusIcon className="h-4 w-4" />
              New campaign
            </Link>
          </div>
        )}
      </div>

      {/* Content */}
      {campaigns.length === 0 ? (
        <EmptyState isAdmin={isAdmin} />
      ) : (
        <div
          className="rounded-xl overflow-hidden shadow-card"
          style={{ border: '1px solid var(--sidebar-border)', background: 'var(--surface-card)' }}
        >
          <table className="w-full text-sm">
            <thead style={{ borderBottom: '1px solid var(--sidebar-border)', background: 'var(--surface-app)' }}>
              <tr>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Campaign</th>
                <th className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Status</th>
                {/* Revenue first — #1 metric */}
                <th className="px-4 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Revenue</th>
                <th className="px-4 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Open rate</th>
                <th className="px-4 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Sent</th>
                <th className="px-4 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c, i) => {
                const openRate = c.totalSent > 0 ? (c.totalOpened / c.totalSent) * 100 : 0;
                const revenue = (c as any).totalRevenue ?? 0;
                const date = c.sentAt ?? (c as any).scheduledAt ?? c.createdAt;

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
                      <p className="text-xs mt-0.5 truncate max-w-[200px]" style={{ color: 'var(--text-tertiary)' }}>
                        {(c as any).subject}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[c.status]}`}>
                        {STATUS_LABEL[c.status]}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      {revenue > 0 ? (
                        <span className="text-sm font-semibold" style={{ color: '#16A34A' }}>
                          ${(revenue / 100).toFixed(0)}
                        </span>
                      ) : (
                        <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      {c.totalSent > 0 ? (
                        <span
                          className="text-sm font-medium"
                          style={{ color: openRate >= 20 ? '#16A34A' : 'var(--text-secondary)' }}
                        >
                          {openRate.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {c.totalSent > 0 ? formatNumber(c.totalSent) : '—'}
                    </td>
                    <td className="px-4 py-4 text-right text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {formatDate(date)}
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

function EmptyState({ isAdmin }: { isAdmin: boolean }) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl py-20 text-center"
      style={{ border: '1.5px dashed var(--sidebar-border)', background: 'var(--surface-card)' }}
    >
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full mb-5"
        style={{ background: 'var(--surface-app)' }}
      >
        <MailIcon className="h-6 w-6" style={{ color: 'var(--text-tertiary)' }} />
      </div>
      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>No campaigns yet</p>
      <p className="mt-1 text-xs max-w-xs" style={{ color: 'var(--text-tertiary)' }}>
        Create your first campaign to start sending emails to your community.
      </p>
      {isAdmin && (
        <div className="mt-6 flex flex-col items-center gap-3">
          <Link
            href="/dashboard/campaigns/new"
            className="flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: 'var(--brand)' }}
          >
            <PlusIcon className="h-4 w-4" />
            Create campaign
          </Link>
          <Link
            href="/dashboard/campaigns/sequence"
            className="text-sm"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Or let AI plan a sequence →
          </Link>
        </div>
      )}
    </div>
  );
}

function MailIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}
