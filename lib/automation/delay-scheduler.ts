/**
 * lib/automation/delay-scheduler.ts
 *
 * Processes pending AutomationJobs whose executeAt has passed.
 *
 * Called by /api/automation/process (Vercel cron, every minute).
 * Also callable manually for testing.
 *
 * Processing loop:
 *   1. Find PENDING jobs where executeAt <= now
 *   2. Mark RUNNING (prevents double-processing)
 *   3. Advance the enrollment
 *   4. Mark COMPLETED or FAILED
 */

import { db } from '@/lib/db/client';
import { advanceEnrollment } from './workflow-engine';

const BATCH_SIZE = 50; // Process up to 50 jobs per cron tick

export interface ProcessResult {
  processed: number;
  failed: number;
  skipped: number;
}

export async function processPendingJobs(): Promise<ProcessResult> {
  const now = new Date();
  let processed = 0;
  let failed = 0;
  let skipped = 0;

  // Claim a batch of ready jobs atomically
  const jobs = await db.automationJob.findMany({
    where: { status: 'PENDING', executeAt: { lte: now } },
    take: BATCH_SIZE,
    orderBy: { executeAt: 'asc' },
    select: { id: true, enrollmentId: true },
  });

  for (const job of jobs) {
    // Mark RUNNING to prevent concurrent processing
    const claimed = await db.automationJob.updateMany({
      where: { id: job.id, status: 'PENDING' },
      data: { status: 'RUNNING', attempts: { increment: 1 } },
    });

    if (claimed.count === 0) {
      skipped++; // Another process claimed it
      continue;
    }

    try {
      await advanceEnrollment(job.enrollmentId);

      await db.automationJob.update({
        where: { id: job.id },
        data: { status: 'COMPLETED', updatedAt: new Date() },
      });

      processed++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      await db.automationJob.update({
        where: { id: job.id },
        data: { status: 'FAILED', errorMessage: message, updatedAt: new Date() },
      });

      failed++;
      console.error(`[scheduler] Job ${job.id} failed: ${message}`);
    }
  }

  return { processed, failed, skipped };
}
