/**
 * app/dashboard/deliverability/page.tsx
 *
 * Deliverability Intelligence Dashboard.
 * Shows domain health, reputation, bounce/complaint rates,
 * warmup status, and recent pre-send reports.
 */

import type { Metadata } from 'next';
import { requireWorkspaceAccess } from '@/lib/auth/session';
import { db } from '@/lib/db/client';
import { scoreToCategory } from '@/lib/deliverability/reputation-engine';
import { getWarmupGuidance } from '@/lib/deliverability/send-throttle';
import { DomainSetup } from './domain-setup';

export const metadata: Metadata = { title: 'Deliverability' };

export default async function DeliverabilityPage() {
  const { workspaceId } = await requireWorkspaceAccess();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [domains, recentReports, _sendCount, inboxResults] = await Promise.all([
    db.sendingDomain.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    }),
    db.deliverabilityReport.findMany({
      where: { campaign: { workspaceId } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true, score: true, warnings: true, createdAt: true,
        campaign: { select: { name: true, id: true } },
      },
    }),
db.emailSend.count({ where: { workspaceId, sentAt: { gte: thirtyDaysAgo } } }),
    db.inboxTestResult.findMany({
      where: { campaign: { workspaceId } },
      orderBy: { testedAt: 'desc' },
      take: 12,
      select: { provider: true, placement: true, testedAt: true, campaign: { select: { name: true } } },
    }),
  ]);

  const [bouncedCount, complainedCount, totalSent] = await Promise.all([
    db.emailSend.count({ where: { workspaceId, status: 'BOUNCED', sentAt: { gte: thirtyDaysAgo } } }),
    db.emailSend.count({ where: { workspaceId, status: 'COMPLAINED', sentAt: { gte: thirtyDaysAgo } } }),
    db.emailSend.count({ where: { workspaceId, sentAt: { gte: thirtyDaysAgo } } }),
  ]);

  const bounceRate    = totalSent > 0 ? ((bouncedCount / totalSent) * 100).toFixed(2) : '0.00';
  const complaintRate = totalSent > 0 ? ((complainedCount / totalSent) * 100).toFixed(3) : '0.000';

  const primaryDomain = domains[0] ?? null;
  const warmup = primaryDomain ? getWarmupGuidance(primaryDomain.createdAt) : null;
  const repCategory = primaryDomain ? scoreToCategory(primaryDomain.reputationScore) : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Deliverability</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor domain health, sender reputation, and inbox placement
        </p>
      </div>

      {/* Key metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Reputation Score"
          value={primaryDomain ? `${primaryDomain.reputationScore}/100` : '—'}
          sub={repCategory ?? 'No domain registered'}
          color={repCategory === 'excellent' ? 'green' : repCategory === 'good' ? 'blue' : repCategory === 'risky' ? 'yellow' : 'red'}
        />
        <MetricCard
          label="Bounce Rate (30d)"
          value={`${bounceRate}%`}
          sub={bouncedCount > 0 ? `${bouncedCount} bounced` : 'Clean'}
          color={parseFloat(bounceRate) > 5 ? 'red' : parseFloat(bounceRate) > 2 ? 'yellow' : 'green'}
        />
        <MetricCard
          label="Complaint Rate (30d)"
          value={`${complaintRate}%`}
          sub={complainedCount > 0 ? `${complainedCount} complaints` : 'Clean'}
          color={parseFloat(complaintRate) > 0.1 ? 'red' : parseFloat(complaintRate) > 0.05 ? 'yellow' : 'green'}
        />
        <MetricCard
          label="Authentication"
          value={primaryDomain ? (primaryDomain.spfVerified && primaryDomain.dkimVerified ? 'Verified' : 'Incomplete') : 'Not set up'}
          sub={primaryDomain ? `SPF: ${primaryDomain.spfVerified ? '✓' : '✗'} · DKIM: ${primaryDomain.dkimVerified ? '✓' : '✗'}` : 'Register a domain'}
          color={primaryDomain?.spfVerified && primaryDomain?.dkimVerified ? 'green' : 'yellow'}
        />
      </div>

      {/* Domain setup */}
      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-1 text-base font-semibold text-foreground">Sending Domains</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Register and authenticate the domain you send from. SPF + DKIM verification improves inbox placement.
        </p>
        <DomainSetup domains={domains.map((d) => ({
          id: d.id,
          domain: d.domain,
          spfVerified: d.spfVerified,
          dkimVerified: d.dkimVerified,
          dkimSelector: d.dkimSelector,
          dkimPublicKey: d.dkimPublicKey ?? '',
          reputationScore: d.reputationScore,
          createdAt: d.createdAt.toISOString(),
        }))} />
      </section>

      {/* Warmup guidance */}
      {warmup && (
        <section className="rounded-lg border border-blue-200 bg-blue-50 p-5">
          <h2 className="mb-1 text-sm font-semibold text-blue-800">Domain Warmup</h2>
          <p className="text-sm text-blue-700">
            Your domain is <strong>{warmup.daysOld} day(s)</strong> old.{' '}
            {warmup.todayLimit
              ? <>Recommended hourly limit: <strong>{warmup.todayLimit} emails/hr</strong>.</>
              : <>Domain is fully warmed up — no send limits.</>}
          </p>
          {warmup.nextMilestone && (
            <p className="mt-1 text-xs text-blue-600">Next: {warmup.nextMilestone}</p>
          )}
        </section>
      )}

      {/* Recent deliverability reports */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Pre-Send Reports</h2>
        {recentReports.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              No reports yet. Run a deliverability check before sending a campaign.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Campaign</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Score</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Warnings</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentReports.map((r) => {
                  const warnings: string[] = JSON.parse(r.warnings);
                  return (
                    <tr key={r.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium text-foreground">{r.campaign.name}</td>
                      <td className="px-4 py-3 text-center">
                        <ScoreBadge score={r.score} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {warnings.length === 0 ? 'None' : warnings.slice(0, 2).join(' · ')}
                        {warnings.length > 2 && ` +${warnings.length - 2} more`}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {r.createdAt.toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Inbox test results */}
      {inboxResults.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-foreground">Inbox Placement Tests</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {(['gmail', 'outlook', 'yahoo'] as const).map((provider) => {
              const latest = inboxResults.find((r) => r.provider === provider);
              return (
                <div key={provider} className="rounded-lg border border-border bg-card p-4">
                  <p className="mb-1 text-sm font-medium capitalize text-foreground">{provider}</p>
                  {latest ? (
                    <PlacementBadge placement={latest.placement} />
                  ) : (
                    <p className="text-xs text-muted-foreground">Not tested</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MetricCard({ label, value, sub, color }: {
  label: string; value: string; sub: string;
  color: 'green' | 'blue' | 'yellow' | 'red';
}) {
  const colors = {
    green:  'border-green-200 bg-green-50',
    blue:   'border-blue-200 bg-blue-50',
    yellow: 'border-yellow-200 bg-yellow-50',
    red:    'border-red-200 bg-red-50',
  };
  const textColors = { green: 'text-green-800', blue: 'text-blue-800', yellow: 'text-yellow-800', red: 'text-red-800' };
  return (
    <div className={`rounded-lg border p-5 ${colors[color]}`}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${textColors[color]}`}>{value}</p>
      <p className="mt-0.5 text-xs capitalize text-muted-foreground">{sub}</p>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 75 ? 'bg-green-100 text-green-700' : score >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>
      {score}/100
    </span>
  );
}

function PlacementBadge({ placement }: { placement: string }) {
  const styles: Record<string, string> = {
    inbox:      'bg-green-100 text-green-700',
    promotions: 'bg-yellow-100 text-yellow-700',
    spam:       'bg-red-100 text-red-700',
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${styles[placement] ?? ''}`}>
      {placement}
    </span>
  );
}
