-- Migration: add channel flags to email_campaigns
-- sendViaEmail defaults to true (preserves all existing campaigns)
-- sendViaWhopDm defaults to false (opt-in)

ALTER TABLE "email_campaigns"
  ADD COLUMN "sendViaEmail"  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "sendViaWhopDm" BOOLEAN NOT NULL DEFAULT false;
