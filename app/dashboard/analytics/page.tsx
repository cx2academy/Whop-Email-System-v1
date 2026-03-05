/**
 * app/dashboard/analytics/page.tsx
 *
 * Analytics overview — campaign performance + behavioral telemetry.
 * Telemetry section shows event counts for the last 30 days.
 */

import type { Metadata } from 'next';
import { requireWorkspaceAccess } from '@/lib/auth/session';
import { db } from '@/lib/db/client';
import { formatNumber } from '@/lib/utils';

export const metadata: Metadata = { title: 'Analytics' };

const TRACKED_EVENTS = [
  'first_send_completed',
  'campaign_created',
  'onboarding_started',
  'onboarding_abandoned',
  'api_key_created',
] as const;

export default async function AnalyticsPage() {
  const { workspaceId } = await requireWorkspaceAccess();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Campaign performance
  const [campaigns, contactCount] = await Promise.all([
    db.emailCampaign.findMany({
      where: { workspaceId, status: 'COMPLETED' },
      orderBy: { sentAt: 'desc' },
      take: 10,
      select: {
        id: true, name: true, subject: true,
        totalSent: true, totalOpened: true,
        totalClicked: true, totalBounced: true,
        sentAt: true,
      },
    }),
    db.contact.count({ where: { workspaceId, status: 'SUBSCRIBED' } }),
  ]);

  // Telemetry event counts (last 30 days)
  const eventCounts = await Promise.all(
    TRACKED_EVENTS.map(async (event) => {
      const count = await db.telemetryEvent.count({
        where: { workspaceId, event, createdAt: { gte: thirtyDaysAgo } },
      });
      return { event, count };
    })
  );

  // Total telemetry events all time
  const totalEvents = await db.telemetryEvent.count({ where: { workspaceId } });

  return (
    <div className='space-y-8'>
      <div>
        <h1 className='text-2xl font-bold text-foreground'>Analytics</h1>
        <p className='mt-1 text-sm text-muted-foreground'>Campaign performance and workspace activity</p>
      </div>

      {/* Summary stats */}
      <div className='grid gap-4 sm:grid-cols-3'>
        <StatCard label='Subscribed Contacts' value={formatNumber(contactCount)} icon='👥' />
        <StatCard label='Completed Campaigns' value={formatNumber(campaigns.length)} icon='📧' />
        <StatCard label='Events Tracked (all time)' value={formatNumber(totalEvents)} icon='📡' />
      </div>

      {/* Telemetry — last 30 days */}
      <section>
        <h2 className='mb-1 text-lg font-semibold text-foreground'>Behavioral Events</h2>
        <p className='mb-4 text-sm text-muted-foreground'>Last 30 days · Stored locally · Used for future predictive features</p>
        <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
          {eventCounts.map(({ event, count }) => (
            <div key={event} className='rounded-lg border border-border bg-card px-4 py-3'>
              <p className='font-mono text-xs text-muted-foreground'>{event}</p>
              <p className='mt-1 text-2xl font-bold text-foreground'>{count}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Campaign performance table */}
      <section>
        <h2 className='mb-4 text-lg font-semibold text-foreground'>Recent Campaign Performance</h2>
        {campaigns.length === 0 ? (
          <div className='rounded-lg border border-dashed border-border bg-muted/30 py-12 text-center'>
            <p className='text-sm text-muted-foreground'>No completed campaigns yet</p>
          </div>
        ) : (
          <div className='overflow-hidden rounded-lg border border-border'>
            <table className='w-full text-sm'>
              <thead className='bg-muted/50'>
                <tr>
                  <th className='px-4 py-3 text-left font-medium text-muted-foreground'>Campaign</th>
                  <th className='px-4 py-3 text-right font-medium text-muted-foreground'>Sent</th>
                  <th className='px-4 py-3 text-right font-medium text-muted-foreground'>Open rate</th>
                  <th className='px-4 py-3 text-right font-medium text-muted-foreground'>Click rate</th>
                  <th className='px-4 py-3 text-right font-medium text-muted-foreground'>Bounce rate</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-border'>
                {campaigns.map((c) => {
                  const openRate = c.totalSent > 0 ? ((c.totalOpened / c.totalSent) * 100).toFixed(1) : '—';
                  const clickRate = c.totalSent > 0 ? ((c.totalClicked / c.totalSent) * 100).toFixed(1) : '—';
                  const bounceRate = c.totalSent > 0 ? ((c.totalBounced / c.totalSent) * 100).toFixed(1) : '—';
                  return (
                    <tr key={c.id} className='hover:bg-muted/30'>
                      <td className='px-4 py-3'>
                        <p className='font-medium text-foreground'>{c.name}</p>
                        <p className='text-xs text-muted-foreground'>{c.subject}</p>
                      </td>
                      <td className='px-4 py-3 text-right text-muted-foreground'>{formatNumber(c.totalSent)}</td>
                      <td className='px-4 py-3 text-right text-muted-foreground'>{openRate}{c.totalSent > 0 ? '%' : ''}</td>
                      <td className='px-4 py-3 text-right text-muted-foreground'>{clickRate}{c.totalSent > 0 ? '%' : ''}</td>
                      <td className='px-4 py-3 text-right text-muted-foreground'>{bounceRate}{c.totalSent > 0 ? '%' : ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className='rounded-lg border border-border bg-card p-5 shadow-sm'>
      <div className='flex items-center justify-between'>
        <p className='text-sm font-medium text-muted-foreground'>{label}</p>
        <span className='text-xl'>{icon}</span>
      </div>
      <p className='mt-2 text-2xl font-bold text-foreground'>{value}</p>
    </div>
  );
}
