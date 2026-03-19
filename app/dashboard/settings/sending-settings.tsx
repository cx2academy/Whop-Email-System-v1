'use client';

/**
 * app/dashboard/settings/sending-settings.tsx
 *
 * Smart Sending settings card.
 *
 * Controls:
 *   - Engagement filter (toggle + day window slider)
 *   - Deduplication (toggle)
 *   - Rate limiting (toggle + emails/minute input)
 *   - Abuse detection (toggle)
 *   - Abuse flag status + clear button (shown only when flagged)
 */

import { useState, useTransition } from 'react';
import { updateSendingSettings, clearWorkspaceAbuseFlag } from '@/lib/sending/actions';
import type { SendingSettingsInput } from '@/lib/sending/actions';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SendingSettingsProps {
  isAdmin: boolean;
  initial: {
    engagementFilterEnabled: boolean;
    engagementFilterDays:    number;
    deduplicationEnabled:    boolean;
    sendRateLimitEnabled:    boolean;
    sendRateLimitPerMinute:  number;
    abuseDetectionEnabled:   boolean;
    abuseFlagged:            boolean;
    abuseFlaggedReason:      string | null;
    abuseFlaggedAt:          string | null; // ISO string
  };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Toggle({
  checked,
  onChange,
  disabled,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  id: string;
}) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-primary' : 'bg-muted-foreground/30',
      ].join(' ')}
    >
      <span
        className={[
          'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform duration-150',
          checked ? 'translate-x-4' : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  );
}

