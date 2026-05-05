'use client';

/**
 * app/dashboard/settings/smart-sending.tsx
 *
 * Exposes smart sending toggles that were fully implemented in the backend
 * (lib/sending/actions.ts, lib/sending/smart-filter.ts) but had no UI.
 *
 * Controls:
 *   - Engagement filter    — skip contacts who haven't opened/clicked recently
 *   - Deduplication        — remove duplicate email addresses per send
 *   - Rate limiting        — cap sends per minute to protect sender reputation
 *   - Abuse detection      — auto-flag suspiciously large or rapid sends
 *
 * WHY THIS WAS MISSING: The DB fields and server actions existed but no
 * component rendered them. Users were stuck with hardcoded defaults.
 */

import { useState, useTransition } from 'react';
import { updateSendingSettings, clearWorkspaceAbuseFlag } from '@/lib/sending/actions';

interface SmartSendingSettingsProps {
  isAdmin: boolean;
  initial: {
    engagementFilterEnabled: boolean;
    engagementFilterDays: number;
    deduplicationEnabled: boolean;
    sendRateLimitEnabled: boolean;
    sendRateLimitPerMinute: number;
    abuseDetectionEnabled: boolean;
    abuseFlagged: boolean;
    abuseFlaggedReason: string | null;
    abuseFlaggedAt: string | null; // ISO string
  };
}

