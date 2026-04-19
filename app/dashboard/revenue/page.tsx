/**
 * app/dashboard/revenue/page.tsx
 *
 * Revenue attribution — multi-model switcher.
 * All 4 models fetched in parallel on the server; client switches instantly.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { TrendingUpIcon } from 'lucide-react';
import { requireWorkspaceAccess } from '@/lib/auth/session';
import {
  getTopWorkflowsByRevenue,
  getTopSubscribersByRevenue,
  getRecentPurchases,
  getRevenueSummary,
} from '@/lib/attribution/actions';
import {
  getTopCampaignsByModel,
  getRevenueSummaryForModel,
  type AttributionModel,
} from '@/lib/attribution/models';
import { RevenueClient } from './revenue-client';

export const metadata: Metadata = { title: 'Revenue' };

const MODELS: AttributionModel[] = ['last_click', 'first_touch', 'linear', 'time_decay'];

export default async function RevenuePage() {
  const { workspaceId } = await requireWorkspaceAccess();

  // Quick check — does any revenue data exist?
  const summaryRaw = await getRevenueSummary();
  const hasData    =
    !('error' in summaryRaw) &&
    'totalRevenueCents' in summaryRaw &&
    summaryRaw.totalRevenueCents > 0;

  // ── Empty state ────────────────────────────────────────────────────────
  if (!hasData) {
    return (
      <div id="tour-revenue-overview" className="space-y-6">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', letterSpacing: '-0.03em' }}
          >
            Revenue
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Track which emails drive purchases
          </p>
        </div>

        <div
          className="rounded-xl p-10 text-center"
          style={{ border: '1.5px dashed var(--sidebar-border)', background: 'var(--surface-card)' }}
        >
          <div
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl mb-5"
            style={{ background: '#F0FDF4' }}
          >
            <TrendingUpIcon className="h-6 w-6" style={{ color: '#16A34A' }} />
          </div>
          <p className="text-base font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>
            No revenue attributed yet
          </p>
          <p className="text-sm max-w-sm mx-auto mb-8 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            When a subscriber buys within 7 days of clicking an email, the revenue is credited to that campaign automatically.
          </p>
          <div className="max-w-sm mx-auto text-left space-y-2">
            {[
              { n: 1, label: 'Connect Whop webhook', href: '/dashboard/settings?tab=integrations' },
              { n: 2, label: 'Send a campaign',       href: '/dashboard/campaigns/new' },
              { n: 3, label: 'Watch revenue roll in', href: '#' },
            ].map((step) => (
              <div
                key={step.n}
                className="flex items-center gap-3 rounded-lg px-4 py-3"
                style={{ background: 'var(--surface-app)', border: '1px solid var(--sidebar-border)' }}
              >
                <div
                  className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  style={{ background: 'var(--brand-tint)', color: '#16A34A' }}
                >
                  {step.n}
                </div>
                {step.href !== '#' ? (
                  <Link
                    href={step.href}
                    className="text-sm font-medium underline-offset-2 hover:underline"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {step.label}
                  </Link>
                ) : (
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{step.label}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Fetch all models + supporting data in parallel ─────────────────────
  const [modelResults, topWorkflowsRaw, topSubscribersRaw, recentPurchasesRaw] =
    await Promise.all([
      Promise.all(
        MODELS.map(async (m) => {
          const [campaigns, totals] = await Promise.all([
            getTopCampaignsByModel(workspaceId, m, 8),
            getRevenueSummaryForModel(workspaceId, m),
          ]);
          return { model: m, campaigns, ...totals };
        })
      ),
      getTopWorkflowsByRevenue(5),
      getTopSubscribersByRevenue(5),
      getRecentPurchases(15),
    ]);

  // Build the allModels record
  const allModels = Object.fromEntries(
    modelResults.map((r) => [
      r.model,
      {
        campaigns:         r.campaigns,
        totalRevenue:      r.totalRevenue,
        totalRevenueCents: r.totalRevenueCents,
      },
    ])
  ) as Record<AttributionModel, { campaigns: (typeof modelResults)[0]['campaigns']; totalRevenue: string; totalRevenueCents: number }>;

  // Safely unwrap actions that may return error objects
  const topWorkflows    = 'error' in topWorkflowsRaw    ? [] : topWorkflowsRaw;
  const topSubscribers  = 'error' in topSubscribersRaw  ? [] : topSubscribersRaw;
  const recentPurchases = 'error' in recentPurchasesRaw ? [] : recentPurchasesRaw;
  const summary         = 'error' in summaryRaw         ? null : summaryRaw;

  return (
    <div id="tour-revenue-overview" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', letterSpacing: '-0.03em' }}
          >
            Revenue
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Which emails are making you money
          </p>
        </div>
        <a
          href="/api/attribution/export?format=csv"
          className="rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:bg-[#F3F4F6]"
          style={{ border: '1px solid var(--sidebar-border)', color: 'var(--text-secondary)' }}
        >
          Export CSV
        </a>
      </div>

      <RevenueClient
        allModels={allModels}
        topWorkflows={topWorkflows.map((w) => ({
          workflowId:   w.workflowId,
          workflowName: w.workflowName,
          revenue:      w.revenue,
          purchases:    w.purchases,
        }))}
        topSubscribers={topSubscribers.map((s) => ({
          contactId:      s.contactId,
          email:          s.email,
          name:           s.name ?? null,
          totalRevenue:   s.totalRevenue,
          totalPurchases: s.totalPurchases,
        }))}
        recentPurchases={recentPurchases.map((p) => ({
          id:           p.id,
          email:        p.email,
          productName:  p.productName ?? '—',
          amount:       p.amount,
          attributedTo: p.attributedTo ?? '—',
          createdAt:
            typeof p.createdAt === 'string'
              ? p.createdAt
              : new Date(p.createdAt).toISOString(),
        }))}
        totalPurchases={summary?.totalPurchases ?? 0}
        last30Days={summary?.last30Days         ?? '$0.00'}
        last7Days={summary?.last7Days           ?? '$0.00'}
      />
    </div>
  );
}