function SettingRow({
  id,
  label,
  description,
  checked,
  onChange,
  disabled,
  children,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <label htmlFor={id} className="block text-sm font-medium text-foreground cursor-pointer">
            {label}
          </label>
          <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{description}</p>
        </div>
        <Toggle id={id} checked={checked} onChange={onChange} disabled={disabled} />
      </div>
      {checked && children && (
        <div className="ml-0 pl-4 border-l-2 border-border">
          {children}
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SendingSettings({ isAdmin, initial }: SendingSettingsProps) {
  const [settings, setSettings] = useState<SendingSettingsInput>({
    engagementFilterEnabled: initial.engagementFilterEnabled,
    engagementFilterDays:    initial.engagementFilterDays,
    deduplicationEnabled:    initial.deduplicationEnabled,
    sendRateLimitEnabled:    initial.sendRateLimitEnabled,
    sendRateLimitPerMinute:  initial.sendRateLimitPerMinute,
    abuseDetectionEnabled:   initial.abuseDetectionEnabled,
  });

  const [abuseFlagged, setAbuseFlagged] = useState(initial.abuseFlagged);
  const [abuseFlaggedReason] = useState(initial.abuseFlaggedReason);
  const [abuseFlaggedAt] = useState(initial.abuseFlaggedAt);

  const [saving, setSaving] = useState(false);
  const [clearingFlag, startClearTransition] = useTransition();
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  function set<K extends keyof SendingSettingsInput>(
    key: K,
    value: SendingSettingsInput[K]
  ) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);

    const result = await updateSendingSettings(settings);

    setSaving(false);
    if (result.success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      setSaveError(result.error ?? 'Failed to save settings.');
    }
  }

  function handleClearFlag() {
    startClearTransition(async () => {
      await clearWorkspaceAbuseFlag();
      setAbuseFlagged(false);
    });
  }

  const disabled = !isAdmin || saving;

  return (
    <div className="space-y-6">

      {/* Abuse flag warning — shown when workspace is blocked */}
      {abuseFlagged && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-4">
          <div className="flex items-start gap-3">
            <svg className="mt-0.5 h-5 w-5 shrink-0 text-destructive" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-destructive text-sm">Sending suspended</p>
              <p className="mt-1 text-xs text-destructive/80">
                {abuseFlaggedReason ?? 'Workspace flagged for abuse signals.'}
              </p>
              {abuseFlaggedAt && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Flagged {new Date(abuseFlaggedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              )}
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={handleClearFlag}
                disabled={clearingFlag}
                className="shrink-0 flex items-center gap-1.5 rounded-md border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
              >
                {clearingFlag && <Spinner />}
                {clearingFlag ? 'Clearing…' : 'Clear flag'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Settings */}
      <div className="divide-y divide-border">

        {/* Engagement filter */}
        <div className="py-4 first:pt-0">
          <SettingRow
            id="engagementFilter"
            label="Engagement filter"
            description="Only send to contacts who opened or clicked an email recently. New contacts with no send history are always included."
            checked={settings.engagementFilterEnabled}
            onChange={(v) => set('engagementFilterEnabled', v)}
            disabled={disabled}
          >
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">
                Engagement window: <span className="text-primary font-semibold">{settings.engagementFilterDays} days</span>
              </label>
              <input
                type="range"
                min={7}
                max={180}
                step={1}
                value={settings.engagementFilterDays}
                onChange={(e) => set('engagementFilterDays', parseInt(e.target.value))}
                disabled={disabled}
                className="w-full h-1.5 accent-primary disabled:opacity-50"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>7 days (aggressive)</span>
                <span>90 days</span>
                <span>180 days (lenient)</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Contacts who haven't opened or clicked in the last {settings.engagementFilterDays} days will be skipped.
                Unengaged contacts hurt your sender reputation.
              </p>
            </div>
          </SettingRow>
        </div>

        {/* Deduplication */}
        <div className="py-4">
          <SettingRow
            id="deduplication"
            label="Deduplication"
            description="Skip duplicate email addresses in the same campaign audience. Prevents the same inbox receiving the same email twice if a contact appears in multiple segments or tags."
            checked={settings.deduplicationEnabled}
            onChange={(v) => set('deduplicationEnabled', v)}
            disabled={disabled}
          />
        </div>

        {/* Rate limiting */}
        <div className="py-4">
          <SettingRow
            id="rateLimit"
            label="Send rate limit"
            description="Cap outbound email volume per minute. Useful for domain warmup or when your email provider has strict rate limits."
            checked={settings.sendRateLimitEnabled}
            onChange={(v) => set('sendRateLimitEnabled', v)}
            disabled={disabled}
          >
            <div className="space-y-2">
              <label htmlFor="rateLimitInput" className="text-xs font-medium text-foreground">
                Maximum emails per minute
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="rateLimitInput"
                  type="number"
                  min={1}
                  max={10000}
                  value={settings.sendRateLimitPerMinute}
                  onChange={(e) => set('sendRateLimitPerMinute', Math.max(1, parseInt(e.target.value) || 1))}
                  disabled={disabled}
                  className="flex h-9 w-28 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                />
                <span className="text-xs text-muted-foreground">emails / minute</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Resend allows ~100/sec on paid plans. Set lower (e.g. 30) during domain warmup.
              </p>
            </div>
          </SettingRow>
        </div>

        {/* Abuse detection */}
        <div className="py-4 last:pb-0">
          <SettingRow
            id="abuseDetection"
            label="Abuse detection"
            description="Automatically pause sending if bounce rate exceeds 10% or complaint rate exceeds 0.5% in the last 7 days. Protects your sender reputation and prevents account suspension by email providers."
            checked={settings.abuseDetectionEnabled}
            onChange={(v) => set('abuseDetectionEnabled', v)}
            disabled={disabled}
          >
            <div className="rounded-md bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Automatic thresholds</p>
              <p>Bounce rate &gt; 10% → suspend sending + flag workspace</p>
              <p>Complaint rate &gt; 0.5% → suspend sending + flag workspace</p>
              <p>Volume spike &gt; 5× daily average → warning (not blocked)</p>
            </div>
          </SettingRow>
        </div>

      </div>

      {/* Save */}
      {isAdmin && (
        <div className="flex items-center gap-3 pt-2 border-t border-border">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {saving && <Spinner />}
            {saving ? 'Saving…' : 'Save settings'}
          </button>
          {saveSuccess && (
            <p className="text-sm text-green-600 dark:text-green-400">Settings saved.</p>
          )}
          {saveError && (
            <p className="text-sm text-destructive">{saveError}</p>
          )}
        </div>
      )}

      {!isAdmin && (
        <p className="text-xs text-muted-foreground">Only workspace Admins and Owners can change sending settings.</p>
      )}
    </div>
  );
}
