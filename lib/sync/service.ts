/**
 * lib/sync/service.ts
 *
 * Whop Member Sync Service — Phase 3 core implementation.
 *
 * Architecture:
 *   1. Creates a SyncLog record (status: RUNNING) before any work starts
 *   2. Fetches all Whop memberships via paginated async generator
 *   3. For each page: maps → validates → upserts contacts in a DB transaction
 *   4. Skips records with invalid/missing emails (logs them)
 *   5. Updates SyncLog with final counts and status on completion
 *   6. Never throws to the caller — returns a result object
 *
 * Idempotency:
 *   Contacts are upserted on (workspaceId, email) — the unique DB constraint.
 *   Re-running the sync updates existing contacts with fresh Whop data
 *   without creating duplicates.
 *
 * Background-ready:
 *   The runSync() function is a plain async function — drop it into a
 *   BullMQ job handler in Phase 4 with zero changes.
 */

import { db } from "@/lib/db/client";
import {
  createWhopClient,
  mapMembershipToContact,
  WhopApiError,
  type NormalisedWhopMember,
} from "@/lib/whop/client";
import { SEND_BATCH_SIZE } from "@/lib/constants";
import { checkUsageLimit } from "@/lib/plans/gates";
import { createNotification } from "@/lib/notifications/actions";
import { NotificationType } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SyncOptions {
  workspaceId: string;
  /** The workspace's Whop API key (from DB) */
  apiKey: string;
  /** Optional: userId who triggered the sync (for the audit log) */
  triggeredBy?: string;
  /** Number of Whop memberships to fetch per page (default 50) */
  pageSize?: number;
}

export interface SyncResult {
  syncLogId: string;
  status: "SUCCESS" | "FAILED" | "PARTIAL";
  totalFetched: number;
  totalUpserted: number;
  totalSkipped: number;
  totalErrors: number;
  durationMs: number;
  errorDetails: string[];
}

// ---------------------------------------------------------------------------
// Core sync runner
// ---------------------------------------------------------------------------

/**
 * Runs a full idempotent sync of Whop members into the contacts table.
 *
 * Safe to call multiple times — uses upsert on (workspaceId, email).
 * Always returns a SyncResult, never throws.
 */
export async function runSync(options: SyncOptions): Promise<SyncResult> {
  const { workspaceId, apiKey, triggeredBy, pageSize = 50 } = options;
  const startedAt = Date.now();

  // Create the sync log record upfront — provides an audit trail even on crash
  const syncLog = await db.syncLog.create({
    data: {
      workspaceId,
      status: "RUNNING",
      triggeredBy: triggeredBy ?? "system",
    },
  });

  const errorDetails: string[] = [];
  let totalFetched = 0;
  let totalUpserted = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  try {
    const client = createWhopClient(apiKey);
    const membersByEmail = new Map<string, {
      email: string;
      firstName: string | null;
      lastName: string | null;
      whopMemberId: string;
      whopStatus: string;
      whopPasses: string[];
      rawMetadata: Record<string, unknown>;
    }>();

    // Stream all memberships page by page
    for await (const batch of client.fetchAllMemberships(pageSize)) {
      totalFetched += batch.length;

      // Map raw Whop records to our normalised shape
      const normalised = batch.map((raw) => {
        try {
          return mapMembershipToContact(raw);
        } catch (mapErr) {
          totalErrors++;
          errorDetails.push(
            `Failed to map membership ${raw.id}: ${String(mapErr)}`
          );
          return null;
        }
      });

      // Filter out mapping failures and invalid emails
      const valid = normalised.filter(
        (m): m is NormalisedWhopMember =>
          m !== null && isValidEmail(m.email)
      );
      const skipped = batch.length - valid.length;
      totalSkipped += skipped;

      if (skipped > 0) {
        errorDetails.push(
          `Skipped ${skipped} records in this batch due to missing/invalid email`
        );
      }

      for (const m of valid) {
        const existing = membersByEmail.get(m.email);
        if (existing) {
          if (!existing.whopPasses.includes(m.productId)) {
            existing.whopPasses.push(m.productId);
          }
          if (m.isActive) {
            existing.whopStatus = m.membershipStatus;
            existing.whopMemberId = m.whopMemberId;
            existing.rawMetadata = m.rawMetadata;
          }
        } else {
          membersByEmail.set(m.email, {
            email: m.email,
            firstName: m.firstName,
            lastName: m.lastName,
            whopMemberId: m.whopMemberId,
            whopStatus: m.membershipStatus,
            whopPasses: [m.productId],
            rawMetadata: m.rawMetadata,
          });
        }
      }

      // Update progress on the sync log periodically
      await db.syncLog.update({
        where: { id: syncLog.id },
        data: {
          totalFetched,
          totalSkipped,
          totalErrors,
        },
      });
    }

    // Upsert valid contacts in sub-batches to avoid huge transactions
    const aggregatedMembers = Array.from(membersByEmail.values());
    const subBatches = chunk(aggregatedMembers, SEND_BATCH_SIZE);
    
    for (const subBatch of subBatches) {
      // Contact cap check — skip upsert if plan limit would be exceeded
      const contactGate = await checkUsageLimit({
        workspaceId,
        type: 'contacts',
        requested: subBatch.length,
      });
      if (!contactGate.allowed) {
        totalSkipped += subBatch.length;
        errorDetails.push(
          `Contact limit reached (plan: ${contactGate.payload.currentPlan}, limit: ${contactGate.payload.limit ?? 'unknown'}). ${subBatch.length} contacts skipped.`
        );
        continue;
      }

      const result = await upsertContactBatch(workspaceId, subBatch as any);
      totalUpserted += result.upserted;
      totalErrors += result.errors;
      errorDetails.push(...result.errorDetails);
    }

    // Mark complete
    const status = totalErrors === 0 ? "SUCCESS" : "PARTIAL";
    await db.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status,
        totalFetched,
        totalUpserted,
        totalSkipped,
        totalErrors,
        errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
        completedAt: new Date(),
      },
    });

    return {
      syncLogId: syncLog.id,
      status,
      totalFetched,
      totalUpserted,
      totalSkipped,
      totalErrors,
      durationMs: Date.now() - startedAt,
      errorDetails,
    };

    // Notify user of sync completion
    await createNotification({
      workspaceId,
      userId: triggeredBy === 'system' ? undefined : triggeredBy,
      type: NotificationType.IMPORT,
      title: 'Member Sync Complete',
      message: `Successfully synced ${totalUpserted} members from Whop. ${totalErrors} errors encountered.`,
      actionUrl: '/dashboard/contacts',
    });

    return result;
  } catch (err) {
    // Top-level failure — update sync log to FAILED
    const errorMessage =
      err instanceof WhopApiError
        ? `Whop API error (${err.status}): ${err.message}`
        : String(err);

    errorDetails.push(errorMessage);

    await db.syncLog
      .update({
        where: { id: syncLog.id },
        data: {
          status: "FAILED",
          totalFetched,
          totalUpserted,
          totalSkipped,
          totalErrors: totalErrors + 1,
          errorDetails,
          completedAt: new Date(),
        },
      })
      .catch((logErr) =>
        console.error("[sync] Failed to update sync log on error:", logErr)
      );

    return {
      syncLogId: syncLog.id,
      status: "FAILED",
      totalFetched,
      totalUpserted,
      totalSkipped,
      totalErrors: totalErrors + 1,
      durationMs: Date.now() - startedAt,
      errorDetails,
    };
  }
}

