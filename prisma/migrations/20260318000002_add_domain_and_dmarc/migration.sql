-- Combined migration: email_provider_configs + domain_search_logs + sending_domain extensions
-- Run: npx prisma migrate deploy

-- 1. Email provider type enum
DO $$ BEGIN
  CREATE TYPE "EmailProviderType" AS ENUM ('RESEND', 'SES', 'SENDGRID');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Extend EmailProvider enum used on email_sends
ALTER TYPE "EmailProvider" ADD VALUE IF NOT EXISTS 'SES';
ALTER TYPE "EmailProvider" ADD VALUE IF NOT EXISTS 'SENDGRID';

-- 3. Email provider config table (one per workspace)
CREATE TABLE IF NOT EXISTS "email_provider_configs" (
    "id"           TEXT NOT NULL,
    "workspaceId"  TEXT NOT NULL,
    "provider"     "EmailProviderType" NOT NULL,
    "encryptedKey" TEXT NOT NULL,
    "metadata"     TEXT NOT NULL DEFAULT '{}',
    "isVerified"   BOOLEAN NOT NULL DEFAULT false,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "email_provider_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "email_provider_configs_workspaceId_key"
    ON "email_provider_configs"("workspaceId");

ALTER TABLE "email_provider_configs"
    DROP CONSTRAINT IF EXISTS "email_provider_configs_workspaceId_fkey";

ALTER TABLE "email_provider_configs"
    ADD CONSTRAINT "email_provider_configs_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. Extend sending_domains with DMARC, Return-Path, and provider hint
ALTER TABLE "sending_domains"
    ADD COLUMN IF NOT EXISTS "dmarcVerified"     BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "returnPathVerified" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "emailProvider"      TEXT;

-- 5. Domain search log table (affiliate tracking)
CREATE TABLE IF NOT EXISTS "domain_search_logs" (
    "id"               TEXT NOT NULL,
    "workspaceId"      TEXT NOT NULL,
    "domain"           TEXT NOT NULL,
    "available"        BOOLEAN NOT NULL,
    "priceUsd"         INTEGER,
    "registrarClicked" TEXT,
    "clickedAt"        TIMESTAMP(3),
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "domain_search_logs_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "domain_search_logs"
    DROP CONSTRAINT IF EXISTS "domain_search_logs_workspaceId_fkey";

ALTER TABLE "domain_search_logs"
    ADD CONSTRAINT "domain_search_logs_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "domain_search_logs_workspaceId_idx" ON "domain_search_logs"("workspaceId");
CREATE INDEX IF NOT EXISTS "domain_search_logs_createdAt_idx"   ON "domain_search_logs"("createdAt");
