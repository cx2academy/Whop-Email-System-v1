/**
 * lib/warmup/schedule.ts
 *
 * Domain warm-up daily volume curve.
 *
 * Warm-up is the single most important deliverability action a new sender
 * can take. ISPs rate new domains by reputation — too many emails too fast
 * = spam folder. This curve follows industry-standard guidance (Mailchimp,
 * SendGrid, Postmark all use similar progressions).
 *
 * Curve: exponential ramp over 22 days → unlimited from day 23+
 */

// ---------------------------------------------------------------------------
// Daily send limits by day number (1-indexed)
// ---------------------------------------------------------------------------

const DAILY_LIMITS: number[] = [
  50,     // Day 1
  100,    // Day 2
  200,    // Day 3
  350,    // Day 4
  600,    // Day 5
  1_000,  // Day 6
  1_500,  // Day 7
  2_500,  // Day 8
  4_000,  // Day 9
  6_000,  // Day 10
  8_000,  // Day 11
  10_000, // Day 12
  13_000, // Day 13
  17_000, // Day 14
  22_000, // Day 15
  28_000, // Day 16
  35_000, // Day 17
  45_000, // Day 18
  60_000, // Day 19
  75_000, // Day 20
  90_000, // Day 21
  120_000,// Day 22
  // Day 23+ = unlimited
];

export const WARMUP_TOTAL_DAYS = DAILY_LIMITS.length; // 22

/**
 * Returns daily limit for a given day number (1-indexed).
 * Returns null = unlimited once past the schedule.
 */
export function getDailyLimit(day: number): number | null {
  if (day < 1) return DAILY_LIMITS[0];
  if (day > WARMUP_TOTAL_DAYS) return null; // unlimited
  return DAILY_LIMITS[day - 1];
}

/**
 * Computes which day of warm-up we're currently on.
 * Day 1 = the first calendar day after startedAt.
 */
export function getCurrentDay(startedAt: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysPassed = Math.floor((Date.now() - startedAt.getTime()) / msPerDay);
  return Math.max(1, daysPassed + 1);
}

/**
 * Progress percentage (0-100) for the warm-up progress bar.
 */
export function getWarmupProgress(startedAt: Date): number {
  const day = getCurrentDay(startedAt);
  if (day > WARMUP_TOTAL_DAYS) return 100;
  return Math.round(((day - 1) / WARMUP_TOTAL_DAYS) * 100);
}

/**
 * Human-readable next milestone label.
 */
export function getNextMilestone(startedAt: Date): string | null {
  const day = getCurrentDay(startedAt);
  if (day > WARMUP_TOTAL_DAYS) return null;

  const nextLimit = getDailyLimit(day + 1);
  if (!nextLimit) return 'Unlimited sends tomorrow';

  const daysUntil = 1;
  return `${nextLimit.toLocaleString()} sends/day in ${daysUntil} day`;
}

/**
 * Full warm-up status object for the UI.
 */
export interface WarmupProgress {
  currentDay:      number;
  totalDays:       number;
  dailyLimit:      number | null;   // null = unlimited
  progressPct:     number;
  nextMilestone:   string | null;
  isComplete:      boolean;
  sendsRemainingToday: number | null; // null = unlimited
}

export function computeWarmupProgress(
  startedAt: Date,
  sentToday: number
): WarmupProgress {
  const currentDay  = getCurrentDay(startedAt);
  const isComplete  = currentDay > WARMUP_TOTAL_DAYS;
  const dailyLimit  = getDailyLimit(currentDay);
  const progressPct = getWarmupProgress(startedAt);

  return {
    currentDay,
    totalDays:  WARMUP_TOTAL_DAYS,
    dailyLimit,
    progressPct,
    nextMilestone: isComplete ? null : getNextMilestone(startedAt),
    isComplete,
    sendsRemainingToday: dailyLimit === null ? null : Math.max(0, dailyLimit - sentToday),
  };
}
