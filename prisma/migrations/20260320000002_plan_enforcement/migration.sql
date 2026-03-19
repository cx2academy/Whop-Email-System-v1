-- Migration: plan_enforcement
-- 1. Extend WorkspacePlan enum with GROWTH and SCALE
-- 2. Add Stripe billing fields to workspaces
-- 3. Add workspace_addons table

-- 1. Extend enum (PostgreSQL ADD VALUE is safe and idempotent)
ALTER TYPE "WorkspacePlan" ADD VALUE IF NOT EXISTS 'GROWTH';
ALTER TYPE "WorkspacePlan" ADD VALUE IF NOT EXISTS 'SCALE';

-- 2. Stripe-ready billing fields on workspaces
ALTER TABLE "workspaces"
  ADD COLUMN IF NOT EXISTS "stripeCustomerId"     TEXT,
  ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT,
  ADD COLUMN IF NOT EXISTS "stripePriceId"        TEXT,
  ADD COLUMN IF NOT EXISTS "billingPeriodStart"   TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "billingPeriodEnd"     TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "trialEndsAt"          TIMESTAMP(3);

-- 3. Add-on type enum
DO $$ BEGIN
  CREATE TYPE "AddonType" AS ENUM ('emails', 'contacts', 'ai_credits');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. workspace_addons table
CREATE TABLE IF NOT EXISTS "workspace_addons" (
    "id"                    TEXT        NOT NULL,
    "workspaceId"           TEXT        NOT NULL,
    "type"                  "AddonType" NOT NULL,
    "quantity"              INTEGER     NOT NULL,
    "stripePaymentIntentId" TEXT,
    "expiresAt"             TIMESTAMP(3),
    "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_addons_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "workspace_addons"
    ADD CONSTRAINT "workspace_addons_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "workspace_addons_workspaceId_idx"
    ON "workspace_addons"("workspaceId");
CREATE INDEX IF NOT EXISTS "workspace_addons_workspaceId_type_idx"
    ON "workspace_addons"("workspaceId", "type");
