/**
 * app/dashboard/revenue/page.tsx
 * Revenue attribution dashboard.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { requireWorkspaceAccess } from '@/lib/auth/session';
import {
  getRevenueSummary,
  getTopCampaignsByRevenue,
  getTopWorkflowsByRevenue,
  getTopSubscribersByRevenue,
  getRecentPurchases,
} from '@/lib/attribution/actions';

export const metadata: Metadata = { title: 'Revenue' };

export default async function RevenuePage() {
  await requireWorkspaceAccess();

  const [summary, topCampaigns, topWorkflows, topSubscribers, recentPurchases] = await Promise.all([
    getRevenueSummary(),
    getTopCampaignsByRevenue(8),
    getTopWorkflowsByRevenue(5),
    getTopSubscribersByRevenue(5),
    getRecentPurchases(15),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Revenue Attribution</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track which emails and automations drive purchases
          </p>
        </div>
        <a
          href="/api/attribution/export?format=csv"
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          Export CSV ↓
        </a>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total revenue',    value: summary.totalRevenue,   sub: 'all time' },
          { label: 'Last 30 days',     value: summary.last30Days,     sub: 'from email' },
          { label: 'Last 7 days',      value: summary.last7Days,      sub: 'from email' },
          { label: 'Total purchases',  value: summary.totalPurchases, sub: 'attributed' },
        ].map((card) => (
          <div key={card.label} className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{card.value}</p>
            <p className="text-xs text-muted-foreground">{card.sub}</p>
          </div>
        ))}
      </div>

      {summary.totalRevenueCents === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center">
          <p className="text-sm font-medium text-foreground">No revenue attributed yet</p>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
            Record a purchase via the API to start attributing revenue to your campaigns.
            Purchases made within 7 days of an email click are automatically attributed.
          </p>
          <div className="mt-3 rounded-md bg-muted p-3 text-left text-xs font-mono text-muted-foreground max-w-sm mx-auto">
            POST /api/attribution/purchase<br />
            {`{ "email": "...", "amountCents": 4900 }`}
          </div>
        </div>
      )}

      {/* Top campaigns */}
      {topCampaigns.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Top Campaigns by Revenue</h2>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Campaign</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Revenue</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Purchases</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Per email</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Conv. rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {topCampaigns.map((c) => (
                  <tr key={c.campaignId} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/campaigns/${c.campaignId}`}
                        className="font-medium text-foreground hover:text-primary">
                        {c.campaignName}
                      </Link>
                      <p className="text-xs text-muted-foreground truncate max-w-xs">{c.subject}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-foreground">{c.revenue}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{c.purchases}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{c.revenuePerEmail}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{c.conversionRate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top automations */}
        {topWorkflows.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold text-foreground">Top Automations by Revenue</h2>
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Workflow</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Revenue</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Purchases</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {topWorkflows.map((w) => (
                    <tr key={w.workflowId} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/automation/${w.workflowId}`}
                          className="font-medium text-foreground hover:text-primary">
                          {w.workflowName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-foreground">{w.revenue}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{w.purchases}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Top subscribers */}
        {topSubscribers.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold text-foreground">Top Subscribers by Revenue</h2>
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Subscriber</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Revenue</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Purchases</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {topSubscribers.map((s) => (
                    <tr key={s.contactId} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{s.name ?? s.email}</p>
                        {s.name && <p className="text-xs text-muted-foreground">{s.email}</p>}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-foreground">{s.totalRevenue}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{s.totalPurchases}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {/* Recent purchases */}
      {recentPurchases.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Recent Purchases</h2>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Subscriber</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Product</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Attributed to</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentPurchases.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 text-foreground">{p.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.productName}</td>
                    <td className="px-4 py-3 text-right font-medium text-foreground">{p.amount}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{p.attributedTo}</td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
