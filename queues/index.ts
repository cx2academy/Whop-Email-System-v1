/**
 * queues/index.ts
 *
 * Email Send Queue — Database-backed implementation.
 *
 * V1 strategy: uses the EmailSend table as the queue backing store.
 * Jobs are rows with status PENDING/QUEUED. The campaign engine
 * processes them synchronously in batches with rate-limit delays.
 *
 * Migration path to BullMQ (Phase 5+):
 *   Replace DatabaseEmailQueue with BullMQEmailQueue.
 *   The EmailQueue interface and all call sites stay identical.
 *   No other files need to change.
 */

import { db } from "@/lib/db/client";
import { SEND_BATCH_DELAY_MS } from "@/lib/constants";
import { sleep } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface EmailSendJob {
  /** Unique idempotency key: "{campaignId}:{contactId}" or "{campaignId}:{contactId}:B" */
  idempotencyKey: string;
  workspaceId: string;
  campaignId: string;
  contactId: string;
  /** ISO timestamp — delay delivery until this time (for scheduled campaigns) */
  scheduledAt?: string;
}

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export interface EmailQueue {
  enqueue(job: EmailSendJob): Promise<void>;
  enqueueBatch(jobs: EmailSendJob[]): Promise<void>;
  getStats(workspaceId: string, campaignId: string): Promise<QueueStats>;
}

// ---------------------------------------------------------------------------
// Database-backed queue
// ---------------------------------------------------------------------------

/**
 * Uses the EmailSend table as queue storage.
 * Creates PENDING rows on enqueue; the campaign engine processes them.
 *
 * Idempotency: uses upsert on idempotencyKey — safe to call multiple times.
 */
class DatabaseEmailQueue implements EmailQueue {
  async enqueue(job: EmailSendJob): Promise<void> {
    await db.emailSend.upsert({
      where: { idempotencyKey: job.idempotencyKey },
      create: {
        idempotencyKey: job.idempotencyKey,
        workspaceId: job.workspaceId,
        campaignId: job.campaignId,
        contactId: job.contactId,
        status: "PENDING",
        provider: "RESEND",
      },
      update: {}, // Already exists — do nothing (idempotent)
    });
  }

  async enqueueBatch(jobs: EmailSendJob[]): Promise<void> {
    if (jobs.length === 0) return;

    // Insert all in a single transaction; skip existing idempotency keys
    await db.$transaction(
      jobs.map((job) =>
        db.emailSend.upsert({
          where: { idempotencyKey: job.idempotencyKey },
          create: {
            idempotencyKey: job.idempotencyKey,
            workspaceId: job.workspaceId,
            campaignId: job.campaignId,
            contactId: job.contactId,
            status: "PENDING",
            provider: "RESEND",
          },
          update: {},
        })
      )
    );
  }

  async getStats(workspaceId: string, campaignId: string): Promise<QueueStats> {
    const [waiting, active, completed, failed] = await Promise.all([
      db.emailSend.count({
        where: { workspaceId, campaignId, status: { in: ["PENDING", "QUEUED"] } },
      }),
      db.emailSend.count({
        where: { workspaceId, campaignId, status: "SENT" },
      }),
      db.emailSend.count({
        where: { workspaceId, campaignId, status: { in: ["DELIVERED", "OPENED", "CLICKED"] } },
      }),
      db.emailSend.count({
        where: { workspaceId, campaignId, status: { in: ["FAILED", "BOUNCED"] } },
      }),
    ]);

    return { waiting, active, completed, failed, delayed: 0 };
  }
}

export const emailQueue = new DatabaseEmailQueue();

// ---------------------------------------------------------------------------
// Rate-limited batch processor
// ---------------------------------------------------------------------------

export interface ProcessQueueOptions {
  workspaceId: string;
  campaignId: string;
  batchSize?: number;
  onBatch: (sendIds: string[]) => Promise<void>;
}

/**
 * Processes all PENDING sends for a campaign in batches.
 * Pauses SEND_BATCH_DELAY_MS between batches for rate protection.
 *
 * Used by the campaign engine — not called directly by UI code.
 */
export async function processQueue(opts: ProcessQueueOptions): Promise<void> {
  const { workspaceId, campaignId, batchSize = 50, onBatch } = opts;

  while (true) {
    // Atomically claim a batch: PENDING → QUEUED
    const batch = await db.$transaction(async (tx) => {
      const sends = await tx.emailSend.findMany({
        where: { workspaceId, campaignId, status: "PENDING" },
        take: batchSize,
        select: { id: true },
      });
      if (sends.length === 0) return [];
      const ids = sends.map((s) => s.id);
      await tx.emailSend.updateMany({
        where: { id: { in: ids } },
        data: { status: "QUEUED" },
      });
      return ids;
    });

    if (batch.length === 0) break; // Queue drained

    await onBatch(batch);

    if (batch.length === batchSize) {
      // More may remain — pause before next batch
      await sleep(SEND_BATCH_DELAY_MS);
    }
  }
}
