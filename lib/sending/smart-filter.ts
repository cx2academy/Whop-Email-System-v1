/**
 * lib/sending/smart-filter.ts
 *
 * Pre-send contact filtering.
 *
 * Two responsibilities:
 *   1. Engagement filter — drop contacts who haven't opened OR clicked
 *      any email within the configured window (default 30 days).
 *      New contacts (no sends yet) are ALWAYS included so you can
 *      build engagement history with them.
 *
 *   2. Deduplication — remove exact email address duplicates from the
 *      audience list. The idempotency key on EmailSend handles DB-level
 *      dedup during send, but catching it here avoids wasted DB writes.
 *
 * Both filters are opt-in via workspace settings.
 */

import { db } from '@/lib/db/client';
import type { Contact } from '@prisma/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FilterResult {
  passed: Contact[];
  filteredOut: Contact[];
  filteredCount: number;
  reasons: Record<string, number>; // reason → count
}

// ---------------------------------------------------------------------------
// 1. Engagement filter
//
// A contact passes if ANY of these are true:
//   a) They have no EmailSend records (brand new — always include)
//   b) They opened an email within the window
//   c) They clicked an email within the window
//
// "window" = now minus engagementFilterDays
// ---------------------------------------------------------------------------

export async function filterByEngagement(
  contacts: Contact[],
  workspaceId: string,
  windowDays: number
): Promise<FilterResult> {
  if (contacts.length === 0) {
    return { passed: [], filteredOut: [], filteredCount: 0, reasons: {} };
  }

  const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const contactIds = contacts.map((c) => c.id);

  // Fetch the latest send record per contact — we only need to know:
  // 1. Do they have any send at all?
  // 2. Did they open or click within the window?
  //
  // Single query: get the most recent openedAt and clickedAt per contact
  const engagementData = await db.emailSend.groupBy({
    by: ['contactId'],
    where: {
      workspaceId,
      contactId: { in: contactIds },
    },
    _max: {
      openedAt:  true,
      clickedAt: true,
      sentAt:    true,
    },
  });

  // Build a lookup map: contactId → engagement info
  const engagementMap = new Map(
    engagementData.map((row) => [
      row.contactId,
      {
        lastOpenedAt:  row._max.openedAt,
        lastClickedAt: row._max.clickedAt,
        lastSentAt:    row._max.sentAt,
      },
    ])
  );

  const passed: Contact[] = [];
  const filteredOut: Contact[] = [];
  const reasons: Record<string, number> = {};

  for (const contact of contacts) {
    const eng = engagementMap.get(contact.id);

    // Rule a: no send history → always include (new contact)
    if (!eng || !eng.lastSentAt) {
      passed.push(contact);
      continue;
    }

    // Rule b: opened within window
    if (eng.lastOpenedAt && eng.lastOpenedAt >= windowStart) {
      passed.push(contact);
      continue;
    }

    // Rule c: clicked within window
    if (eng.lastClickedAt && eng.lastClickedAt >= windowStart) {
      passed.push(contact);
      continue;
    }

    // Contact has send history but no recent engagement → filter out
    filteredOut.push(contact);
    const reason = `No open/click in ${windowDays}d`;
    reasons[reason] = (reasons[reason] ?? 0) + 1;
  }

  return {
    passed,
    filteredOut,
    filteredCount: filteredOut.length,
    reasons,
  };
}

// ---------------------------------------------------------------------------
// 2. Deduplication
//
// Removes duplicate email addresses from the audience, keeping the first
// occurrence. Case-insensitive comparison.
// ---------------------------------------------------------------------------

export function deduplicateContacts(contacts: Contact[]): {
  deduped: Contact[];
  duplicatesRemoved: number;
} {
  const seen = new Set<string>();
  const deduped: Contact[] = [];
  let duplicatesRemoved = 0;

  for (const contact of contacts) {
    const key = contact.email.toLowerCase().trim();
    if (seen.has(key)) {
      duplicatesRemoved++;
    } else {
      seen.add(key);
      deduped.push(contact);
    }
  }

  return { deduped, duplicatesRemoved };
}

// ---------------------------------------------------------------------------
// Combined pre-send filter — applies both filters in sequence
// ---------------------------------------------------------------------------

export interface PreSendFilterOptions {
  engagementFilterEnabled: boolean;
  engagementFilterDays: number;
  deduplicationEnabled: boolean;
  workspaceId: string;
}

export interface PreSendFilterResult {
  audience: Contact[];
  stats: {
    original: number;
    afterDedup: number;
    afterEngagement: number;
    dedupRemoved: number;
    engagementRemoved: number;
  };
}

export async function applyPreSendFilters(
  contacts: Contact[],
  opts: PreSendFilterOptions
): Promise<PreSendFilterResult> {
  const original = contacts.length;

  // Step 1: Deduplication (fast, no DB query)
  let working = contacts;
  let dedupRemoved = 0;

  if (opts.deduplicationEnabled) {
    const { deduped, duplicatesRemoved } = deduplicateContacts(contacts);
    working = deduped;
    dedupRemoved = duplicatesRemoved;
  }

  const afterDedup = working.length;

  // Step 2: Engagement filter (DB query)
  let engagementRemoved = 0;

  if (opts.engagementFilterEnabled) {
    const result = await filterByEngagement(
      working,
      opts.workspaceId,
      opts.engagementFilterDays
    );
    working = result.passed;
    engagementRemoved = result.filteredCount;
  }

  const afterEngagement = working.length;

  return {
    audience: working,
    stats: {
      original,
      afterDedup,
      afterEngagement,
      dedupRemoved,
      engagementRemoved,
    },
  };
}
