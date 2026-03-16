/**
 * app/dashboard/campaigns/page.tsx — RevTray premium campaigns table
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { PlusIcon, SparklesIcon } from 'lucide-react';
import { requireWorkspaceAccess } from '@/lib/auth/session';
import { getCampaigns } from '@/lib/campaigns/actions';
import { CAMPAIGN_STATUS_LABELS } from '@/lib/constants';
import { formatDate, formatNumber } from '@/lib/utils';
import type { CampaignStatus } from '@prisma/client';
import { StrategyAdvisor } from './strategy-advisor';

export const metadata: Metadata = { title: 'Campaigns' };

const STATUS_BADGE: Record<CampaignStatus, string> = {
  DRAFT: 'badge-draft', SCHEDULED: 'badge-scheduled', SENDING: 'badge-sending',
  COMPLETED: 'badge-completed', FAILED: 'badge-failed', PAUSED: 'badge-paused',
};

export default async function CampaignsPage() {
  const { workspaceRole } = await requireWorkspaceAccess();
  const campaigns = await getCampaigns();
  const isAdmin = workspaceRole === 'OWNER' || workspaceRole === 'ADMIN';

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}>
            Campaigns
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <Link href="/dashboard/campaigns/sequence"
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 transition-all hover:text-white hover:bg-white/5"
              style={{ border: '1px solid hsl(222 25% 18%)' }}>
              <SparklesIcon className="h-3.5 w-3.5 text-emerald-400" />
              AI Sequence
            </Link>
            <Link href="/dashboard/campaigns/new"
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
              style={{ background: '#22C55E', boxShadow: '0 2px 12px rgba(34,197,94,0.3)' }}>
              <PlusIcon className="h-4 w-4" />
              New Campaign
            </Link>
          </div>
        )}
      </div>

      {/* Strategy advisor */}
      {/* @ts-expect-error async server component */}
      <StrategyAdvisor />

      {/* Table */}
      {campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl py-20 text-center"
          style={{ border: '1px dashed hsl(222 25% 18%)', background: 'hsl(222 35% 8%)' }}>
          <div className="flex h-14 w-14 items-center justify-center rounded-full mb-4"
            style={{ background: 'hsl(222 25% 13%)' }}>
            <svg className="h-6 w-6 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-zinc-300">No campaigns yet</p>
          <p className="mt-1 text-xs text-zinc-600 max-w-xs">Create your first campaign to start sending emails to your community</p>
          {isAdmin && (
            <Link href="/dashboard/campaigns/new"
              className="mt-6 flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-all"
              style={{ background: '#22C55E', boxShadow: '0 2px 12px rgba(34,197,94,0.3)' }}>
              <PlusIcon className="h-4 w-4" />
              Create campaign
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid hsl(222 25% 16%)' }}>
          <table className="w-full text-sm">
            <thead style={{ background: 'hsl(222 35% 9%)', borderBottom: '1px solid hsl(222 25% 16%)' }}>
              <tr>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Campaign</th>
                <th className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Status</th>
                <th className="px-4 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Sent</th>
                <th className="px-4 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Opens</th>
                <th className="px-4 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Clicks</th>
                <th className="px-4 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Revenue</th>
                <th className="px-4 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Date</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign, i) => {
                const openRate = campaign.totalSent > 0
                  ? ((campaign.totalOpened / campaign.totalSent) * 100) : 0;
                const clickRate = campaign.totalSent > 0
                  ? ((campaign.totalClicked / campaign.totalSent) * 100) : 0;
                const date = campaign.sentAt ?? campaign.scheduledAt ?? campaign.createdAt;
                const isLast = i === campaigns.length - 1;

                return (
                  <tr key={campaign.id}
                    className="group transition-colors duration-100"
                    style={{ borderBottom: isLast ? undefined : '1px solid hsl(222 25% 13%)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'hsl(222 35% 11%)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td className="px-5 py-4">
                      <Link href={`/dashboard/campaigns/${campaign.id}`}
                        className="font-medium text-zinc-200 hover:text-emerald-400 transition-colors">
                        {campaign.name}
                      </Link>
                      <p className="text-xs text-zinc-600 truncate max-w-[220px] mt-0.5">{campaign.subject}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[campaign.status]}`}>
                        {CAMPAIGN_STATUS_LABELS[campaign.status] ?? campaign.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right text-zinc-400 tabular-nums">
                      {campaign.totalSent > 0 ? formatNumber(campaign.totalSent) : <span className="text-zinc-700">—</span>}
                    </td>
                    <td className="px-4 py-4 text-right tabular-nums">
                      {campaign.totalSent > 0 ? (
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-14 h-1 rounded-full overflow-hidden" style={{ background: 'hsl(222 25% 18%)' }}>
                            <div className="h-full rounded-full" style={{ width: `${Math.min(openRate, 100)}%`, background: openRate >= 20 ? '#22C55E' : '#4B5563' }} />
                          </div>
                          <span className={`w-10 text-right text-xs font-medium ${openRate >= 20 ? 'text-emerald-400' : 'text-zinc-400'}`}>
                            {openRate.toFixed(1)}%
                          </span>
                        </div>
                      ) : <span className="text-zinc-700">—</span>}
                    </td>
                    <td className="px-4 py-4 text-right tabular-nums">
                      <span className="text-zinc-400 text-xs">
                        {campaign.totalSent > 0 ? clickRate.toFixed(1) + '%' : <span className="text-zinc-700">—</span>}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right tabular-nums">
                      {(campaign as any).totalRevenue > 0
                        ? <span className="text-emerald-400 font-semibold text-sm">${((campaign as any).totalRevenue / 100).toFixed(0)}</span>
                        : <span className="text-zinc-700">—</span>}
                    </td>
                    <td className="px-4 py-4 text-right text-xs text-zinc-600">{formatDate(date)}</td>
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
