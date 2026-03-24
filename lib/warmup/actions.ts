'use server';

/**
 * lib/warmup/actions.ts
 *
 * Server actions for domain warm-up management.
 */

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { requireAdminAccess, requireWorkspaceAccess } from '@/lib/auth/session';
import { computeWarmupProgress, getCurrentDay, getDailyLimit, WARMUP_TOTAL_DAYS } from './schedule';

// ---------------------------------------------------------------------------
// Start warm-up for a domain
// Called automatically when a domain is verified, or manually from the UI.
// ---------------------------------------------------------------------------

export async function startWarmup(
  domainId: string
): Promise<{ success: boolean; error?: string }> {
  const { workspaceId } = await requireAdminAccess();

  const domain = await db.sendingDomain.findFirst({
    where: { id: domainId, workspaceId },
  });
  if (!domain) return { success: false, error: 'Domain not found' };

  // Idempotent — if one already exists, resume it
  await db.warmupSchedule.upsert({
    where: { domainId },
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
    data: { status: 'PAUSED', pausedAt: new Date() },
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
    data: { status: 'CANCELLED' },
  });

  revalidatePath('/dashboard/deliverability');
  return { success: true };
}

// ---------------------------------------------------------------------------
// Get today's send count for a workspace (for enforcement)
// ---------------------------------------------------------------------------

async function getSentTodayCount(workspaceId: string): Promise<number> {
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
// Check if a workspace can send given warm-up limits
// Used by send-throttle.ts
// ---------------------------------------------------------------------------

export interface WarmupAllowResult {
  allowed:     boolean;
  reason:      string;
  dailyLimit:  number | null;
  sentToday:   number;
}

export async function checkWarmupAllowed(
  workspaceId: string
): Promise<WarmupAllowResult> {
  // Find active warm-up for any verified domain in this workspace
  const warmup = await db.warmupSchedule.findFirst({
    where: { workspaceId, status: 'ACTIVE' },
    include: { domain: true },
  });

  // No active warmup = no restriction
  if (!warmup) {
    return { allowed: true, reason: 'No active warm-up', dailyLimit: null, sentToday: 0 };
  }

  const currentDay = getCurrentDay(warmup.startedAt);
  const dailyLimit = getDailyLimit(currentDay);

  // Past the schedule = mark complete + allow
  if (dailyLimit === null || currentDay > WARMUP_TOTAL_DAYS) {
    await db.warmupSchedule.update({
      where: { id: warmup.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
    return { allowed: true, reason: 'Warm-up complete', dailyLimit: null, sentToday: 0 };
  }

  const sentToday = await getSentTodayCount(workspaceId);

  if (sentToday >= dailyLimit) {
    return {
      allowed: false,
      reason:  `Warm-up day ${currentDay}: daily limit of ${dailyLimit.toLocaleString()} reached. Resumes tomorrow.`,
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
// Get warm-up status for the UI (deliverability page)
// ---------------------------------------------------------------------------

export interface WarmupStatusResult {
  hasWarmup:    boolean;
  schedule?:    {
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
  };
}

export async function getWarmupStatus(): Promise<WarmupStatusResult> {
  const { workspaceId } = await requireWorkspaceAccess();

  const warmup = await db.warmupSchedule.findFirst({
    where: { workspaceId, status: { in: ['ACTIVE', 'PAUSED'] } },
    include: { domain: { select: { domain: true } } },
    orderBy: { createdAt: 'desc' },
  });

  if (!warmup) return { hasWarmup: false };

  const sentToday = await getSentTodayCount(workspaceId);
  const progress  = computeWarmupProgress(warmup.startedAt, sentToday);

  return {
    hasWarmup: true,
    schedule: {
      id:          warmup.id,
      domainId:    warmup.domainId,
      domainName:  warmup.domain.domain,
      status:      warmup.status,
      startedAt:   warmup.startedAt.toISOString(),
      ...progress,
    },
  };
}

// ---------------------------------------------------------------------------
// Get all completed/active warmups for display
// ---------------------------------------------------------------------------

export async function getAllWarmups() {
  const { workspaceId } = await requireWorkspaceAccess();

  const schedules = await db.warmupSchedule.findMany({
    where: { workspaceId },
    include: { domain: { select: { domain: true } } },
    orderBy: { createdAt: 'desc' },
  });

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