function Toggle({
  checked,
  onChange,
  disabled,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled: boolean;
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
      className="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      style={{ backgroundColor: checked ? 'var(--accent)' : 'var(--sidebar-border)' }}
    >
      <span
        className="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform"
        style={{ transform: checked ? 'translateX(18px)' : 'translateX(2px)' }}
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
  disabled: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="rounded-lg px-4 py-3.5 space-y-3"
      style={{
        background: 'var(--surface-app)',
        border: '1px solid var(--sidebar-border)',
        opacity: disabled ? 0.7 : 1,
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <label htmlFor={id} className="text-sm font-medium cursor-pointer" style={{ color: 'var(--text-primary)' }}>
            {label}
          </label>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
            {description}
          </p>
        </div>
        <Toggle id={id} checked={checked} onChange={onChange} disabled={disabled} />
      </div>
      {checked && children && (
        <div className="pt-1">{children}</div>
      )}
    </div>
  );
}

export function SmartSendingSettings({ isAdmin, initial }: SmartSendingSettingsProps) {
  const [engagementEnabled, setEngagementEnabled] = useState(initial.engagementFilterEnabled);
  const [engagementDays,    setEngagementDays]    = useState(initial.engagementFilterDays);
  const [dedupEnabled,      setDedupEnabled]      = useState(initial.deduplicationEnabled);
  const [rateLimitEnabled,  setRateLimitEnabled]  = useState(initial.sendRateLimitEnabled);
  const [rateLimitPpm,      setRateLimitPpm]      = useState(initial.sendRateLimitPerMinute);
  const [abuseEnabled,      setAbuseEnabled]      = useState(initial.abuseDetectionEnabled);

  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [clearingFlag, setClearingFlag] = useState(false);

  function handleSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateSendingSettings({
        engagementFilterEnabled: engagementEnabled,
        engagementFilterDays:    engagementDays,
        deduplicationEnabled:    dedupEnabled,
        sendRateLimitEnabled:    rateLimitEnabled,
        sendRateLimitPerMinute:  rateLimitPpm,
        abuseDetectionEnabled:   abuseEnabled,
      });
      if (!result.success) {
        setError(result.error ?? 'Failed to save settings.');
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    });
  }

  async function handleClearFlag() {
    setClearingFlag(true);
    await clearWorkspaceAbuseFlag();
    setClearingFlag(false);
  }

  return (
    <div className="space-y-4">

      {/* ── Abuse flag banner ─────────────────────────────────────────── */}
      {initial.abuseFlagged && (
        <div
          className="rounded-lg p-4 flex items-start gap-3"
          style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}
        >
          <span className="text-base mt-0.5">🚨</span>
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: '#DC2626' }}>
              Sending suspended — abuse flag active
            </p>
            <p className="mt-0.5 text-xs" style={{ color: '#991B1B' }}>
              {initial.abuseFlaggedReason ?? 'Abnormal sending pattern detected.'}
              {initial.abuseFlaggedAt && (
                <> · Flagged {new Date(initial.abuseFlaggedAt).toLocaleDateString()}</>
              )}
            </p>
          </div>
          {isAdmin && (
            <button
              disabled={clearingFlag}
              onClick={handleClearFlag}
              className="flex-shrink-0 rounded px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              style={{ background: '#DC2626' }}
            >
              {clearingFlag ? 'Clearing…' : 'Clear flag'}
            </button>
          )}
        </div>
      )}

      {/* ── Engagement filter ─────────────────────────────────────────── */}
      <SettingRow
        id="engagementFilter"
        label="Engagement filter"
        description="Skip contacts who haven't opened or clicked any email in the past N days. New contacts are always included."
        checked={engagementEnabled}
        onChange={setEngagementEnabled}
        disabled={!isAdmin || isPending}
      >
        <div className="flex items-center gap-2">
          <label htmlFor="engagementDays" className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            Window:
          </label>
          <input
            id="engagementDays"
            type="number"
            min={1}
            max={365}
            disabled={!isAdmin || isPending}
            value={engagementDays}
            onChange={(e) => setEngagementDays(Math.max(1, Math.min(365, parseInt(e.target.value) || 30)))}
            className="h-8 w-20 rounded-md border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            style={{ borderColor: 'var(--sidebar-border)' }}
          />
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>days</span>
        </div>
      </SettingRow>

      {/* ── Deduplication ─────────────────────────────────────────────── */}
      <SettingRow
        id="deduplication"
        label="Deduplication"
        description="Remove duplicate email addresses from each send. Prevents the same contact from receiving multiple copies."
        checked={dedupEnabled}
        onChange={setDedupEnabled}
        disabled={!isAdmin || isPending}
      />

      {/* ── Send rate limit ───────────────────────────────────────────── */}
      <SettingRow
        id="rateLimit"
        label="Send rate limit"
        description="Cap the maximum number of emails sent per minute. Useful for warming up new domains or protecting shared IP reputation."
        checked={rateLimitEnabled}
        onChange={setRateLimitEnabled}
        disabled={!isAdmin || isPending}
      >
        <div className="flex items-center gap-2">
          <label htmlFor="rateLimitPpm" className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            Max rate:
          </label>
          <input
            id="rateLimitPpm"
            type="number"
            min={1}
            max={10000}
            disabled={!isAdmin || isPending}
            value={rateLimitPpm}
            onChange={(e) => setRateLimitPpm(Math.max(1, Math.min(10000, parseInt(e.target.value) || 100)))}
            className="h-8 w-24 rounded-md border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            style={{ borderColor: 'var(--sidebar-border)' }}
          />
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>emails / minute</span>
        </div>
      </SettingRow>

      {/* ── Abuse detection ───────────────────────────────────────────── */}
      <SettingRow
        id="abuseDetection"
        label="Abuse detection"
        description="Automatically suspend sending if an abnormally large or rapid burst is detected. Protects your sender reputation."
        checked={abuseEnabled}
        onChange={setAbuseEnabled}
        disabled={!isAdmin || isPending}
      />

      {/* ── Feedback ──────────────────────────────────────────────────── */}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {saved && <p className="text-sm text-green-600">Sending settings saved.</p>}

      {isAdmin && (
        <button
          type="button"
          disabled={isPending}
          onClick={handleSave}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: 'var(--accent)' }}
        >
          {isPending ? 'Saving…' : 'Save settings'}
        </button>
      )}
    </div>
  );
}
