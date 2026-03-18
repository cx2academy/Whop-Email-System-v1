-- Migration: add_email_provider_config
-- Adds per-workspace email provider credentials (BYOE — Bring Your Own Email).
--
-- Changes:
--   1. New enum EmailProviderType  (RESEND | SES | SENDGRID)
--   2. New table email_provider_configs  — one row per workspace (unique constraint)
--   3. Extend existing EmailProvider enum used on email_sends
--      to track which provider actually delivered each message.

-- 1. New enum for the config table
CREATE TYPE "EmailProviderType" AS ENUM ('RESEND', 'SES', 'SENDGRID');

-- 2. Config table
CREATE TABLE "email_provider_configs" (
    "id"           TEXT NOT NULL,
    "workspaceId"  TEXT NOT NULL,
    "provider"     "EmailProviderType" NOT NULL,
    -- AES-256-GCM encrypted blob: iv:authTag:ciphertext (base64, colon-separated)
    -- For SES this encodes JSON {"accessKeyId":"...","secretAccessKey":"..."}
    -- For Resend / SendGrid this is the raw API key string
    "encryptedKey" TEXT NOT NULL,
    -- Optional JSON metadata stored as plain text.
    -- Schema: { region?: string, senderEmail?: string }
    -- Sensitive sub-fields (SES secret) are always in encryptedKey, never here.
    "metadata"     TEXT NOT NULL DEFAULT '{}',
    "isVerified"   BOOLEAN NOT NULL DEFAULT false,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_provider_configs_pkey" PRIMARY KEY ("id")
);

-- One active provider per workspace
CREATE UNIQUE INDEX "email_provider_configs_workspaceId_key"
    ON "email_provider_configs"("workspaceId");

-- FK → workspaces
ALTER TABLE "email_provider_configs"
    ADD CONSTRAINT "email_provider_configs_workspaceId_fkey"
    FOREIGN KEY ("workspaceId")
    REFERENCES "workspaces"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

-- 3. Extend EmailProvider enum (used on email_sends.provider)
--    PostgreSQL only allows ADD VALUE, never REMOVE.
--    Safe to run multiple times because of IF NOT EXISTS (pg 9.6+).
ALTER TYPE "EmailProvider" ADD VALUE IF NOT EXISTS 'SES';
ALTER TYPE "EmailProvider" ADD VALUE IF NOT EXISTS 'SENDGRID';
