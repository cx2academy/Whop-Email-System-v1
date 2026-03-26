/**
 * app/dashboard/settings/page.tsx
 * RevTray settings — tabbed, no scroll marathon
 */

import type { Metadata } from 'next';
import { requireWorkspaceAccess } from '@/lib/auth/session';
import { db } from '@/lib/db/client';
import { WorkspaceSettingsForm } from './settings-form';
import { ApiKeys } from './api-keys';
import { WhopWebhookSettings } from './whop-webhook';
import { PlanBillingSettings } from './plan-billing';
import { BillingSuccessBanner } from './billing-success-banner';
import { EmailProviderSettings } from './email-provider';
import { BrandingSettings } from './branding-settings';
import { SmartSendingSettings } from './smart-sending';
import { getWorkspaceUsage } from '@/lib/plans/gates';
import { getSendingSettings } from '@/lib/sending/actions';
import { SettingsTabs } from './settings-tabs';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; billing_success?: string }>;
}) {
  const params = await searchParams;
  const { workspaceId, workspaceRole } = await requireWorkspaceAccess();
  const isAdmin = workspaceRole === 'OWNER' || workspaceRole === 'ADMIN';

  const [workspace, apiKeys, usage, emailProviderConfig, sendingSettings] = await Promise.all([
    db.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true, name: true, slug: true,
        fromEmail: true, fromName: true,
        plan: true, whopApiKey: true, webhookSecret: true,
        // Branding fields
        logoUrl: true, brandColor: true,
      },
    }),
    db.apiKey.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, keyPrefix: true, lastUsedAt: true, createdAt: true },
    }),
    getWorkspaceUsage(workspaceId).catch(() => null),
    db.emailProviderConfig.findUnique({
      where: { workspaceId },
      select: { provider: true, isVerified: true, createdAt: true },
    }),
    getSendingSettings().catch(() => null),
  ]);

  if (!workspace) return null;

  const activeTab = params.tab ?? 'general';
  const serializedKeys = apiKeys.map((k) => ({
    ...k,
    lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
    createdAt: k.createdAt.toISOString(),
  }));

  const currentProvider = emailProviderConfig
    ? {
        provider: emailProviderConfig.provider as 'RESEND' | 'SES' | 'SENDGRID',
        isVerified: emailProviderConfig.isVerified,
        connectedAt: emailProviderConfig.createdAt.toISOString(),
      }
    : null;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
        >
          Settings
        </h1>
        <p className="mt-0.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Manage your workspace
        </p>
      </div>

      {/* Billing success banner */}
      {params.billing_success && (
        <div className="mb-6">
          <BillingSuccessBanner message={params.billing_success} />
        </div>
      )}

      {/* Tab bar */}
      <SettingsTabs activeTab={activeTab} />

      {/* Tab content */}
      <div className="mt-6 space-y-6">

        {/* ── General ───────────────────────────────────────────────── */}
        {activeTab === 'general' && (
          <>
            <SettingsCard title="Workspace">
              <WorkspaceSettingsForm
                workspace={{
                  name: workspace.name,
                  fromEmail: workspace.fromEmail,
                  fromName: workspace.fromName,
                  hasWhopApiKey: !!workspace.whopApiKey,
                }}
                isAdmin={isAdmin}
              />
            </SettingsCard>

            <SettingsCard title="Data & privacy">
              <div className="space-y-3">
                {[
                  { icon: '🔐', title: 'API keys encrypted at rest', desc: 'Your Whop API key is encrypted with AES-256-GCM before being stored.' },
                  { icon: '🛡️', title: 'Workspace isolation', desc: 'All contacts and campaigns are scoped to your workspace only.' },
                  { icon: '🚫', title: 'Unsubscribes honoured instantly', desc: 'Contacts who unsubscribe are excluded from all future sends in real time.' },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="flex items-start gap-3 rounded-lg px-4 py-3"
                    style={{ background: 'var(--surface-app)', border: '1px solid var(--sidebar-border)' }}
                  >
                    <span className="text-base mt-0.5">{item.icon}</span>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SettingsCard>

            {workspaceRole === 'OWNER' && (
              <DangerZone />
            )}
          </>
        )}

        {/* ── Branding ──────────────────────────────────────────────── */}
        {activeTab === 'branding' && (
          <SettingsCard
            title="Brand identity"
            description="Customize how your brand appears in email templates sent to subscribers."
          >
            <BrandingSettings
              isAdmin={isAdmin}
              initial={{
                logoUrl: workspace.logoUrl ?? null,
                brandColor: workspace.brandColor ?? '#22C55E',
              }}
            />
          </SettingsCard>
        )}

        {/* ── Sending ───────────────────────────────────────────────── */}
        {activeTab === 'sending' && (
          <SettingsCard
            title="Smart sending"
            description="Fine-tune how emails are filtered and throttled before each send."
          >
            {sendingSettings ? (
              <SmartSendingSettings
                isAdmin={isAdmin}
                initial={{
                  engagementFilterEnabled: sendingSettings.engagementFilterEnabled,
                  engagementFilterDays:    sendingSettings.engagementFilterDays,
                  deduplicationEnabled:    sendingSettings.deduplicationEnabled,
                  sendRateLimitEnabled:    sendingSettings.sendRateLimitEnabled,
                  sendRateLimitPerMinute:  sendingSettings.sendRateLimitPerMinute,
                  abuseDetectionEnabled:   sendingSettings.abuseDetectionEnabled,
                  abuseFlagged:            sendingSettings.abuseFlagged,
                  abuseFlaggedReason:      sendingSettings.abuseFlaggedReason ?? null,
                  abuseFlaggedAt:          sendingSettings.abuseFlaggedAt?.toISOString() ?? null,
                }}
              />
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Unable to load sending settings. Please refresh.
              </p>
            )}
          </SettingsCard>
        )}

        {/* ── Billing ───────────────────────────────────────────────── */}
        {activeTab === 'billing' && usage && (
          <SettingsCard title="Plan & billing">
            <PlanBillingSettings usage={usage} isAdmin={isAdmin} />
          </SettingsCard>
        )}

        {/* ── Integrations ──────────────────────────────────────────── */}
        {activeTab === 'integrations' && (
          <>
            <SettingsCard title="Whop webhook" description="Automatically attribute revenue to campaigns when subscribers buy your products.">
              <WhopWebhookSettings
                workspaceId={workspace.id}
                hasSecret={!!workspace.webhookSecret}
                appUrl={process.env.NEXTAUTH_URL ?? 'https://app.revtray.com'}
              />
            </SettingsCard>

            <SettingsCard
              title="Email sending"
              description="Platform sending works out of the box. Optionally connect your own provider for full billing control."
            >
              <EmailProviderSettings isAdmin={isAdmin} current={currentProvider} />
            </SettingsCard>
          </>
        )}

        {/* ── API ───────────────────────────────────────────────────── */}
        {activeTab === 'api' && (
          <SettingsCard
            title="API keys"
            description={
              <>
                Access the <code className="rounded bg-[#F3F4F6] px-1 py-0.5 text-xs">/api/v1</code> endpoints from external tools or agents.
              </>
            }
          >
            {isAdmin ? (
              <ApiKeys initialKeys={serializedKeys} isAdmin={isAdmin} />
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Only admins can manage API keys.</p>
            )}
          </SettingsCard>
        )}

      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function SettingsCard({
  title, description, children,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl p-6 shadow-card"
      style={{ background: 'var(--surface-card)', border: '1px solid var(--sidebar-border)' }}
    >
      <div className="mb-5">
        <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-secondary)' }}>{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

function DangerZone() {
  return (
    <div
      className="rounded-xl p-6 shadow-card"
      style={{ background: 'var(--surface-card)', border: '1px solid #FCA5A5' }}
    >
      <h2 className="text-base font-semibold mb-1" style={{ color: '#DC2626' }}>Danger zone</h2>
      <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
        These actions are permanent and cannot be undone.
      </p>
      <button
        disabled
        className="rounded-lg border px-4 py-2 text-sm font-medium opacity-50 cursor-not-allowed"
        style={{ borderColor: '#FCA5A5', color: '#DC2626' }}
        title="Workspace deletion coming soon"
      >
        Delete workspace
      </button>
    </div>
  );
}
