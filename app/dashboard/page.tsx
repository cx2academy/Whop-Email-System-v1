/**
 * app/dashboard/page.tsx
 *
 * Redesigned dashboard — creator-focused, revenue-first.
 */

import Link from 'next/link';
import { requireWorkspaceAccess } from '@/lib/auth/session';
import { db } from '@/lib/db/client';
import { formatNumber, formatDate } from '@/lib/utils';
import { OnboardingChecklist } from './onboarding-checklist';
import { deriveOnboardingState } from '@/lib/onboarding/steps';
import {
  UsersIcon, TrendingUpIcon, MailIcon, MousePointerClickIcon,
  ArrowRightIcon, PlusIcon, ZapIcon, UploadIcon,
} from 'lucide-react';

export const metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const { workspaceId, userId } = await requireWorkspaceAccess();

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

  const [workspace, contactCount, newThisWeek, campaignCount, recentCampaigns, user, revResult, sentThisWeek] =
    await Promise.all([
      db.workspace.findUnique({
        where: { id: workspaceId },
        select: { name: true, plan: true, monthlyEmailCap: true, fromEmail: true, whopApiKey: true },
      }),
      db.contact.count({ where: { workspaceId, status: 'SUBSCRIBED' } }),
      db.contact.count({ where: { workspaceId, status: 'SUBSCRIBED', createdAt: { gte: sevenDaysAgo } } }),
      db.emailCampaign.count({ where: { workspaceId } }),
      db.emailCampaign.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true, name: true, subject: true, status: true,
          totalSent: true, totalOpened: true, totalClicked: true,
          totalRevenue: true, sentAt: true, createdAt: true,
        },
      }),
      db.user.findUnique({
        where: { id: userId },
        select: { email: true, hasAchievedFirstSend: true, onboardingDismissedAt: true },
      }),
      db.revenueAttribution.aggregate({
        where: { workspaceId },
        _sum: { revenue: true },
      }).catch(() => ({ _sum: { revenue: 0 } })),
      db.emailSend.count({ where: { workspaceId, createdAt: { gte: sevenDaysAgo } } }),
    ]);

  const totalRevenueCents = revResult._sum.revenue ?? 0;
  const totalRevenue = `$${(totalRevenueCents / 100).toFixed(0)}`;

  // Avg open rate across sent campaigns
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

  const hasSentCampaigns = sentCampaigns.length > 0;

  return (
    <div className="space-y-7 pb-10">

      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            {workspace?.name ?? 'Dashboard'}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Here's what's happening with your community
          </p>
        </div>
      </div>

      {/* Onboarding checklist */}
      {onboarding.shouldShow && user?.email && (
        <OnboardingChecklist
          steps={onboarding.steps}
          completedCount={onboarding.completedCount}
          totalCount={onboarding.totalCount}
          userEmail={user.email}
          prefillFromEmail={user.email}
        />
      )}

      {/* ── Row 1: Hero metrics ────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">

        {/* Subscribers */}
        <div className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Subscribers
            </p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UsersIcon className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-4xl font-bold tracking-tight text-foreground">
            {formatNumber(contactCount)}
          </p>
          {newThisWeek > 0 ? (
            <p className="mt-1 flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <TrendingUpIcon className="h-3 w-3" />
              +{formatNumber(newThisWeek)} this week
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">Active subscribers</p>
          )}
        </div>

        {/* Revenue from email */}
        <div className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Revenue from Email
            </p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-revenue-light text-revenue">
              <TrendingUpIcon className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-4xl font-bold tracking-tight text-foreground">
            {totalRevenueCents > 0 ? totalRevenue : '—'}
          </p>
          {totalRevenueCents > 0 ? (
            <Link href="/dashboard/revenue" className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline">
              View attribution <ArrowRightIcon className="h-3 w-3" />
            </Link>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">Set up Whop webhook to track</p>
          )}
        </div>
      </div>

      {/* ── Row 2: Performance metrics ─────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          label="Emails sent this week"
          value={formatNumber(sentThisWeek)}
          tooltip="Total emails delivered in the last 7 days"
          icon={<MailIcon className="h-4 w-4" />}
        />
        <MetricCard
          label="Avg. open rate"
          value={hasSentCampaigns ? avgOpenRate.toFixed(1) + '%' : '—'}
          tooltip="Average open rate across your last 6 campaigns"
          icon={<MailIcon className="h-4 w-4" />}
          good={avgOpenRate >= 20}
        />
        <MetricCard
          label="Avg. click rate"
          value={hasSentCampaigns ? avgClickRate.toFixed(1) + '%' : '—'}
          tooltip="Average click-through rate across your last 6 campaigns"
          icon={<MousePointerClickIcon className="h-4 w-4" />}
          good={avgClickRate >= 2}
        />
      </div>

      {/* ── Row 3: Recent campaigns ────────────────────────────────────── */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Recent Campaigns</h2>
          <Link href="/dashboard/campaigns" className="flex items-center gap-1 text-xs text-primary hover:underline">
            View all <ArrowRightIcon className="h-3 w-3" />
          </Link>
        </div>

        {recentCampaigns.length === 0 ? (
          <EmptyState
            title="No campaigns yet"
            description="Send your first email to your community"
            action={{ label: 'Create your first campaign', href: '/dashboard/campaigns/new' }}
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Campaign</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Sent</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Opens</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Clicks</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Revenue</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentCampaigns.map((c) => (
                  <tr key={c.id} className="group transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/campaigns/${c.id}`}
                        className="font-medium text-foreground hover:text-primary">
                        {c.name}
                      </Link>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">{c.subject}</p>
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">
                      {c.totalSent > 0 ? formatNumber(c.totalSent) : <StatusBadge status={c.status} />}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {c.totalSent > 0
                        ? <RateCell rate={(c.totalOpened / c.totalSent) * 100} threshold={20} />
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {c.totalSent > 0
                        ? <RateCell rate={(c.totalClicked / c.totalSent) * 100} threshold={2} />
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-sm">
                      {c.totalRevenue > 0
                        ? <span className="font-medium text-revenue">${(c.totalRevenue / 100).toFixed(0)}</span>
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                      {formatDate(c.sentAt ?? c.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Row 4: Suggested actions ───────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">What to do next</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <ActionCard
            icon={<PlusIcon className="h-4 w-4" />}
            title="Send a campaign"
            description="Email your subscribers something valuable"
            href="/dashboard/campaigns/new"
            primary
          />
          {newThisWeek > 0 && (
            <ActionCard
              icon={<ZapIcon className="h-4 w-4" />}
              title={`${formatNumber(newThisWeek)} new members this week`}
              description="Send them a welcome email"
              href="/dashboard/campaigns/new"
            />
          )}
          <ActionCard
            icon={<UploadIcon className="h-4 w-4" />}
            title="Import subscribers"
            description="Upload a CSV to grow your list"
            href="/dashboard/contacts"
          />
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MetricCard({
  label, value, tooltip, icon, good,
}: {
  label: string;
  value: string;
  tooltip: string;
  icon: React.ReactNode;
  good?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="tooltip-trigger flex items-center gap-1">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <span className="text-[10px] text-muted-foreground/60 cursor-help select-none">?
            <span className="tooltip-content">{tooltip}</span>
          </span>
        </div>
        <span className="text-muted-foreground/50">{icon}</span>
      </div>
      <p className={`mt-2 text-2xl font-bold tracking-tight ${good === true ? 'text-green-600 dark:text-green-400' : 'text-foreground'}`}>
        {value}
      </p>
    </div>
  );
}

function RateCell({ rate, threshold }: { rate: number; threshold: number }) {
  const isGood = rate >= threshold;
  return (
    <span className={`text-sm font-medium ${isGood ? 'text-green-600 dark:text-green-400' : 'text-foreground'}`}>
      {rate.toFixed(1)}%
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    DRAFT: 'bg-muted text-muted-foreground',
    SCHEDULED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    SENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${map[status] ?? map.DRAFT}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

function EmptyState({
  title, description, action,
}: {
  title: string;
  description: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 py-14 text-center">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      {action && (
        <Link href={action.href}
          className="mt-4 flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity">
          <PlusIcon className="h-3.5 w-3.5" />
          {action.label}
        </Link>
      )}
    </div>
  );
}

function ActionCard({
  icon, title, description, href, primary,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-start gap-3 rounded-xl border p-4 transition-all hover:shadow-md ${
        primary
          ? 'border-primary/30 bg-primary/5 hover:bg-primary/10'
          : 'border-border bg-card hover:border-primary/20'
      }`}
    >
      <div className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg transition-colors ${
        primary ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
      }`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <ArrowRightIcon className="mt-1 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
