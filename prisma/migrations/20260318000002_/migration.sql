-- Migration: domain_search_and_dmarc
-- 1. Add DMARC + Return-Path verification columns to sending_domains
-- 2. New table domain_search_logs — stores affiliate click tracking

-- 1. Extend sending_domains
ALTER TABLE "sending_domains"
  ADD COLUMN IF NOT EXISTS "dmarcVerified"      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "returnPathVerified"  BOOLEAN NOT NULL DEFAULT false,
  -- Provider hint stored at registration time so DNS records are provider-aware
  ADD COLUMN IF NOT EXISTS "emailProvider"       TEXT;

-- 2. Domain search + affiliate click log
--    One row per search/click — used for monetization reporting.
CREATE TABLE "domain_search_logs" (
    "id"             TEXT NOT NULL,
    "workspaceId"    TEXT NOT NULL,
    -- The full domain the user searched for, e.g. "acme.com"
    "domain"         TEXT NOT NULL,
    -- Whether the domain was available at search time
    "available"      BOOLEAN NOT NULL,
    -- TLD price in cents (e.g. 1299 = $12.99/yr) — null if unavailable
    "priceUsd"       INTEGER,
    -- Which registrar link was clicked ('namecheap' | 'godaddy' | 'cloudflare')
    "registrarClicked" TEXT,
    "clickedAt"      TIMESTAMP(3),
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "domain_search_logs_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "domain_search_logs"
  ADD CONSTRAINT "domain_search_logs_workspaceId_fkey"
  FOREIGN KEY ("workspaceId")
  REFERENCES "workspaces"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "domain_search_logs_workspaceId_idx" ON "domain_search_logs"("workspaceId");
CREATE INDEX "domain_search_logs_createdAt_idx"   ON "domain_search_logs"("createdAt");
