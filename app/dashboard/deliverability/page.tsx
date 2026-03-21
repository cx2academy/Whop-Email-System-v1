/**
 * app/dashboard/deliverability/page.tsx
 * Inbox health — strong empty state, clear domain setup path
 */

import type { Metadata } from 'next';
import { requireWorkspaceAccess } from '@/lib/auth/session';
import { db } from '@/lib/db/client';
import { scoreToCategory } from '@/lib/deliverability/reputation-engine';
import { getWarmupGuidance } from '@/lib/deliverability/send-throttle';
import { DomainSetup } from './domain-setup';
import { ShieldCheckIcon, CheckCircleIcon, AlertTriangleIcon, XCircleIcon } from 'lucide-react';

export const metadata: Metadata = { title: 'Inbox health' };

export default async function DeliverabilityPage() {
  const { workspaceId } = await requireWorkspaceAccess();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000);

  const [domains, recentReports, inboxResults, emailProviderConfig] = await Promise.all([
    db.sendingDomain.findMany({ where: { workspaceId }, orderBy: { createdAt: 'desc' } }),
    db.deliverabilityReport.findMany({
      where: { campaign: { workspaceId } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true, score: true, warnings: true, createdAt: true,
        campaign: { select: { name: true, id: true } },
      },
    }),
    db.inboxTestResult.findMany({
      where: { campaign: { workspaceId } },
      orderBy: { testedAt: 'desc' },
      take: 12,
      select: { provider: true, placement: true, testedAt: true, campaign: { select: { name: true } } },
    }),
    db.emailProviderConfig.findUnique({ where: { workspaceId }, select: { provider: true } }),
  ]);

  const [bouncedCount, complainedCount, totalSent] = await Promise.all([
    db.emailSend.count({ where: { workspaceId, status: 'BOUNCED',    sentAt: { gte: thirtyDaysAgo } } }),
    db.emailSend.count({ where: { workspaceId, status: 'COMPLAINED', sentAt: { gte: thirtyDaysAgo } } }),
    db.emailSend.count({ where: { workspaceId, sentAt: { gte: thirtyDaysAgo } } }),
  ]);

  const bounceRate    = totalSent > 0 ? ((bouncedCount    / totalSent) * 100).toFixed(2)  : '0.00';
  const complaintRate = totalSent > 0 ? ((complainedCount / totalSent) * 100).toFixed(3) : '0.000';

  const primaryDomain = domains[0] ?? null;
  const warmup = primaryDomain ? getWarmupGuidance(primaryDomain.createdAt) : null;
  const hasActivity = totalSent > 0 || domains.length > 0 || recentReports.length > 0;

  const bounceStatus    = parseFloat(bounceRate)    > 5 ? 'bad' : parseFloat(bounceRate)    > 2 ? 'warn' : 'good';
  const complaintStatus = parseFloat(complaintRate) > 0.1 ? 'bad' : parseFloat(complaintRate) > 0.05 ? 'warn' : 'good';

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
          Inbox health
        </h1>
        <p className="mt-0.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {hasActivity ? 'Domain reputation and deliverability signals' : 'Land in the inbox, not spam'}
        </p>
      </div>

      {/* Empty state */}
      {!hasActivity ? (
        <div className="space-y-4">
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
            <p className="text-sm max-w-sm mx-auto mb-6 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              A custom domain dramatically improves open rates and prevents your emails from hitting spam. Takes 5 minutes.
            </p>
            <div className="max-w-sm mx-auto text-left space-y-2 mb-6">
              {[
                'Add your domain (e.g. mail.yourbrand.com)',
                'Copy 3 DNS records to your registrar',
                'Verify — SPF, DKIM, DMARC all green',
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <div
                    className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                    style={{ background: 'var(--brand-tint)', color: '#16A34A' }}
                  >
                    {i + 1}
                  </div>
                  {step}
                </div>
              ))}
            </div>
          </div>
          {/* Domain setup wizard below */}
          <DomainSetup workspaceId={workspaceId} />
        </div>
      ) : (
        <div className="space-y-5">

          {/* Health metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <HealthCard label="Bounce rate (30d)" value={`${bounceRate}%`} status={bounceStatus} threshold="Keep below 2%" />
            <HealthCard label="Complaint rate (30d)" value={`${complaintRate}%`} status={complaintStatus} threshold="Keep below 0.1%" />
            <HealthCard label="Emails sent (30d)" value={totalSent.toLocaleString()} status="neutral" />
            <HealthCard
              label="Sending domain"
              value={primaryDomain ? primaryDomain.domain : 'Not set'}
              status={primaryDomain?.spfVerified && primaryDomain?.dkimVerified ? 'good' : 'warn'}
              threshold={primaryDomain ? (primaryDomain.spfVerified && primaryDomain.dkimVerified ? 'Verified' : 'Needs verification') : 'Add a domain'}
            />
          </div>

          {/* Warmup guidance */}
          {warmup && (
            <div
              className="rounded-xl px-5 py-4 flex items-start gap-3"
              style={{ background: '#FFFBEB', border: '1px solid #FCD34D' }}
            >
              <AlertTriangleIcon className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: '#D97706' }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: '#92400E' }}>Domain warmup in progress</p>
                <p className="text-xs mt-0.5" style={{ color: '#B45309' }}>
                  Recommended daily limit: <strong>{warmup.dailyLimit.toLocaleString()} emails</strong>. {warmup.message}
                </p>
              </div>
            </div>
          )}

          {/* Domain setup if no domain */}
          {domains.length === 0 && <DomainSetup workspaceId={workspaceId} />}

          {/* Recent reports */}
          {recentReports.length > 0 && (
            <div
              className="rounded-xl overflow-hidden shadow-card"
              style={{ border: '1px solid var(--sidebar-border)', background: 'var(--surface-card)' }}
            >
              <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--sidebar-border)', background: 'var(--surface-app)' }}>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Pre-send reports</p>
              </div>
              <table className="w-full text-sm">
                <thead style={{ borderBottom: '1px solid var(--sidebar-border)' }}>
                  <tr>
                    {['Campaign', 'Score', 'Warnings', 'Date'].map((h, i) => (
                      <th key={h} className={`px-5 py-3 text-[11px] font-semibold uppercase tracking-wider ${i > 0 ? 'text-right' : 'text-left'}`} style={{ color: 'var(--text-tertiary)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentReports.map((r, i) => {
                    const cat = scoreToCategory(r.score);
                    const scoreColor = r.score >= 80 ? '#16A34A' : r.score >= 60 ? '#D97706' : '#DC2626';
                    return (
                      <tr key={r.id} className="hover:bg-[#F7F8FA] transition-colors" style={{ borderTop: i > 0 ? '1px solid var(--sidebar-border)' : undefined }}>
                        <td className="px-5 py-4 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{r.campaign.name}</td>
                        <td className="px-5 py-4 text-right">
                          <span className="text-sm font-bold" style={{ color: scoreColor }}>{r.score}</span>
                        </td>
                        <td className="px-5 py-4 text-right text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {r.warnings.length > 0 ? r.warnings.length : '—'}
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

function HealthCard({ label, value, status, threshold }: {
  label: string; value: string; status: 'good' | 'warn' | 'bad' | 'neutral'; threshold?: string;
}) {
  const colors = {
    good:    { bg: '#F0FDF4', border: '#BBF7D0', text: '#16A34A', icon: <CheckCircleIcon className="h-4 w-4" /> },
    warn:    { bg: '#FFFBEB', border: '#FCD34D', text: '#D97706', icon: <AlertTriangleIcon className="h-4 w-4" /> },
    bad:     { bg: '#FEF2F2', border: '#FCA5A5', text: '#DC2626', icon: <XCircleIcon className="h-4 w-4" /> },
    neutral: { bg: 'var(--surface-card)', border: 'var(--sidebar-border)', text: 'var(--text-tertiary)', icon: null },
  };
  const c = colors[status];
  return (
    <div className="rounded-xl p-5" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
        <span style={{ color: c.text }}>{c.icon}</span>
      </div>
      <p className="text-[22px] font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
        {value}
      </p>
      {threshold && <p className="text-xs mt-1" style={{ color: c.text }}>{threshold}</p>}
    </div>
  );
}