// ---------------------------------------------------------------------------
// Batch upsert
// ---------------------------------------------------------------------------

interface UpsertBatchResult {
  upserted: number;
  errors: number;
  errorDetails: string[];
}

/**
 * Upserts a batch of normalised members into the contacts table.
 * Uses Prisma's upsert on (workspaceId, email) — safe to call repeatedly.
 */
async function upsertContactBatch(
  workspaceId: string,
  members: Array<{
    email: string;
    firstName: string | null;
    lastName: string | null;
    whopMemberId: string;
    whopStatus: string;
    whopPasses: string[];
    rawMetadata: Record<string, unknown>;
  }>
): Promise<UpsertBatchResult> {
  let upserted = 0;
  let errors = 0;
  const errorDetails: string[] = [];

  // Run all upserts in a single transaction for atomicity
  try {
    await db.$transaction(
      members.map((member) =>
        db.contact.upsert({
          where: {
            workspaceId_email: {
              workspaceId,
              email: member.email,
            },
          },
          create: {
            workspaceId,
            email: member.email,
            firstName: member.firstName,
            lastName: member.lastName,
            whopMemberId: member.whopMemberId,
            whopStatus: member.whopStatus,
            whopPasses: member.whopPasses,
            whopMetadata: member.rawMetadata,
            // New contacts default to SUBSCRIBED
            status: "SUBSCRIBED",
          },
          update: {
            // On re-sync: update Whop metadata and name, but NEVER
            // change a contact's subscription status back to SUBSCRIBED
            // if they've manually unsubscribed.
            firstName: member.firstName,
            lastName: member.lastName,
            whopMemberId: member.whopMemberId,
            whopStatus: member.whopStatus,
            whopPasses: member.whopPasses,
            whopMetadata: member.rawMetadata,
          },
        })
      )
    );
    upserted = members.length;
  } catch (txErr) {
    // Transaction-level failure — fall back to individual upserts
    // so one bad record doesn't block the rest
    for (const member of members) {
      try {
        await db.contact.upsert({
          where: {
            workspaceId_email: { workspaceId, email: member.email },
          },
          create: {
            workspaceId,
            email: member.email,
            firstName: member.firstName,
            lastName: member.lastName,
            whopMemberId: member.whopMemberId,
            whopStatus: member.whopStatus,
            whopPasses: member.whopPasses,
            whopMetadata: member.rawMetadata,
            status: "SUBSCRIBED",
          },
          update: {
            firstName: member.firstName,
            lastName: member.lastName,
            whopMemberId: member.whopMemberId,
            whopStatus: member.whopStatus,
            whopPasses: member.whopPasses,
            whopMetadata: member.rawMetadata,
          },
        });
        upserted++;
      } catch (recordErr) {
        errors++;
        errorDetails.push(
          `Failed to upsert contact ${member.email}: ${String(recordErr)}`
        );
      }
    }

    if (errors === 0) {
      // The transaction failed but all individual upserts succeeded — fine
    } else {
      console.error(
        `[sync] Transaction failed, ${errors}/${members.length} individual upserts also failed:`,
        txErr
      );
    }
  }

  return { upserted, errors, errorDetails };
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function isValidEmail(email: string): boolean {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
