/**
 * lib/email/index.ts
 *
 * BYOE Email Provider Abstraction Layer.
 *
 * Provider resolution order (per workspace):
 *   1. Workspace has a verified EmailProviderConfig in the DB → use it.
 *   2. No workspace config → fall back to system-level env var config:
 *        USE_SMTP_FALLBACK=true  → SmtpProvider
 *        default                 → ResendProvider (RESEND_API_KEY from env)
 *
 * Call signature is UNCHANGED from v1:
 *   sendEmail(options)                    ← system provider (env-based)
 *   sendEmail(options, workspaceId)       ← workspace provider (DB-based)
 *
 * All call sites that already pass workspaceId will automatically use the
 * workspace's configured provider. Sites that don't pass workspaceId fall
 * back to the system provider — no breaking changes.
 *
 * Never throws — always returns SendEmailResult.
 */

import { decrypt } from '@/lib/encryption';
import { db } from '@/lib/db/client';
import { ResendProvider } from './providers/resend';
import { SmtpProvider } from './providers/smtp';
import { SesProvider, parseSesCredentials } from './providers/ses';
import { SendGridProvider } from './providers/sendgrid';
import type {
  EmailProvider,
  SendEmailOptions,
  SendEmailResult,
  ProviderMetadata,
} from './types';

// Re-export types so existing imports of `@/lib/email` still resolve.
export type {
  EmailProvider,
  SendEmailOptions,
  SendEmailResult,
  ProviderMetadata,
};

// ---------------------------------------------------------------------------
// System-level fallback provider (env-based, unchanged from v1)
// ---------------------------------------------------------------------------

function getSystemProvider(): EmailProvider {
  if (process.env.USE_SMTP_FALLBACK === 'true') {
    return new SmtpProvider();
  }
  return new ResendProvider();
}

function hasSmtpConfig(): boolean {
  return !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASSWORD
  );
}

// ---------------------------------------------------------------------------
// Workspace-level provider factory (DB-based)
// Returns null when the workspace has no verified config → caller falls back
// ---------------------------------------------------------------------------

async function getWorkspaceProvider(
  workspaceId: string
): Promise<EmailProvider | null> {
  const config = await db.emailProviderConfig.findUnique({
    where: { workspaceId },
  });

  if (!config || !config.isVerified) return null;

  // Decrypt key — decrypt() returns null on empty input; re-check below
  const decryptedKey = decrypt(config.encryptedKey);
  if (!decryptedKey) {
    console.error(
      `[email/index] Failed to decrypt key for workspace ${workspaceId}`
    );
    return null;
  }

  // Parse optional metadata
  let metadata: ProviderMetadata = {};
  try {
    metadata = JSON.parse(config.metadata) as ProviderMetadata;
  } catch {
    // Malformed metadata — ignore, proceed with empty object
  }

  switch (config.provider) {
    case 'RESEND':
      return new ResendProvider(decryptedKey);

    case 'SES': {
      const creds = parseSesCredentials(decryptedKey);
      if (!creds) {
        console.error(
          `[email/index] SES credentials JSON is malformed for workspace ${workspaceId}`
        );
        return null;
      }
      return new SesProvider(creds, metadata.region ?? 'us-east-1');
    }

    case 'SENDGRID':
      return new SendGridProvider(decryptedKey);

    default:
      console.warn(
        `[email/index] Unknown provider type "${config.provider}" for workspace ${workspaceId}`
      );
      return null;
  }
}

// ---------------------------------------------------------------------------
// Public sendEmail() — primary entry point
//
// Signature change from v1: optional second argument `workspaceId`.
// Existing call sites with no workspaceId continue to compile and work.
// ---------------------------------------------------------------------------

export async function sendEmail(
  options: SendEmailOptions,
  workspaceId?: string
): Promise<SendEmailResult> {
  // --- Resolve provider ---
  let primary: EmailProvider;

  if (workspaceId) {
    const workspaceProvider = await getWorkspaceProvider(workspaceId);
    primary = workspaceProvider ?? getSystemProvider();
  } else {
    primary = getSystemProvider();
  }

  // --- Attempt primary send ---
  const result = await primary.send(options);

  // --- SMTP fallback (only when primary is Resend from env, not workspace config) ---
  if (
    !result.success &&
    !workspaceId &&          // don't override workspace-chosen provider
    primary.name === 'resend' &&
    hasSmtpConfig()
  ) {
    console.warn(
      `[email] System Resend failed (${result.error}), falling back to SMTP`
    );
    const smtp = new SmtpProvider();
    return smtp.send(options);
  }

  return result;
}

// ---------------------------------------------------------------------------
// sendEmailForWorkspace() — explicit workspace-scoped alias
// Preferred over sendEmail(options, workspaceId) at call sites where
// workspaceId is always known, for readability.
// ---------------------------------------------------------------------------

export async function sendEmailForWorkspace(
  workspaceId: string,
  options: SendEmailOptions
): Promise<SendEmailResult> {
  return sendEmail(options, workspaceId);
}
