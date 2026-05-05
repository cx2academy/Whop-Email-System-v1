/**
 * lib/sending/rate-queue.ts
 *
 * Per-minute send rate limiter for campaign sends.
 *
 * Strategy: token-bucket via sliding window.
 *   - We track the number of emails sent in the last 60 seconds using
 *     the EmailSend table (already written to during send).
 *   - Before sending each batch, we check how many slots remain in the
 *     current window and sleep until capacity is available.
 *
 * This is a DB-backed approach — safe across Vercel's serverless functions
 * because it reads from the database rather than in-process memory.
 *
 * Usage:
 *   const limiter = createRateLimiter(workspaceId, 100); // 100/min
 *   await limiter.waitForSlot();  // sleeps if needed
 *   // send email
 *
 * Adding real queue (future):
 *   Replace createRateLimiter with a BullMQ job that yields slots via
 *   rate-limited queue. The call sites don't need to change.
 */

import { db } from '@/lib/db/client';
import { sleep } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Rate limiter factory
// ---------------------------------------------------------------------------

export function createRateLimiter(
  workspaceId: string,
  emailsPerMinute: number
) {
  // Track in-process sends this minute (supplemental to DB count)
  // Resets when the limiter instance is garbage-collected (per-request)
  let inProcessCount = 0;
  let windowStart = Date.now();

  return {
    /**
     * Wait until there's capacity to send one more email.
     * Returns immediately if under the rate limit.
     * Sleeps in 500ms increments if over.
     */
    async waitForSlot(): Promise<void> {
      const maxAttempts = 120; // 60 seconds max wait
      let attempts = 0;

      while (attempts < maxAttempts) {
        const now = Date.now();
        const windowMs = 60_000;
        const windowStartTime = new Date(now - windowMs);

        // Count DB sends in last 60 seconds
        const dbCount = await db.emailSend.count({
          where: {
            workspaceId,
            sentAt: { gte: windowStartTime },
            status: { in: ['SENT', 'DELIVERED', 'OPENED', 'CLICKED'] },
          },
        });

        // Also count in-process sends from this same request batch
        // Reset in-process counter every minute
        if (now - windowStart > windowMs) {
          inProcessCount = 0;
          windowStart = now;
        }

        const totalInWindow = dbCount + inProcessCount;

        if (totalInWindow < emailsPerMinute) {
          // Slot available
          inProcessCount++;
          return;
        }

        // Over limit — wait for oldest sends to fall out of window
        // Sleep 500ms and retry
        await sleep(500);
        attempts++;
      }

      // Timeout — proceed anyway rather than blocking indefinitely
      console.warn(
        `[rate-queue] Rate limit wait timeout for workspace ${workspaceId}. Proceeding.`
      );
    },

    /**
     * Returns current usage as a percentage of the limit.
     * Useful for pre-flight checks and UI display.
     */
    async getUsage(): Promise<{ used: number; limit: number; pct: number }> {
      const windowStartTime = new Date(Date.now() - 60_000);
      const used = await db.emailSend.count({
        where: {
          workspaceId,
          sentAt: { gte: windowStartTime },
          status: { in: ['SENT', 'DELIVERED', 'OPENED', 'CLICKED'] },
        },
      });
      return {
        used,
        limit: emailsPerMinute,
        pct: Math.min(100, Math.round((used / emailsPerMinute) * 100)),
      };
    },
  };
}

export type RateLimiter = ReturnType<typeof createRateLimiter>;
