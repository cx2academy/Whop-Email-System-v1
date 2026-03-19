/**
 * lib/sending/abuse-detector.ts
 *
 * Detects abuse signals before and during campaign sends.
 *
 * Signals checked:
 *   1. Bounce rate — if >10% of sends in the last 7 days bounced → flag
 *   2. Complaint rate — if >0.5% complained → flag
 *   3. Volume spike — if workspace is trying to send >5x their 7-day average
 *      in a single campaign → flag for review
 *
 * When flagged:
 *   - Campaign send is blocked
 *   - Workspace.abuseFlagged = true, reason + timestamp stored
 *   - Admin must manually clear via settings
 *
 * Thresholds are conservative — designed to protect sender reputation,
 * not punish legitimate senders. Adjust THRESHOLDS below if needed.
 */

import { db } from '@/lib/db/client';

// ---------------------------------------------------------------------------
// Thresholds
// ---------------------------------------------------------------------------

const THRESHOLDS = {
  /** Bounce rate that triggers flagging (fraction, not percent) */
  maxBounceRate:     0.10,  // 10%
  /** Complaint rate that triggers flagging */
  maxComplaintRate:  0.005, // 0.5%
  /** Minimum sends needed before rates are meaningful */
  minSampleSize:     20,
  /** Days to look back for rate calculations */
  lookbackDays:      7,
  /** Max multiplier vs 7-day average before flagging volume spike */
  maxVolukeSpike:    5,
  /** Minimum average sends/day before spike detection kicks in */
  minDailyAvgForSpike: 10,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AbuseCheckResult {
  allowed: boolean;
  signals: AbuseSignal[];
  flagged: boolean;
}

export interface AbuseSignal {
  type: 'bounce_rate' | 'complaint_rate' | 'volume_spike' | 'already_flagged';
  severity: 'warning' | 'block';
  message: string;
  value?: number;
  threshold?: number;
}

// ---------------------------------------------------------------------------
// Main check — call before dispatching a campaign
// ---------------------------------------------------------------------------

export async function checkAbuseSignals(
  workspaceId: string,
  incomingCampaignSize: number
): Promise<AbuseCheckResult> {
  // Load workspace — check if already flagged
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      abuseFlagged:        true,
      abuseFlaggedReason:  true,
      abuseDetectionEnabled: true,
    },
  });

  if (!workspace) {
    return { allowed: false, flagged: false, signals: [
      { type: 'already_flagged', severity: 'block', message: 'Workspace not found' }
    ]};
  }

  // If detection is disabled, always allow
  if (!workspace.abuseDetectionEnabled) {
    return { allowed: true, flagged: false, signals: [] };
  }

  // If already flagged, block immediately
  if (workspace.abuseFlagged) {
    return {
      allowed: false,
      flagged: true,
      signals: [{
        type: 'already_flagged',
        severity: 'block',
        message: workspace.abuseFlaggedReason ?? 'Workspace flagged for abuse. Contact support to review.',
      }],
    };
  }

  const signals: AbuseSignal[] = [];
  const lookbackStart = new Date(Date.now() - THRESHOLDS.lookbackDays * 24 * 60 * 60 * 1000);

  // Load recent send stats
  const [totalRecent, bouncedRecent, complainedRecent] = await Promise.all([
    db.emailSend.count({
      where: { workspaceId, sentAt: { gte: lookbackStart } },
    }),
    db.emailSend.count({
      where: { workspaceId, sentAt: { gte: lookbackStart }, status: 'BOUNCED' },
    }),
    db.emailSend.count({
      where: { workspaceId, sentAt: { gte: lookbackStart }, status: 'COMPLAINED' },
    }),
  ]);

  // Signal 1: Bounce rate
  if (totalRecent >= THRESHOLDS.minSampleSize) {
    const bounceRate = bouncedRecent / totalRecent;
    if (bounceRate > THRESHOLDS.maxBounceRate) {
      signals.push({
        type: 'bounce_rate',
        severity: 'block',
        message: `Bounce rate ${(bounceRate * 100).toFixed(1)}% exceeds the ${THRESHOLDS.maxBounceRate * 100}% threshold (last ${THRESHOLDS.lookbackDays} days).`,
        value: bounceRate,
        threshold: THRESHOLDS.maxBounceRate,
      });
    }
  }

  // Signal 2: Complaint rate
  if (totalRecent >= THRESHOLDS.minSampleSize) {
    const complaintRate = complainedRecent / totalRecent;
    if (complaintRate > THRESHOLDS.maxComplaintRate) {
      signals.push({
        type: 'complaint_rate',
        severity: 'block',
        message: `Complaint rate ${(complaintRate * 100).toFixed(2)}% exceeds the ${THRESHOLDS.maxComplaintRate * 100}% threshold (last ${THRESHOLDS.lookbackDays} days).`,
        value: complaintRate,
        threshold: THRESHOLDS.maxComplaintRate,
      });
    }
  }

  // Signal 3: Volume spike
  const dailyAvg = totalRecent / THRESHOLDS.lookbackDays;
  if (dailyAvg >= THRESHOLDS.minDailyAvgForSpike) {
    const spike = incomingCampaignSize / dailyAvg;
    if (spike > THRESHOLDS.maxVolukeSpike) {
      signals.push({
        type: 'volume_spike',
        severity: 'warning', // warning only, not block
        message: `Campaign size (${incomingCampaignSize}) is ${spike.toFixed(1)}x your ${THRESHOLDS.lookbackDays}-day daily average (${Math.round(dailyAvg)}/day). Consider warming up gradually.`,
        value: spike,
        threshold: THRESHOLDS.maxVolukeSpike,
      });
    }
  }

  // Any block-severity signal → flag the workspace and deny send
  const blockSignals = signals.filter((s) => s.severity === 'block');
  if (blockSignals.length > 0) {
    const reason = blockSignals.map((s) => s.message).join(' | ');
    await flagWorkspace(workspaceId, reason);
    return { allowed: false, flagged: true, signals };
  }

  return { allowed: true, flagged: false, signals };
}

// ---------------------------------------------------------------------------
// Flag a workspace
// ---------------------------------------------------------------------------

export async function flagWorkspace(
  workspaceId: string,
  reason: string
): Promise<void> {
  await db.workspace.update({
    where: { id: workspaceId },
    data: {
      abuseFlagged:       true,
      abuseFlaggedReason: reason,
      abuseFlaggedAt:     new Date(),
    },
  });
  console.warn(`[abuse-detector] Workspace ${workspaceId} flagged: ${reason}`);
}

// ---------------------------------------------------------------------------
// Clear flag — called from admin settings
// ---------------------------------------------------------------------------

export async function clearAbuseFlag(workspaceId: string): Promise<void> {
  await db.workspace.update({
    where: { id: workspaceId },
    data: {
      abuseFlagged:       false,
      abuseFlaggedReason: null,
      abuseFlaggedAt:     null,
    },
  });
}
