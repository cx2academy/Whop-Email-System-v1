/**
 * lib/deliverability/send-throttle.ts
 *
 * Rule-based send throttling for domain warmup.
 *
 * New domains should ramp up slowly to build reputation.
 * ISPs flag sudden high-volume sends from unknown IPs/domains as spam.
 *
 * Warmup schedule (emails per hour):
 *   Day 1  →   50/hr
 *   Day 3  →  150/hr
 *   Day 7  →  500/hr
 *   Day 14 →  unlimited
 *
 * The send engine checks this before dispatching a batch.
 */

import { db } from '@/lib/db/client';

export interface ThrottleResult {
  allowed: boolean;
  limit: number | null;        // null = unlimited
  sentThisHour: number;
  remaining: number | null;    // null = unlimited
  reason: string;
}

// Warmup steps: [daysOld, hourlyLimit]
const WARMUP_SCHEDULE: [number, number][] = [
  [14, Infinity],
  [7,  500],
  [3,  150],
  [0,  50],
];

function getHourlyLimit(domainCreatedAt: Date): number {
  const daysOld = (Date.now() - domainCreatedAt.getTime()) / (1000 * 60 * 60 * 24);
  for (const [days, limit] of WARMUP_SCHEDULE) {
    if (daysOld >= days) return limit;
  }
  return 50;
}

export async function checkThrottle(
  workspaceId: string,
  domainCreatedAt: Date
): Promise<ThrottleResult> {
  const limit = getHourlyLimit(domainCreatedAt);

  if (!isFinite(limit)) {
    return { allowed: true, limit: null, sentThisHour: 0, remaining: null, reason: 'Domain fully warmed up' };
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const sentThisHour = await db.emailSend.count({
    where: {
      workspaceId,
      sentAt: { gte: oneHourAgo },
      status: { in: ['SENT', 'DELIVERED', 'OPENED', 'CLICKED'] },
    },
  });

  const remaining = Math.max(0, limit - sentThisHour);
  const allowed = sentThisHour < limit;

  const daysOld = Math.floor((Date.now() - domainCreatedAt.getTime()) / (1000 * 60 * 60 * 24));

  return {
    allowed,
    limit,
    sentThisHour,
    remaining,
    reason: allowed
      ? `Domain is ${daysOld}d old — limit ${limit}/hr`
      : `Hourly limit reached (${sentThisHour}/${limit}). Resumes in under 1 hour.`,
  };
}

export function getWarmupGuidance(domainCreatedAt: Date): {
  daysOld: number;
  todayLimit: number | null;
  nextMilestone: string | null;
} {
  const daysOld = Math.floor((Date.now() - domainCreatedAt.getTime()) / (1000 * 60 * 60 * 24));
  const limit = getHourlyLimit(domainCreatedAt);

  let nextMilestone: string | null = null;
  if (daysOld < 3)  nextMilestone = `150/hr at day 3 (${3 - daysOld}d away)`;
  else if (daysOld < 7)  nextMilestone = `500/hr at day 7 (${7 - daysOld}d away)`;
  else if (daysOld < 14) nextMilestone = `Unlimited at day 14 (${14 - daysOld}d away)`;

  return {
    daysOld,
    todayLimit: isFinite(limit) ? limit : null,
    nextMilestone,
  };
}
