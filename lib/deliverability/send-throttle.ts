/**
 * lib/deliverability/send-throttle.ts
 *
 * Send throttle — now backed by WarmupSchedule DB records.
 *
 * Priority order:
 *   1. If a WarmupSchedule.ACTIVE exists → enforce daily limit from schedule
 *   2. If no active schedule → no throttle (unlimited)
 *
 * The old time-based formula is replaced by the DB-driven system.
 * Call startWarmup(domainId) from lib/warmup/actions.ts when a domain
 * is verified to activate a schedule.
 */

import { db } from '@/lib/db/client';
import { getCurrentDay, getDailyLimit, WARMUP_TOTAL_DAYS } from '@/lib/warmup/schedule';

export interface ThrottleResult {
  allowed:      boolean;
  limit:        number | null;  // null = unlimited
  sentThisHour: number;
  remaining:    number | null;  // null = unlimited
  reason:       string;
}

// ---------------------------------------------------------------------------
// getSentToday — count successful sends since midnight
// ---------------------------------------------------------------------------

async function getSentToday(workspaceId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  return db.emailSend.count({
    where: {
      workspaceId,
      sentAt: { gte: startOfDay },
      status: { in: ['SENT', 'DELIVERED', 'OPENED', 'CLICKED'] },
    },
  });
}

// ---------------------------------------------------------------------------
// checkThrottle — main entry point (called by send-engine.ts)
//
// Signature kept identical to the old version so send-engine.ts doesn't change.
// The second arg (domainCreatedAt) is now ignored — we use the DB schedule.
// ---------------------------------------------------------------------------

export async function checkThrottle(
  workspaceId: string,
  _domainCreatedAt?: Date    // kept for backwards compat — no longer used
): Promise<ThrottleResult> {
  // Find active warm-up schedule
  const warmup = await db.warmupSchedule.findFirst({
    where: { workspaceId, status: 'ACTIVE' },
  });

  // No active schedule → unlimited
  if (!warmup) {
    return {
      allowed:      true,
      limit:        null,
      sentThisHour: 0,
      remaining:    null,
      reason:       'No active warm-up — unrestricted',
    };
  }

  const currentDay = getCurrentDay(warmup.startedAt);
  const dailyLimit = getDailyLimit(currentDay);

  // Past the schedule → mark complete and allow
  if (dailyLimit === null || currentDay > WARMUP_TOTAL_DAYS) {
    await db.warmupSchedule.update({
      where: { id: warmup.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
    return {
      allowed:      true,
      limit:        null,
      sentThisHour: 0,
      remaining:    null,
      reason:       'Warm-up complete — unrestricted',
    };
  }

  const sentToday = await getSentToday(workspaceId);
  const remaining = Math.max(0, dailyLimit - sentToday);
  const allowed   = sentToday < dailyLimit;

  return {
    allowed,
    limit:        dailyLimit,
    sentThisHour: sentToday,   // field name kept for compat — now represents daily
    remaining,
    reason: allowed
      ? `Warm-up day ${currentDay}/${WARMUP_TOTAL_DAYS}: ${sentToday.toLocaleString()}/${dailyLimit.toLocaleString()} sent today`
      : `Warm-up day ${currentDay}: daily limit of ${dailyLimit.toLocaleString()} reached. Resumes at midnight.`,
  };
}

// ---------------------------------------------------------------------------
// getWarmupGuidance — UI helper (kept for any existing callers)
// ---------------------------------------------------------------------------

export function getWarmupGuidance(_domainCreatedAt: Date): {
  daysOld:        number;
  todayLimit:     number | null;
  nextMilestone:  string | null;
} {
  // This is now superseded by lib/warmup/actions.ts getWarmupStatus()
  // Kept as a no-op shim so existing import sites don't break.
  return { daysOld: 0, todayLimit: null, nextMilestone: null };
}
