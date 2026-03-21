-- Add branding fields to workspaces table
-- logoUrl: optional logo image URL (uploaded or from Whop)
-- brandColor: hex color used in email templates, defaults to RevTray green
-- whopCompanyName: auto-populated when user saves their Whop API key

ALTER TABLE "workspaces"
  ADD COLUMN IF NOT EXISTS "logoUrl"         TEXT,
  ADD COLUMN IF NOT EXISTS "brandColor"      TEXT NOT NULL DEFAULT '#22C55E',
  ADD COLUMN IF NOT EXISTS "whopCompanyName" TEXT;
