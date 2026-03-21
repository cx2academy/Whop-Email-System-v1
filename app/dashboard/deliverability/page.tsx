/**
 * app/dashboard/deliverability/page.tsx
 * Inbox health — no client component imports, pure server render
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { requireWorkspaceAccess } from '@/lib/auth/session';
import { db } from '@/lib/db/client';
import { ShieldCheckIcon, CheckCircleIcon, AlertTriangleIcon, XCircleIcon, ExternalLinkIcon } from 'lucide-react';

export const metadata: Metadata = { title: 'Inbox health' };

export default async function DeliverabilityPage() {
  const { workspaceId } = await requireWorkspaceAccess();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000);

  const [domains, recentReports] = await Promise.all([
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
  ]);

  const [bouncedCount, complainedCount, totalSent] = await Promise.all([
    db.emailSend.count({ where: { workspaceId, status: 'BOUNCED',    sentAt: { gte: thirtyDaysAgo } } }),
    db.emailSend.count({ where: { workspaceId, status: 'COMPLAINED', sentAt: { gte: thirtyDaysAgo } } }),
    db.emailSend.count({ where: { workspaceId, sentAt: { gte: thirtyDaysAgo } } }),
  ]);

  const bounceRate    = totalSent > 0 ? ((bouncedCount    / totalSent) * 100).toFixed(2)  : '0.00';
  const complaintRate = totalSent > 0 ? ((complainedCount / totalSent) * 100).toFixed(3) : '0.000';

  const primaryDomain = domains[0] ?? null;
  const hasActivity   = totalSent > 0 || domains.length > 0 || recentReports.length > 0;

  const bounceStatus    = parseFloat(bounceRate)    > 5   ? 'bad'  : parseFloat(bounceRate)    > 2    ? 'warn' : 'good';
  const complaintStatus = parseFloat(complaintRate) > 0.1 ? 'bad'  : parseFloat(complaintRate) > 0.05 ? 'warn' : 'good';
  const domainStatus    = !primaryDomain ? 'warn'
    : primaryDomain.spfVerified && primaryDomain.dkimVerified ? 'good' : 'warn';

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', letterSpacing: '-0.03em' }}
        >
          Inbox health
        </h1>
        <p className="mt-0.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {hasActivity ? 'Domain reputation and deliverability signals' : 'Land in the inbox, not spam'}
        </p>
      </div>

      {/* ── No activity yet ─────────────────────────────────────────────────── */}
      {!hasActivity && (
        <div className="space-y-4">

          {/* Empty state hero */}
          <div
            className="rounded-xl p-10 text-center"
            style={{ border: '1.5px dashed var(--sidebar-border)', background: 'var(--surface-card)' }}
          >
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl mb-5"
              style={{ background: '#FFF7ED' }}
            >
              <ShieldCheckIcon className="h-6 w-6" style={{ color: '#EA580C' }} />
            </div>
            <p className="text-base font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>
              Set up your sending domain
            </p>
            <p className="text-sm max-w-sm mx-auto mb-8 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              A custom domain dramatically improves open rates and keeps your emails out of spam. Takes about 5 minutes.
            </p>

            {/* Steps */}
            <div className="max-w-xs mx-auto text-left space-y-2 mb-8">
              {[
                'Add your domain (e.g. mail.yourbrand.com)',
                'Copy 3 DNS records to your registrar',
                'Verify — SPF, DKIM, DMARC all green',
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                    style={{ background: 'var(--brand-tint)', color: '#16A34A' }}
                  >
                    {i + 1}
                  </div>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{step}</p>
                </div>
              ))}
            </div>

            <Link
              href="/dashboard/settings?tab=integrations"
              className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'var(--brand)' }}
            >
              Set up domain in Settings
              <ExternalLinkIcon className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* What good deliverability looks like */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Bounce rate', target: 'Keep below 2%', color: '#F0FDF4', textColor: '#16A34A' },
              { label: 'Complaint rate', target: 'Keep below 0.1%', color: '#FFF7ED', textColor: '#EA580C' },
              { label: 'SPF + DKIM', target: 'Must be verified', color: '#F0F9FF', textColor: '#0284C7' },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl px-4 py-4 text-center"
                style={{ background: 'var(--surface-card)', border: '1px solid var(--sidebar-border)' }}
              >
                <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-tertiary)' }}>{item.label}</p>
                <p className="text-sm font-semibold" style={{ color: item.textColor }}>{item.target}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Has activity ────────────────────────────────────────────────────── */}
      {hasActivity && (
        <div className="space-y-5">

          {/* Health metric cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <HealthCard
              label="Bounce rate (30d)"
              value={`${bounceRate}%`}
              status={bounceStatus}
              threshold="Target: below 2%"
            />
            <HealthCard
              label="Complaint rate (30d)"
              value={`${complaintRate}%`}
              status={complaintStatus}
              threshold="Target: below 0.1%"
            />
            <HealthCard
              label="Emails sent (30d)"
              value={totalSent.toLocaleString()}
              status="neutral"
            />
            <HealthCard
              label="Sending domain"
              value={primaryDomain ? primaryDomain.domain : 'Not set'}
              status={domainStatus}
              threshold={
                !primaryDomain
                  ? 'Set up a domain'
                  : primaryDomain.spfVerified && primaryDomain.dkimVerified
                  ? 'Verified'
                  : 'Needs verification'
              }
              href={!primaryDomain || (!primaryDomain.spfVerified || !primaryDomain.dkimVerified)
                ? '/dashboard/settings?tab=integrations'
                : undefined}
            />
          </div>

          {/* Domain not set — inline nudge */}
          {!primaryDomain && (
            <div
              className="rounded-xl px-5 py-4 flex items-center justify-between"
              style={{ background: '#FFFBEB', border: '1px solid #FCD34D' }}
            >
              <div className="flex items-center gap-3">
                <AlertTriangleIcon className="h-4 w-4 flex-shrink-0" style={{ color: '#D97706' }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#92400E' }}>No sending domain configured</p>
                  <p className="text-xs mt-0.5" style={{ color: '#B45309' }}>
                    Without a custom domain your emails may land in spam.
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/settings?tab=integrations"
                className="flex-shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition-all hover:opacity-90"
                style={{ background: '#D97706', color: '#fff' }}
              >
                Add domain
              </Link>
            </div>
          )}

          {/* Recent deliverability reports */}
          {recentReports.length > 0 && (
            <div
              className="rounded-xl overflow-hidden shadow-card"
              style={{ border: '1px solid var(--sidebar-border)', background: 'var(--surface-card)' }}
            >
              <div
                className="px-5 py-4"
                style={{ borderBottom: '1px solid var(--sidebar-border)', background: 'var(--surface-app)' }}
              >
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Pre-send reports</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                  Spam score checked before every send
                </p>
              </div>
              <table className="w-full text-sm">
                <thead style={{ borderBottom: '1px solid var(--sidebar-border)' }}>
                  <tr>
                    {['Campaign', 'Score', 'Warnings', 'Date'].map((h, i) => (
                      <th
                        key={h}
                        className={`px-5 py-3 text-[11px] font-semibold uppercase tracking-wider ${i === 0 ? 'text-left' : 'text-right'}`}
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentReports.map((r, i) => {
                    const scoreColor = r.score >= 80 ? '#16A34A' : r.score >= 60 ? '#D97706' : '#DC2626';
                    return (
                      <tr
                        key={r.id}
                        className="transition-colors hover:bg-[#F7F8FA]"
                        style={{ borderTop: i > 0 ? '1px solid var(--sidebar-border)' : undefined }}
                      >
                        <td className="px-5 py-4">
                          <Link
                            href={`/dashboard/campaigns/${r.campaign.id}`}
                            className="text-sm font-medium transition-colors hover:text-[#16A34A]"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {r.campaign.name}
                          </Link>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="text-sm font-bold" style={{ color: scoreColor }}>
                            {r.score}
                          </span>
                          <span className="text-xs ml-1" style={{ color: 'var(--text-tertiary)' }}>/100</span>
                        </td>
                        <td className="px-5 py-4 text-right text-sm" style={{ color: r.warnings.length > 0 ? '#D97706' : 'var(--text-tertiary)' }}>
                          {r.warnings.length > 0 ? `${r.warnings.length} warning${r.warnings.length !== 1 ? 's' : ''}` : '—'}
                        </td>
                        <td className="px-5 py-4 text-right text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          {new Date(r.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── HealthCard ────────────────────────────────────────────────────────────────

function HealthCard({ label, value, status, threshold, href }: {
  label: string;
  value: string;
  status: 'good' | 'warn' | 'bad' | 'neutral';
  threshold?: string;
  href?: string;
}) {
  const palette = {
    good:    { bg: '#F0FDF4', border: '#BBF7D0', icon: <CheckCircleIcon  className="h-4 w-4" style={{ color: '#16A34A' }} />, sub: '#16A34A' },
    warn:    { bg: '#FFFBEB', border: '#FCD34D', icon: <AlertTriangleIcon className="h-4 w-4" style={{ color: '#D97706' }} />, sub: '#D97706' },
    bad:     { bg: '#FEF2F2', border: '#FCA5A5', icon: <XCircleIcon       className="h-4 w-4" style={{ color: '#DC2626' }} />, sub: '#DC2626' },
    neutral: { bg: 'var(--surface-card)', border: 'var(--sidebar-border)', icon: null, sub: 'var(--text-tertiary)' },
  };
  const c = palette[status];

  const inner = (
    <div className="rounded-xl p-5" style={{ background: c.bg, border: `1px solid ${c.border}`, height: '100%' }}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
          {label}
        </p>
        {c.icon}
      </div>
      <p
        className="text-[20px] font-bold truncate"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}
      >
        {value}
      </p>
      {threshold && (
        <p className="text-xs mt-1 font-medium" style={{ color: c.sub }}>{threshold}</p>
      )}
    </div>
  );

  if (href) {
    return <Link href={href} className="block transition-opacity hover:opacity-80">{inner}</Link>;
  }
  return inner;
}
