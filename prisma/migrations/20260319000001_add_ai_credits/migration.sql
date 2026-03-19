-- Migration: add_ai_credits
-- 1. Add aiCredits column to workspaces (default 10 free credits on signup)
-- 2. New table ai_credit_logs — immutable ledger of every credit event
--    (deductions, purchases, grants). Append-only by convention.

-- 1. Workspace credits column
ALTER TABLE "workspaces"
  ADD COLUMN IF NOT EXISTS "aiCredits" INTEGER NOT NULL DEFAULT 10;

-- 2. Credit ledger
CREATE TABLE IF NOT EXISTS "ai_credit_logs" (
    "id"          TEXT        NOT NULL,
    "workspaceId" TEXT        NOT NULL,
    -- Negative = deduction, Positive = purchase/grant
    "delta"       INTEGER     NOT NULL,
    -- Balance AFTER this transaction (snapshot for auditability)
    "balanceAfter" INTEGER    NOT NULL,
    -- What caused this entry
    -- Values: feature key (e.g. 'optimizeSubjectLine') | 'purchase' | 'grant'
    "reason"      TEXT        NOT NULL,
    -- Optional reference (campaignId, templateId, purchaseId, etc.)
    "refId"       TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_credit_logs_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ai_credit_logs"
    ADD CONSTRAINT "ai_credit_logs_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "ai_credit_logs_workspaceId_idx"
    ON "ai_credit_logs"("workspaceId");
CREATE INDEX IF NOT EXISTS "ai_credit_logs_createdAt_idx"
    ON "ai_credit_logs"("createdAt");
