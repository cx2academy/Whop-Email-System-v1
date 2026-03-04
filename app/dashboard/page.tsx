/**
 * app/dashboard/page.tsx
 *
 * Dashboard home. Shows onboarding checklist until all steps are complete
 * or user dismisses it.
 */

import { requireWorkspaceAccess } from '@/lib/auth/session';
import { db } from '@/lib/db/client';
import { formatNumber, formatDate } from '@/lib/utils';
import { OnboardingChecklist } from './onboarding-checklist';
import { deriveOnboardingState } from '@/lib/onboarding/steps';

export const metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const { workspaceId, userId } = await requireWorkspaceAccess();

  const [workspace, contactCount, campaignCount, recentCampaigns, user] =
    await Promise.all([
      db.workspace.findUnique({
        where: { id: workspaceId },
        select: { name: true, plan: true, monthlyEmailCap: true, fromEmail: true, whopApiKey: true },
      }),
      db.contact.count({ where: { workspaceId, status: 'SUBSCRIBED' } }),
      db.emailCampaign.count({ where: { workspaceId } }),
      db.emailCampaign.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true, name: true, status: true,
          totalSent: true, totalOpened: true,
          sentAt: true, createdAt: true,
        },
      }),
      db.user.findUnique({
        where: { id: userId },
        select: { email: true, hasAchievedFirstSend: true, onboardingDismissedAt: true },
      }),
    ]);

  const openRate =
    recentCampaigns.length > 0
      ? recentCampaigns.reduce((acc, c) => {
          return acc + (c.totalSent > 0 ? (c.totalOpened / c.totalSent) * 100 : 0);
        }, 0) / recentCampaigns.length
      : 0;

  const onboarding = deriveOnboardingState({
    fromEmail: workspace?.fromEmail,
    hasWhopApiKey: !!workspace?.whopApiKey,
    contactCount,
    hasAchievedFirstSend: user?.hasAchievedFirstSend ?? false,
    onboardingDismissedAt: user?.onboardingDismissedAt,
  });

  return (
    <div className='space-y-8'>
      <div>
        <h1 className='text-2xl font-bold text-foreground'>{workspace?.name ?? 'Dashboard'}</h1>
        <p className='mt-1 text-sm text-muted-foreground'>Here&apos;s an overview of your workspace</p>
      </div>

      {onboarding.shouldShow && user?.email && (
        <OnboardingChecklist
          steps={onboarding.steps}
          completedCount={onboarding.completedCount}
          totalCount={onboarding.totalCount}
          userEmail={user.email}
          prefillFromEmail={user.email}
        />
      )}

      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <StatCard label='Subscribed Contacts' value={formatNumber(contactCount)} description='Active subscribers' icon='👥' />
        <StatCard label='Total Campaigns' value={formatNumber(campaignCount)} description='All time' icon='📧' />
        <StatCard label='Avg. Open Rate' value={openRate.toFixed(1) + '%'} description='Last 5 campaigns' icon='📊' />
        <StatCard label='Plan' value={workspace?.plan ?? 'FREE'} description={formatNumber(workspace?.monthlyEmailCap ?? 0) + ' emails/mo'} icon='⚡' />
      </div>

      <div>
        <h2 className='mb-4 text-lg font-semibold text-foreground'>Recent Campaigns</h2>
        {recentCampaigns.length === 0 ? (
          <div className='rounded-lg border border-dashed border-border bg-muted/30 py-12 text-center'>
            <p className='text-sm font-medium text-foreground'>No campaigns yet</p>
            <p className='mt-1 text-xs text-muted-foreground'>Create your first campaign to start emailing your community</p>
          </div>
        ) : (
          <div className='overflow-hidden rounded-lg border border-border'>
            <table className='w-full text-sm'>
              <thead className='bg-muted/50'>
                <tr>
                  <th className='px-4 py-3 text-left font-medium text-muted-foreground'>Campaign</th>
                  <th className='px-4 py-3 text-left font-medium text-muted-foreground'>Status</th>
                  <th className='px-4 py-3 text-right font-medium text-muted-foreground'>Sent</th>
                  <th className='px-4 py-3 text-right font-medium text-muted-foreground'>Opened</th>
                  <th className='px-4 py-3 text-right font-medium text-muted-foreground'>Date</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-border'>
                {recentCampaigns.map((campaign) => (
                  <tr key={campaign.id} className='hover:bg-muted/30'>
                    <td className='px-4 py-3 font-medium text-foreground'>{campaign.name}</td>
                    <td className='px-4 py-3'><CampaignStatusBadge status={campaign.status} /></td>
                    <td className='px-4 py-3 text-right text-muted-foreground'>{formatNumber(campaign.totalSent)}</td>
                    <td className='px-4 py-3 text-right text-muted-foreground'>
                      {campaign.totalSent > 0 ? ((campaign.totalOpened / campaign.totalSent) * 100).toFixed(1) + '%' : '—'}
                    </td>
                    <td className='px-4 py-3 text-right text-muted-foreground'>{formatDate(campaign.sentAt ?? campaign.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, description, icon }: { label: string; value: string; description: string; icon: string }) {
  return (
    <div className='rounded-lg border border-border bg-card p-5 shadow-sm'>
      <div className='flex items-center justify-between'>
        <p className='text-sm font-medium text-muted-foreground'>{label}</p>
        <span className='text-xl'>{icon}</span>
      </div>
      <p className='mt-2 text-2xl font-bold text-foreground'>{value}</p>
      <p className='mt-1 text-xs text-muted-foreground'>{description}</p>
    </div>
  );
}

function CampaignStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: 'bg-muted text-muted-foreground',
    SCHEDULED: 'bg-blue-100 text-blue-700',
    SENDING: 'bg-yellow-100 text-yellow-700',
    COMPLETED: 'bg-green-100 text-green-700',
    FAILED: 'bg-red-100 text-red-700',
    PAUSED: 'bg-orange-100 text-orange-700',
  };
  return (
    <span className={'inline-flex rounded-full px-2 py-0.5 text-xs font-medium ' + (styles[status] ?? styles.DRAFT)}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}
