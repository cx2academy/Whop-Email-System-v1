/**
 * app/dashboard/page.tsx — RevTray premium dashboard
 */
import Link from 'next/link';
import { requireWorkspaceAccess } from '@/lib/auth/session';
import { db } from '@/lib/db/client';
import { formatNumber, formatDate } from '@/lib/utils';
import { OnboardingChecklist } from './onboarding-checklist';
import { deriveOnboardingState } from '@/lib/onboarding/steps';
import {
  UsersIcon, TrendingUpIcon, MailIcon, MousePointerClickIcon,
  ArrowRightIcon, PlusIcon, ZapIcon, UploadIcon, SparklesIcon,
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
        where: { workspaceId }, _sum: { revenue: true },
      }).catch(() => ({ _sum: { revenue: 0 } })),
      db.emailSend.count({ where: { workspaceId, createdAt: { gte: sevenDaysAgo } } }),
    ]);

  const totalRevenueCents = revResult._sum.revenue ?? 0;
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

  const STATUS_STYLE: Record<string, string> = {
    DRAFT: 'badge-draft', SCHEDULED: 'badge-scheduled', SENDING: 'badge-sending',
    COMPLETED: 'badge-completed', FAILED: 'badge-failed', PAUSED: 'badge-paused',
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}>
            {workspace?.name ?? 'Dashboard'}
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500">Here's what's happening with your community</p>
        </div>
        <Link href="/dashboard/campaigns/new"
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
          style={{ background: '#22C55E', boxShadow: '0 2px 12px rgba(34,197,94,0.3)' }}>
          <PlusIcon className="h-4 w-4" />
          New Campaign
        </Link>
      </div>

      {/* Onboarding */}
      {onboarding.shouldShow && user?.email && (
        <OnboardingChecklist
          steps={onboarding.steps}
          completedCount={onboarding.completedCount}
          totalCount={onboarding.totalCount}
          userEmail={user.email}
          prefillFromEmail={user.email}
        />
      )}

      {/* ── KPI cards ─────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Subscribers"
          value={formatNumber(contactCount)}
          sub={newThisWeek > 0 ? `+${formatNumber(newThisWeek)} this week` : 'Active subscribers'}
          subGreen={newThisWeek > 0}
          icon={<UsersIcon className="h-4 w-4" />}
        />
        <KpiCard
          label="Revenue from Email"
          value={totalRevenueCents > 0 ? `$${(totalRevenueCents / 100).toFixed(0)}` : '—'}
          sub={totalRevenueCents > 0 ? 'All time' : 'Set up Whop webhook'}
          icon={<TrendingUpIcon className="h-4 w-4" />}
          accent
        />
        <KpiCard
          label="Avg Open Rate"
          value={sentCampaigns.length > 0 ? avgOpenRate.toFixed(1) + '%' : '—'}
          sub="Last 6 campaigns"
          subGreen={avgOpenRate >= 20}
          icon={<MailIcon className="h-4 w-4" />}
        />
        <KpiCard
          label="Avg Click Rate"
          value={sentCampaigns.length > 0 ? avgClickRate.toFixed(1) + '%' : '—'}
          sub="Last 6 campaigns"
          subGreen={avgClickRate >= 2}
          icon={<MousePointerClickIcon className="h-4 w-4" />}
        />
      </div>

      {/* ── Recent campaigns ──────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">Recent Campaigns</h2>
          <Link href="/dashboard/campaigns" className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200 transition-colors">
            View all <ArrowRightIcon className="h-3 w-3" />
          </Link>
        </div>

        {recentCampaigns.length === 0 ? (
          <EmptyState
            title="No campaigns yet"
            description="Create your first campaign to start emailing your community"
            action={{ label: 'Create campaign', href: '/dashboard/campaigns/new' }}
          />
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid hsl(222 25% 16%)' }}>
            <table className="w-full text-sm">
              <thead style={{ background: 'hsl(222 35% 9%)', borderBottom: '1px solid hsl(222 25% 16%)' }}>
                <tr>
                  {['Campaign', 'Status', 'Sent', 'Opens', 'Clicks', 'Revenue', 'Date'].map((h) => (
                    <th key={h} className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 ${h === 'Campaign' ? 'text-left' : 'text-right'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentCampaigns.map((c, i) => (
                  <tr key={c.id}
                    className="group transition-colors"
                    style={{
                      borderBottom: i < recentCampaigns.length - 1 ? '1px solid hsl(222 25% 13%)' : undefined,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'hsl(222 35% 11%)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td className="px-4 py-3.5">
                      <Link href={`/dashboard/campaigns/${c.id}`} className="font-medium text-zinc-200 hover:text-emerald-400 transition-colors">{c.name}</Link>
                      <p className="text-xs text-zinc-600 truncate max-w-[200px] mt-0.5">{c.subject}</p>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[c.status] ?? 'badge-draft'}`}>
                        {c.status.charAt(0) + c.status.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right text-zinc-400 tabular-nums">{c.totalSent > 0 ? formatNumber(c.totalSent) : '—'}</td>
                    <td className="px-4 py-3.5 text-right tabular-nums">
                      {c.totalSent > 0
                        ? <span className={((c.totalOpened / c.totalSent) * 100) >= 20 ? 'text-emerald-400 font-medium' : 'text-zinc-400'}>
                            {((c.totalOpened / c.totalSent) * 100).toFixed(1)}%
                          </span>
                        : <span className="text-zinc-600">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums">
                      {c.totalSent > 0
                        ? <span className="text-zinc-400">{((c.totalClicked / c.totalSent) * 100).toFixed(1)}%</span>
                        : <span className="text-zinc-600">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums">
                      {c.totalRevenue > 0
                        ? <span className="text-emerald-400 font-semibold">${(c.totalRevenue / 100).toFixed(0)}</span>
                        : <span className="text-zinc-600">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-right text-xs text-zinc-600">{formatDate(c.sentAt ?? c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Quick actions ─────────────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <ActionCard icon={<PlusIcon className="h-4 w-4" />} title="Create Campaign"
            description="Send an email to your subscribers" href="/dashboard/campaigns/new" primary />
          <ActionCard icon={<SparklesIcon className="h-4 w-4" />} title="AI Sequence Builder"
            description="Generate a full launch sequence with AI" href="/dashboard/campaigns/sequence" />
          <ActionCard icon={<UploadIcon className="h-4 w-4" />} title="Import Contacts"
            description="Upload a CSV or sync from Whop" href="/dashboard/contacts" />
        </div>
      </section>
    </div>
  );
}

/* ── Sub-components ────────────────────────────────────── */

function KpiCard({ label, value, sub, subGreen, icon, accent }: {
  label: string; value: string; sub: string; subGreen?: boolean; icon: React.ReactNode; accent?: boolean;
}) {
  return (
    <div className="rounded-2xl p-5 card-hover"
      style={{ background: 'hsl(222 35% 9%)', border: '1px solid hsl(222 25% 16%)' }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ background: accent ? 'rgba(34,197,94,0.12)' : 'hsl(222 25% 14%)' }}>
          <span className={accent ? 'text-emerald-400' : 'text-zinc-500'}>{icon}</span>
        </div>
      </div>
      <p className="text-3xl font-bold text-white" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}>
        {value}
      </p>
      <p className={`mt-1 text-xs font-medium ${subGreen ? 'text-emerald-400' : 'text-zinc-600'}`}>{sub}</p>
    </div>
  );
}

