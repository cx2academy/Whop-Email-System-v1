'use server';

import { db } from '@/lib/db/client';
import { revalidatePath } from 'next/cache';
import { ensureAdmin } from './utils';

export async function updateWorkspaceCredits(workspaceId: string, credits: number) {
  await ensureAdmin();
  
  await db.workspace.update({
    where: { id: workspaceId },
    data: { aiCredits: credits },
  });

  revalidatePath('/dashboard/admin/users');
}

export async function toggleAbuseFlag(workspaceId: string, flagged: boolean, reason?: string) {
  await ensureAdmin();

  await db.workspace.update({
    where: { id: workspaceId },
    data: { 
      abuseFlagged: flagged,
      abuseFlaggedReason: flagged ? reason : null,
      abuseFlaggedAt: flagged ? new Date() : null,
    },
  });

  revalidatePath('/dashboard/admin/users');
}

import { NotificationType, WorkspacePlan } from '@prisma/client';

export async function broadcastNotification(params: {
  title: string;
  message: string;
  actionUrl?: string;
  audience: 'ALL' | 'FREE_ONLY' | 'PAID_ONLY' | 'SPECIFIC_WORKSPACE';
  specificWorkspaceId?: string;
}) {
  await ensureAdmin();

  const { title, message, actionUrl, audience, specificWorkspaceId } = params;

  let workspaceIds: string[] = [];

  if (audience === 'SPECIFIC_WORKSPACE' && specificWorkspaceId) {
    workspaceIds = [specificWorkspaceId];
  } else {
    const where: any = {};
    if (audience === 'FREE_ONLY') where.plan = WorkspacePlan.FREE;
    if (audience === 'PAID_ONLY') where.plan = { not: WorkspacePlan.FREE };

    const workspaces = await db.workspace.findMany({
      where,
      select: { id: true },
    });
    workspaceIds = workspaces.map((w) => w.id);
  }

  // Batch create notifications
  // Using $transaction to ensure atomicity for small batches, or just Promise.all
  // For massive scale, we might want a background job, but this works for now.
  await Promise.all(
    workspaceIds.map((workspaceId) =>
      db.notification.create({
        data: {
          workspaceId,
          type: NotificationType.SYSTEM,
          title,
          message,
          actionUrl,
        },
      })
    )
  );

  return { success: true, count: workspaceIds.length };
}

export async function getSystemHealth() {
  await ensureAdmin();

  const [
    pendingJobs,
    failedJobs,
    recentLogs,
  ] = await Promise.all([
    db.automationJob.count({ where: { status: 'PENDING' } }),
    db.automationJob.count({ where: { status: 'FAILED' } }),
    db.automationLog.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return {
    pendingJobs,
    failedJobs,
    recentLogs,
  };
}
