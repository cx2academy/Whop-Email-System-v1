'use server';

/**
 * lib/warmup/actions.ts
 *
 * Server actions for domain warm-up management.
 * getWarmupStatus() is also safe to call directly from Server Components.
 */

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { requireAdminAccess, requireWorkspaceAccess } from '@/lib/auth/session';
import { computeWarmupProgress, getCurrentDay, getDailyLimit, WARMUP_TOTAL_DAYS } from './schedule';

// ---------------------------------------------------------------------------
// Start warm-up for a domain
// ---------------------------------------------------------------------------

export async function startWarmup(
  domainId: string
): Promise<{ success: boolean; error?: string }> {
  const { workspaceId } = await requireAdminAccess();

  const domain = await db.sendingDomain.findFirst({
    where: { id: domainId, workspaceId },
  });
  if (!domain) return { success: false, error: 'Domain not found' };

  await db.warmupSchedule.upsert({
    where:  { domainId },
    create: { workspaceId, domainId, status: 'ACTIVE', startedAt: new Date() },
    update: { status: 'ACTIVE', pausedAt: null },
  });

  revalidatePath('/dashboard/deliverability');
  return { success: true };
}

// ---------------------------------------------------------------------------
// Pause warm-up
// ---------------------------------------------------------------------------

export async function pauseWarmup(
  domainId: string
): Promise<{ success: boolean; error?: string }> {
  const { workspaceId } = await requireAdminAccess();

  await db.warmupSchedule.updateMany({
    where: { domainId, workspaceId },
    data:  { status: 'PAUSED', pausedAt: new Date() },
  });

  revalidatePath('/dashboard/deliverability');
  return { success: true };
}

// ---------------------------------------------------------------------------
// Cancel warm-up
// ---------------------------------------------------------------------------

export async function cancelWarmup(
  domainId: string
): Promise<{ success: boolean; error?: string }> {
  const { workspaceId } = await requireAdminAccess();

  await db.warmupSchedule.updateMany({
    where: { domainId, workspaceId },
    data:  { status: 'CANCELLED' },
  });

  revalidatePath('/dashboard/deliverability');
  return { success: true };
}

// ---------------------------------------------------------------------------
// getSentTodayCount — internal helper
// ---------------------------------------------------------------------------

async function getSentTodayCount(workspaceId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  return db.emailSend.count({
    where: {
      workspaceId,
      sentAt:  { gte: startOfDay },
      status:  { in: ['SENT', 'DELIVERED', 'OPENED', 'CLICKED'] },
    },
  });
}

// ---------------------------------------------------------------------------
// checkWarmupAllowed — called by send-throttle.ts
// ---------------------------------------------------------------------------

export interface WarmupAllowResult {
  allowed:    boolean;
  reason:     string;
  dailyLimit: number | null;
  sentToday:  number;
}

export async function checkWarmupAllowed(
  workspaceId: string
): Promise<WarmupAllowResult> {
  let warmup;
  try {
    warmup = await db.warmupSchedule.findFirst({
      where: { workspaceId, status: 'ACTIVE' },
    });
  } catch {
    // Table may not exist yet — fail open
    return { allowed: true, reason: 'Warm-up table unavailable', dailyLimit: null, sentToday: 0 };
  }

  if (!warmup) {
    return { allowed: true, reason: 'No active warm-up', dailyLimit: null, sentToday: 0 };
  }

  const currentDay = getCurrentDay(warmup.startedAt);
  const dailyLimit = getDailyLimit(currentDay);

  if (dailyLimit === null || currentDay > WARMUP_TOTAL_DAYS) {
    await db.warmupSchedule.update({
      where: { id: warmup.id },
      data:  { status: 'COMPLETED', completedAt: new Date() },
    });
    return { allowed: true, reason: 'Warm-up complete', dailyLimit: null, sentToday: 0 };
  }

  const sentToday = await getSentTodayCount(workspaceId);

  if (sentToday >= dailyLimit) {
    return {
      allowed:    false,
      reason:     `Warm-up day ${currentDay}: daily limit of ${dailyLimit.toLocaleString()} reached. Resumes at midnight.`,
      dailyLimit,
      sentToday,
    };
  }

  return {
    allowed:    true,
    reason:     `Warm-up day ${currentDay}/${WARMUP_TOTAL_DAYS}: ${sentToday}/${dailyLimit} sent today`,
    dailyLimit,
    sentToday,
  };
}

// ---------------------------------------------------------------------------
// getWarmupStatus — called from Server Component (deliverability page)
// Safe: wraps DB call in try/catch so page never crashes if table is missing.
// ---------------------------------------------------------------------------

export interface WarmupStatusResult {
  hasWarmup: boolean;
  schedule?: {
    id:           string;
    domainId:     string;
    domainName:   string;
    status:       string;
    startedAt:    string;
    currentDay:   number;
    totalDays:    number;
    dailyLimit:   number | null;
    sentToday:    number;
    progressPct:  number;
    nextMilestone: string | null;
    isComplete:   boolean;
    sendsRemainingToday: number | null;
  };
}

export async function getWarmupStatus(): Promise<WarmupStatusResult> {
  const { workspaceId } = await requireWorkspaceAccess();

  let warmup;
  try {
    warmup = await db.warmupSchedule.findFirst({
      where:   { workspaceId, status: { in: ['ACTIVE', 'PAUSED'] } },
      include: { domain: { select: { domain: true } } },
      orderBy: { createdAt: 'desc' },
    });
  } catch {
    // Table doesn't exist yet (migration not run) — return gracefully
    return { hasWarmup: false };
  }

  if (!warmup) return { hasWarmup: false };

  const sentToday = await getSentTodayCount(workspaceId);
  const progress  = computeWarmupProgress(warmup.startedAt, sentToday);

  return {
    hasWarmup: true,
    schedule: {
      id:         warmup.id,
      domainId:   warmup.domainId,
      domainName: warmup.domain.domain,
      status:     warmup.status,
      startedAt:  warmup.startedAt.toISOString(),
      ...progress,
    },
  };
}

// ---------------------------------------------------------------------------
// getAllWarmups — for admin views
// ---------------------------------------------------------------------------

export async function getAllWarmups() {
  const { workspaceId } = await requireWorkspaceAccess();

  let schedules;
  try {
    schedules = await db.warmupSchedule.findMany({
      where:   { workspaceId },
      include: { domain: { select: { domain: true } } },
      orderBy: { createdAt: 'desc' },
    });
  } catch {
    return [];
  }

  const sentToday = await getSentTodayCount(workspaceId);

  return schedules.map((s) => {
    const progress = computeWarmupProgress(s.startedAt, s.status === 'ACTIVE' ? sentToday : 0);
    return {
      id:         s.id,
      domainId:   s.domainId,
      domainName: s.domain.domain,
      status:     s.status,
      startedAt:  s.startedAt.toISOString(),
      ...progress,
    };
  });
}
