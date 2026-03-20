-- Migration: whop_billing
-- Replaces Stripe billing fields with Whop-native billing fields.
-- Whop handles payments — we track which Whop product/membership maps to
-- each workspace subscription.

-- Remove Stripe fields (safe — never populated in production)
ALTER TABLE "workspaces"
  DROP COLUMN IF EXISTS "stripeCustomerId",
  DROP COLUMN IF EXISTS "stripeSubscriptionId",
  DROP COLUMN IF EXISTS "stripePriceId",
  DROP COLUMN IF EXISTS "billingPeriodStart",
  DROP COLUMN IF EXISTS "billingPeriodEnd",
  DROP COLUMN IF EXISTS "trialEndsAt";

-- Add Whop billing fields
ALTER TABLE "workspaces"
  -- The Whop membership ID for this workspace's active subscription
  ADD COLUMN IF NOT EXISTS "whopMembershipId"   TEXT,
  -- The Whop product ID that maps to the current plan (used to verify webhooks)
  ADD COLUMN IF NOT EXISTS "whopPlanProductId"  TEXT,
  -- 'active' | 'canceled' | 'expired' | 'trialing'
  ADD COLUMN IF NOT EXISTS "billingStatus"      TEXT NOT NULL DEFAULT 'free',
  -- When the current billing period ends (from Whop renewal_period_end)
  ADD COLUMN IF NOT EXISTS "billingPeriodEnd"   TIMESTAMP(3),
  -- When a free trial ends (if applicable)
  ADD COLUMN IF NOT EXISTS "trialEndsAt"        TIMESTAMP(3);

-- Also replace stripePaymentIntentId on workspace_addons with whopMembershipId
ALTER TABLE "workspace_addons"
  DROP COLUMN IF EXISTS "stripePaymentIntentId",
  ADD COLUMN IF NOT EXISTS "whopMembershipId" TEXT;
