-- Migration: add_sending_settings
-- Adds per-workspace smart sending controls to the workspaces table.
-- All columns have safe defaults so existing rows are unaffected.

ALTER TABLE "workspaces"
  -- Engagement filtering: only send to contacts who opened/clicked recently
  ADD COLUMN IF NOT EXISTS "engagementFilterEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "engagementFilterDays"    INTEGER NOT NULL DEFAULT 30,

  -- Deduplication: skip contacts already sent this campaign
  -- (idempotency key already handles this at DB level; this is the UI toggle)
  ADD COLUMN IF NOT EXISTS "deduplicationEnabled"    BOOLEAN NOT NULL DEFAULT true,

  -- Rate limiting: cap outbound emails per minute
  ADD COLUMN IF NOT EXISTS "sendRateLimitEnabled"    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "sendRateLimitPerMinute"  INTEGER NOT NULL DEFAULT 100,

  -- Abuse detection: auto-flag workspace if signals are bad
  ADD COLUMN IF NOT EXISTS "abuseDetectionEnabled"   BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "abuseFlagged"             BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "abuseFlaggedReason"       TEXT,
  ADD COLUMN IF NOT EXISTS "abuseFlaggedAt"           TIMESTAMP(3);
