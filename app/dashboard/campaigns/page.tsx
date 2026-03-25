/**
 * app/dashboard/campaigns/page.tsx
 *
 * Phase 7: "Write with AI" promoted to a first-class entry point.
 * Header now shows: Write with AI | AI sequence | New campaign
 * Empty state has 3 clear paths.
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
  const totalRevenue  = sentCampaigns.reduce((s, c) => s + ((c as any).totalRevenue ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
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
            {/* Write with AI — promoted to a real button */}
            <Link
              href="/dashboard/campaigns/generate"
              className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition-all hover:opacity-90"
              style={{
                border:      '1px solid rgba(34,197,94,0.4)',
                color:       'var(--brand)',
                background:  'rgba(34,197,94,0.06)',
              }}
            >
              <SparklesIcon className="h-3.5 w-3.5" />
              Write with AI
            </Link>

            {/* AI Sequence */}
            <Link
              href="/dashboard/campaigns/sequence"
              className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors"
              style={{ border: '1px solid var(--sidebar-border)', color: 'var(--text-secondary)', background: 'none' }}
            >
              <SparklesIcon className="h-3.5 w-3.5" style={{ color: 'var(--text-tertiary)' }} />
              AI sequence
            </Link>

            {/* Primary: New campaign */}
            <Link
              href="/dashboard/campaigns/new"
              className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90"
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
        <div className="rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--sidebar-border)', background: 'var(--surface-card)' }}>
          <table className="w-full text-sm">
            <thead style={{ borderBottom: '1px solid var(--sidebar-border)', background: 'var(--surface-app)' }}>
              <tr>
                {['Campaign', 'Status', 'Sent', 'Open rate', 'Click rate', 'Date'].map((h, i) => (
                  <th key={h}
                    className={`px-5 py-3 text-[11px] font-semibold uppercase tracking-wider ${i === 0 ? 'text-left' : 'text-right'}`}
                    style={{ color: 'var(--text-tertiary)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c, i) => {
                const openRate  = c.totalSent > 0 ? ((c.totalOpened  / c.totalSent) * 100).toFixed(1) : null;
                const clickRate = c.totalSent > 0 ? ((c.totalClicked / c.totalSent) * 100).toFixed(1) : null;
                const date      = c.sentAt ?? c.scheduledAt ?? c.createdAt;
                const status    = c.status as CampaignStatus;
                return (
                  <tr key={c.id} className="group transition-colors hover:bg-[#F7F8FA]"
                    style={{ borderTop: i > 0 ? '1px solid var(--sidebar-border)' : undefined }}>
                    <td className="px-5 py-4">
                      <Link href={`/dashboard/campaigns/${c.id}`}
                        className="font-medium transition-colors group-hover:text-[#16A34A]"
                        style={{ color: 'var(--text-primary)' }}>
                        {c.name}
                      </Link>
                      <p className="text-xs mt-0.5 max-w-[220px] truncate" style={{ color: 'var(--text-tertiary)' }}>
                        {c.subject}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[status] ?? ''}`}>
                        {STATUS_LABEL[status]}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {c.totalSent > 0 ? formatNumber(c.totalSent) : '—'}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="text-sm font-medium"
                        style={{ color: openRate !== null && Number(openRate) >= 20 ? '#16A34A' : 'var(--text-secondary)' }}>
                        {openRate !== null ? `${openRate}%` : '—'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {clickRate !== null ? `${clickRate}%` : '—'}
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
    <div className="flex flex-col items-center justify-center rounded-xl py-16 text-center"
      style={{ border: '1.5px dashed var(--sidebar-border)', background: 'var(--surface-card)' }}>
      <div className="flex h-14 w-14 items-center justify-center rounded-full mb-5"
        style={{ background: 'var(--surface-app)' }}>
        <svg className="h-6 w-6" style={{ color: 'var(--text-tertiary)' }} fill="none"
          viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
        No campaigns yet
      </p>
      <p className="text-xs max-w-xs mb-8" style={{ color: 'var(--text-tertiary)' }}>
        Create your first campaign. Not sure where to start? Let AI write it for you.
      </p>

      {isAdmin && (
        <div className="flex flex-col items-center gap-3">
          {/* Write with AI — hero empty state CTA */}
          <Link href="/dashboard/campaigns/generate"
            className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ background: 'var(--brand)', boxShadow: '0 2px 12px rgba(34,197,94,0.28)' }}>
            <SparklesIcon className="h-4 w-4" />
            Write with AI
          </Link>

          <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--text-tertiary)' }}>
            <Link href="/dashboard/campaigns/new" className="hover:underline underline-offset-2"
              style={{ color: 'var(--text-secondary)' }}>
              Start from scratch
            </Link>
            <span>·</span>
            <Link href="/dashboard/campaigns/sequence" className="hover:underline underline-offset-2"
              style={{ color: 'var(--text-secondary)' }}>
              AI sequence (5 emails)
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
