/**
 * app/dashboard/page.tsx
 * RevTray home — context-aware. New users see onboarding. Returning users see KPIs + campaigns.
 */

import Link from 'next/link';
import { requireWorkspaceAccess } from '@/lib/auth/session';
import { db } from '@/lib/db/client';
import { formatNumber, formatDate } from '@/lib/utils';
import { OnboardingChecklist } from './onboarding-checklist';
import { FeatureFlag } from '@/components/ui/feature-flag';
import { deriveOnboardingState } from '@/lib/onboarding/steps';
import { getWorkspaceUsage } from '@/lib/plans/gates';
import { PlusIcon, TrendingUpIcon, MailIcon, UsersIcon, MousePointerClickIcon } from 'lucide-react';

export const metadata = { title: 'Home' };

export default async function DashboardPage() {
  const { workspaceId, userId } = await requireWorkspaceAccess();
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000);

  const [workspace, contactCount, newThisWeek, recentCampaigns, user, revResult, sentThisWeek, totalClicks] =
    await Promise.all([
      db.workspace.findUnique({
        where: { id: workspaceId },
        select: { name: true, plan: true, fromEmail: true, whopApiKey: true },
      }),
      db.contact.count({ where: { workspaceId, status: 'SUBSCRIBED' } }),
      db.contact.count({ where: { workspaceId, status: 'SUBSCRIBED', createdAt: { gte: sevenDaysAgo } } }),
      db.emailCampaign.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true, name: true, status: true,
          totalSent: true, totalOpened: true, totalClicked: true, totalRevenue: true, sentAt: true, createdAt: true,
        },
      }),
      db.user.findUnique({
        where: { id: userId },
        select: { email: true, hasAchievedFirstSend: true, onboardingDismissedAt: true },
      }),
      db.revenueAttribution.aggregate({
        where: { workspaceId }, _sum: { revenue: true },
      }).catch(() => ({ _sum: { revenue: 0 } })),
      db.emailSend.count({ where: { workspaceId, createdAt: { gte: sevenDaysAgo } } }),
      db.clickEvent.count({ where: { workspaceId } }),
    ]);

  const totalRevenue = revResult._sum.revenue ?? 0;
  const sentCampaigns = recentCampaigns.filter((c) => c.totalSent > 0);
  const avgOpenRate = sentCampaigns.length > 0
    ? sentCampaigns.reduce((acc, c) => acc + (c.totalOpened / c.totalSent) * 100, 0) / sentCampaigns.length
    : 0;
  const avgClickRate = sentCampaigns.length > 0
    ? sentCampaigns.reduce((acc, c) => acc + (c.totalClicked / c.totalSent) * 100, 0) / sentCampaigns.length
    : 0;

  const onboarding = deriveOnboardingState({
    fromEmail: workspace?.fromEmail,
    hasWhopApiKey: !!workspace?.whopApiKey,
    contactCount,
    hasAchievedFirstSend: user?.hasAchievedFirstSend ?? false,
    onboardingDismissedAt: user?.onboardingDismissedAt,
  });

  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const isStagingBypass = process.env.NEXT_PUBLIC_STAGING_MODE === "true" && 
                          cookieStore.get("staging_bypass")?.value === process.env.STAGING_BYPASS_TOKEN;

  const isPreview = process.env.PREVIEW_MODE === "true" || process.env.NEXT_PUBLIC_PREVIEW_MODE === "true" || isStagingBypass;
  const isNewUser = onboarding.shouldShow && onboarding.completedCount < 2 && !isPreview;

  // ── New user view: onboarding fills the screen ──────────────────────────
  if (isNewUser && user?.email) {
    return (
      <div className="max-w-xl mx-auto pt-4">
        <div className="mb-8">
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            Welcome to RevTray
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Complete these steps to send your first campaign.
          </p>
        </div>
        <OnboardingChecklist
          steps={onboarding.steps}
          completedCount={onboarding.completedCount}
          totalCount={onboarding.totalCount}
          userEmail={user.email}
          prefillFromEmail={user.email}
        />
      </div>
    );
  }

  // ── Returning user view ──────────────────────────────────────────────────
  const STATUS_STYLE: Record<string, string> = {
    DRAFT: 'badge-draft', SCHEDULED: 'badge-scheduled', SENDING: 'badge-sending',
    COMPLETED: 'badge-completed', FAILED: 'badge-failed', PAUSED: 'badge-paused',
  };

  return (
    <div className="space-y-8">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
          >
            {workspace?.name ?? 'Home'}
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {newThisWeek > 0 ? `+${newThisWeek} new subscribers this week` : 'Your email performance at a glance'}
          </p>
        </div>
        <Link
          href="/dashboard/campaigns/new"
          className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ background: 'var(--brand)', boxShadow: '0 2px 8px rgba(34,197,94,0.25)' }}
        >
          <PlusIcon className="h-4 w-4" />
          New campaign
        </Link>
      </div>

      {/* Onboarding (partial progress) */}
      {onboarding.shouldShow && !isNewUser && user?.email && !isPreview && (
        <OnboardingChecklist
          steps={onboarding.steps}
          completedCount={onboarding.completedCount}
          totalCount={onboarding.totalCount}
          userEmail={user.email}
          prefillFromEmail={user.email}
        />
      )}

      {/* KPI cards — 4 columns */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <KpiCard
          label="Revenue from email"
          value={totalRevenue > 0 ? `$${(totalRevenue / 100).toLocaleString()}` : '—'}
          sub={totalRevenue > 0 ? 'All time' : undefined}
          cta={totalRevenue === 0 ? { label: 'Connect Whop', href: '/dashboard/settings?tab=integrations' } : undefined}
          icon={<TrendingUpIcon className="h-4 w-4" />}
          accent
          badge={
            <FeatureFlag flag="show-revenue-badge">
              <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-600">
                NEW
              </span>
            </FeatureFlag>
          }
        />
        <KpiCard
          label="Subscribers"
          value={formatNumber(contactCount)}
          sub={newThisWeek > 0 ? `+${newThisWeek} this week` : 'Active'}
          subGreen={newThisWeek > 0}
          icon={<UsersIcon className="h-4 w-4" />}
        />
        <KpiCard
          label="Emails sent"
          value={sentThisWeek > 0 ? formatNumber(sentThisWeek) : '—'}
          sub="Last 7 days"
          icon={<MailIcon className="h-4 w-4" />}
        />
        <KpiCard
          label="Avg open rate"
          value={sentCampaigns.length > 0 ? `${avgOpenRate.toFixed(1)}%` : '—'}
          sub="Last 5 campaigns"
          subGreen={avgOpenRate >= 20}
          icon={<MousePointerClickIcon className="h-4 w-4" />}
        />
        <KpiCard
          label="Total Clicks"
          value={totalClicks > 0 ? formatNumber(totalClicks) : '—'}
          sub="All time"
          icon={<MousePointerClickIcon className="h-4 w-4" />}
        />
        <KpiCard
          label="Click-Through Rate"
          value={sentCampaigns.length > 0 ? `${avgClickRate.toFixed(1)}%` : '—'}
          sub="Last 5 campaigns"
          subGreen={avgClickRate >= 2}
          icon={<MousePointerClickIcon className="h-4 w-4" />}
        />
      </div>

      {/* Recent campaigns */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            Recent campaigns
          </h2>
          <Link
            href="/dashboard/campaigns"
            className="text-sm font-medium transition-colors hover:opacity-70"
            style={{ color: 'var(--brand)' }}
          >
            View all →
          </Link>
        </div>

        {recentCampaigns.length === 0 ? (
          <EmptyState
            title="No campaigns yet"
            description="Create your first campaign to start emailing your community."
            cta={{ label: 'Create campaign', href: '/dashboard/campaigns/new' }}
          />
        ) : (
          <div
            className="rounded-xl overflow-hidden shadow-card"
            style={{ border: '1px solid var(--sidebar-border)', background: 'var(--surface-card)' }}
          >
            <table className="w-full text-sm">
              <thead style={{ borderBottom: '1px solid var(--sidebar-border)', background: 'var(--surface-app)' }}>
                <tr>
                  {['Campaign', 'Status', 'Open rate', 'Revenue'].map((h) => (
                    <th
                      key={h}
                      className={`px-5 py-3 text-[11px] font-semibold uppercase tracking-wider ${h === 'Campaign' ? 'text-left' : 'text-right'}`}
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentCampaigns.map((c, i) => {
                  const openRate = c.totalSent > 0 ? (c.totalOpened / c.totalSent) * 100 : 0;
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
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                          {formatDate(c.sentAt ?? c.createdAt)}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[c.status] ?? 'badge-draft'}`}>
                          {c.status.charAt(0) + c.status.slice(1).toLowerCase()}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {c.totalSent > 0 ? (
                          <span
                            className="text-sm font-medium"
                            style={{ color: openRate >= 20 ? '#16A34A' : 'var(--text-secondary)' }}
                          >
                            {openRate.toFixed(1)}%
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {(c as any).totalRevenue > 0 ? (
                          <span className="text-sm font-semibold" style={{ color: '#16A34A' }}>
                            ${((c as any).totalRevenue / 100).toFixed(0)}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                        )}
                      </td>
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

// ── Sub-components ─────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, subGreen, icon, accent, cta, badge,
}: {
  label: string; value: string; sub?: string; subGreen?: boolean;
  icon: React.ReactNode; accent?: boolean; cta?: { label: string; href: string };
  badge?: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl p-5 shadow-card"
      style={{ background: 'var(--surface-card)', border: '1px solid var(--sidebar-border)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
            {label}
          </p>
          {badge}
        </div>
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ background: accent ? 'var(--brand-tint)' : 'var(--surface-app)' }}
        >
          <span style={{ color: accent ? 'var(--brand)' : 'var(--text-tertiary)' }}>{icon}</span>
        </div>
      </div>
      <p
        className="text-[28px] font-bold leading-none"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', letterSpacing: '-0.03em' }}
      >
        {value}
      </p>
      {sub && (
        <p className="mt-1.5 text-xs font-medium" style={{ color: subGreen ? '#16A34A' : 'var(--text-tertiary)' }}>
          {sub}
        </p>
      )}
      {cta && (
        <a
          href={cta.href}
          className="mt-2 inline-flex text-xs font-semibold transition-opacity hover:opacity-70"
          style={{ color: 'var(--brand)' }}
        >
          {cta.label} →
        </a>
      )}
    </div>
  );
}

function EmptyState({
  title, description, cta,
}: {
  title: string; description: string; cta: { label: string; href: string };
}) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl py-16 text-center"
      style={{ border: '1.5px dashed var(--sidebar-border)', background: 'var(--surface-card)' }}
    >
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full mb-4"
        style={{ background: 'var(--surface-app)' }}
      >
        <MailIcon className="h-5 w-5" style={{ color: 'var(--text-tertiary)' }} />
      </div>
      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</p>
      <p className="mt-1 text-xs max-w-xs" style={{ color: 'var(--text-tertiary)' }}>{description}</p>
      <Link
        href={cta.href}
        className="mt-5 flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90"
        style={{ background: 'var(--brand)' }}
      >
        <PlusIcon className="h-4 w-4" />
        {cta.label}
      </Link>
    </div>
  );
}
