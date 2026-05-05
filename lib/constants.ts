/**
 * lib/constants.ts
 *
 * Application-wide constants.
 * These values are safe to import in both server and client code.
 */

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

/** Default number of items per page across all list views */
export const DEFAULT_PAGE_SIZE = 25;

/** Maximum items per page (prevents abuse) */
export const MAX_PAGE_SIZE = 100;

// ---------------------------------------------------------------------------
// Campaign limits
// ---------------------------------------------------------------------------

/** Maximum number of recipients per campaign send batch */
export const SEND_BATCH_SIZE = 1; // Resend rate limit: 2/sec

/** Delay between batches in milliseconds (rate limiting) */
export const SEND_BATCH_DELAY_MS = 600; // 600ms = ~1.6 emails/sec

// ---------------------------------------------------------------------------
// Contact limits
// ---------------------------------------------------------------------------

/** Maximum tags per contact */
export const MAX_TAGS_PER_CONTACT = 20;

// ---------------------------------------------------------------------------
// Whop sync
// ---------------------------------------------------------------------------

/** Maximum contacts returned per Whop API page */
export const WHOP_SYNC_PAGE_SIZE = 100;

// ---------------------------------------------------------------------------
// App routes
// ---------------------------------------------------------------------------

export const ROUTES = {
  HOME: "/",
  LOGIN: "/auth/login",
  DASHBOARD: "/dashboard",
  CONTACTS: "/dashboard/contacts",
  CAMPAIGNS: "/dashboard/campaigns",
  SETTINGS: "/dashboard/settings",
} as const;

// ---------------------------------------------------------------------------
// Campaign statuses (mirrors Prisma enum — safe to use client-side)
// ---------------------------------------------------------------------------

export const CAMPAIGN_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  SENDING: "Sending",
  COMPLETED: "Completed",
  FAILED: "Failed",
  PAUSED: "Paused",
};