function EmptyState({ title, description, action }: { title: string; description: string; action?: { label: string; href: string } }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl py-16 text-center"
      style={{ border: '1px dashed hsl(222 25% 18%)', background: 'hsl(222 35% 8%)' }}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full mb-4"
        style={{ background: 'hsl(222 25% 14%)' }}>
        <MailIcon className="h-5 w-5 text-zinc-500" />
      </div>
      <p className="text-sm font-semibold text-zinc-300">{title}</p>
      <p className="mt-1 text-xs text-zinc-600 max-w-xs">{description}</p>
      {action && (
        <Link href={action.href}
          className="mt-5 flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-all"
          style={{ background: '#22C55E', boxShadow: '0 2px 12px rgba(34,197,94,0.3)' }}>
          <PlusIcon className="h-4 w-4" />
          {action.label}
        </Link>
      )}
    </div>
  );
}

function ActionCard({ icon, title, description, href, primary }: {
  icon: React.ReactNode; title: string; description: string; href: string; primary?: boolean;
}) {
  return (
    <Link href={href}
      className="group flex items-start gap-3 rounded-2xl p-4 transition-all card-hover"
      style={{
        background: primary ? 'rgba(34,197,94,0.06)' : 'hsl(222 35% 9%)',
        border: primary ? '1px solid rgba(34,197,94,0.2)' : '1px solid hsl(222 25% 16%)',
      }}>
      <div className="flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0 transition-colors"
        style={{ background: primary ? 'rgba(34,197,94,0.15)' : 'hsl(222 25% 14%)' }}>
        <span className={primary ? 'text-emerald-400' : 'text-zinc-500 group-hover:text-zinc-300'}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-zinc-200">{title}</p>
        <p className="mt-0.5 text-xs text-zinc-600">{description}</p>
      </div>
      <ArrowRightIcon className="h-3.5 w-3.5 text-zinc-600 flex-shrink-0 mt-1 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
