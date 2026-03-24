'use client';

/**
 * app/dashboard/deliverability/warmup-panel.tsx
 *
 * Domain warm-up progress panel.
 * Shows a day counter, progress bar, today's limit/sent, and controls.
 */

import { useState, useTransition } from 'react';
import { startWarmup, pauseWarmup, cancelWarmup } from '@/lib/warmup/actions';

interface WarmupSchedule {
  id:          string;
  domainId:    string;
  domainName:  string;
  status:      string;
  startedAt:   string;
  currentDay:  number;
  totalDays:   number;
  dailyLimit:  number | null;
  sentToday:   number;
  progressPct: number;
  nextMilestone: string | null;
  isComplete:  boolean;
  sendsRemainingToday: number | null;
}

interface WarmupPanelProps {
  schedule: WarmupSchedule | null;
  domainId: string | null;   // first verified domain id, to start warmup
  domainName: string | null;
  isAdmin: boolean;
}

function ProgressBar({ pct, status }: { pct: number; status: string }) {
  const color = status === 'COMPLETED' ? '#16A34A'
    : status === 'PAUSED'    ? '#D97706'
    : '#22C55E';

  return (
    <div className="w-full rounded-full overflow-hidden" style={{ height: 8, background: 'var(--surface-app)' }}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, pct)}%`, background: color }}
      />
    </div>
  );
}

function StatPill({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      className="flex-1 rounded-xl px-4 py-3 text-center"
      style={{ background: 'var(--surface-app)', border: '1px solid var(--sidebar-border)' }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>
        {label}
      </p>
      <p className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
        {value}
      </p>
      {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{sub}</p>}
    </div>
  );
}

export function WarmupPanel({ schedule: initialSchedule, domainId, domainName, isAdmin }: WarmupPanelProps) {
  const [schedule, setSchedule]   = useState(initialSchedule);
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg]             = useState('');

  function handleStart() {
    if (!domainId) return;
    startTransition(async () => {
      const r = await startWarmup(domainId);
      if (r.success) {
        setMsg('Warm-up started! Daily limits are now active.');
        // Reload to get fresh schedule data
        window.location.reload();
      } else {
        setMsg(r.error ?? 'Failed to start warm-up');
      }
    });
  }

  function handlePause() {
    if (!schedule) return;
    startTransition(async () => {
      const r = await pauseWarmup(schedule.domainId);
      if (r.success) {
        setSchedule({ ...schedule, status: 'PAUSED' });
        setMsg('Warm-up paused. Sends are now unrestricted until you resume.');
      }
    });
  }

  function handleResume() {
    if (!schedule) return;
    startTransition(async () => {
      const r = await startWarmup(schedule.domainId);
      if (r.success) {
        setSchedule({ ...schedule, status: 'ACTIVE' });
        setMsg('Warm-up resumed.');
      }
    });
  }

  function handleCancel() {
    if (!schedule) return;
    if (!confirm('Cancel warm-up? Daily limits will be removed and your domain reputation may suffer.')) return;
    startTransition(async () => {
      await cancelWarmup(schedule.domainId);
      setSchedule(null);
      setMsg('Warm-up cancelled.');
    });
  }

  // ── No schedule, no domain ──────────────────────────────────────────────

  if (!schedule && !domainId) {
    return (
      <div
        className="rounded-xl px-5 py-5 text-center"
        style={{ border: '1.5px dashed var(--sidebar-border)', background: 'var(--surface-card)' }}
      >
        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          No sending domain configured
        </p>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Add and verify a domain to enable warm-up scheduling.
        </p>
      </div>
    );
  }

  // ── Domain exists but no schedule started ──────────────────────────────

  if (!schedule) {
    return (
      <div
        className="rounded-xl p-5 space-y-4"
        style={{ background: 'var(--surface-card)', border: '1px solid var(--sidebar-border)' }}
      >
        <div className="flex items-start gap-3">
          <div
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg"
            style={{ background: '#FFF7ED' }}
          >
            🔥
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Start domain warm-up
            </p>
            <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Gradually ramp your sends over 22 days to build inbox reputation with Gmail, Outlook, and Apple Mail.
              Skipping warm-up is the #1 cause of new senders landing in spam.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          {[
            { day: 'Day 1', limit: '50 sends' },
            { day: 'Day 7', limit: '1,500 sends' },
            { day: 'Day 22+', limit: 'Unlimited' },
          ].map((m) => (
            <div key={m.day} className="rounded-lg px-3 py-2 text-center" style={{ background: 'var(--surface-app)' }}>
              <p className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{m.day}</p>
              <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{m.limit}</p>
            </div>
          ))}
        </div>

        {msg && <p className="text-xs" style={{ color: 'var(--brand)' }}>{msg}</p>}

        {isAdmin && (
          <button
            onClick={handleStart}
            disabled={isPending}
            className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--brand)', boxShadow: '0 2px 8px rgba(34,197,94,0.22)' }}
          >
            {isPending ? 'Starting…' : `Start warm-up for ${domainName ?? 'domain'}`}
          </button>
        )}
      </div>
    );
  }

  // ── Active / Paused / Complete schedule ───────────────────────────────

  const statusLabel = schedule.isComplete ? 'Complete'
    : schedule.status === 'PAUSED' ? 'Paused'
    : 'Active';

  const statusColor = schedule.isComplete ? '#16A34A'
    : schedule.status === 'PAUSED' ? '#D97706'
    : '#22C55E';

  return (
    <div
      className="rounded-xl p-5 space-y-4"
      style={{ background: 'var(--surface-card)', border: '1px solid var(--sidebar-border)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Warm-up: {schedule.domainName}
            </p>
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
              style={{ background: `${statusColor}18`, color: statusColor }}
            >
              {statusLabel}
            </span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {schedule.isComplete
              ? 'Warm-up complete — your domain is fully established'
              : `Day ${schedule.currentDay} of ${schedule.totalDays}`}
          </p>
        </div>
        {!schedule.isComplete && isAdmin && (
          <div className="flex items-center gap-2">
            {schedule.status === 'ACTIVE' ? (
              <button
                onClick={handlePause}
                disabled={isPending}
                className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
                style={{ border: '1px solid var(--sidebar-border)', color: 'var(--text-secondary)', background: 'none' }}
              >
                Pause
              </button>
            ) : (
              <button
                onClick={handleResume}
                disabled={isPending}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-all disabled:opacity-50"
                style={{ background: 'var(--brand)' }}
              >
                Resume
              </button>
            )}
            <button
              onClick={handleCancel}
              disabled={isPending}
              className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
              style={{ border: '1px solid #FCA5A5', color: '#DC2626', background: 'none' }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <ProgressBar pct={schedule.progressPct} status={schedule.status} />
        <div className="flex justify-between text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
          <span>Day 1</span>
          <span>{schedule.progressPct}% complete</span>
          <span>Day {schedule.totalDays}</span>
        </div>
      </div>

      {/* Stat pills */}
      {!schedule.isComplete && (
        <div className="flex gap-2">
          <StatPill
            label="Today's limit"
            value={schedule.dailyLimit ? schedule.dailyLimit.toLocaleString() : '∞'}
            sub="sends allowed"
          />
          <StatPill
            label="Sent today"
            value={schedule.sentToday.toLocaleString()}
            sub={schedule.dailyLimit ? `of ${schedule.dailyLimit.toLocaleString()}` : 'unlimited'}
          />
          <StatPill
            label="Remaining"
            value={schedule.sendsRemainingToday !== null ? schedule.sendsRemainingToday.toLocaleString() : '∞'}
            sub="today"
          />
        </div>
      )}

      {/* Next milestone */}
      {schedule.nextMilestone && schedule.status === 'ACTIVE' && (
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-2.5"
          style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)' }}
        >
          <span style={{ fontSize: 13 }}>📈</span>
          <p className="text-xs" style={{ color: '#16A34A' }}>
            Next: {schedule.nextMilestone}
          </p>
        </div>
      )}

      {schedule.status === 'PAUSED' && (
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-2.5"
          style={{ background: '#FFFBEB', border: '1px solid #FCD34D' }}
        >
          <span style={{ fontSize: 13 }}>⚠️</span>
          <p className="text-xs" style={{ color: '#92400E' }}>
            Warm-up paused — sends are unrestricted but your domain reputation may not fully develop.
          </p>
        </div>
      )}

      {msg && <p className="text-xs font-medium" style={{ color: 'var(--brand)' }}>{msg}</p>}
    </div>
  );
}
