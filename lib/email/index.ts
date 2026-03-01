/**
 * lib/email/index.ts
 *
 * Email Provider Abstraction Layer — Phase 4 full implementation.
 *
 * Provider selection:
 *   1. If USE_SMTP_FALLBACK=true → SmtpProvider
 *   2. Default → ResendProvider
 *   3. If Resend fails → automatic fallback to SMTP (if configured)
 *
 * All sends are:
 *   - Idempotent: callers pass an idempotencyKey to prevent duplicate delivery
 *   - Provider-agnostic: swap Resend for SMTP without changing call sites
 *   - Workspace-scoped: from address overridable per workspace
 */

import { ResendProvider } from "./providers/resend";
import { SmtpProvider } from "./providers/smtp";

// ---------------------------------------------------------------------------
// Shared types (imported by providers)
// ---------------------------------------------------------------------------

export interface SendEmailOptions {
  /** Recipient email address(es) */
  to: string | string[];
  /** Subject line */
  subject: string;
  /** HTML body */
  html: string;
  /** Plain text fallback */
  text?: string;
  /** Override from address */
  from?: string;
  /** Reply-to address */
  replyTo?: string;
  /**
   * Idempotency key — prevents duplicate sends.
   * Format: "{campaignId}:{contactId}" or "{campaignId}:{contactId}:B" for A/B
   */
  idempotencyKey?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: "resend" | "smtp" | "unknown";
}

export interface EmailProvider {
  readonly name: "resend" | "smtp";
  send(options: SendEmailOptions): Promise<SendEmailResult>;
}

// ---------------------------------------------------------------------------
// Provider factory
// ---------------------------------------------------------------------------

function getProvider(): EmailProvider {
  const useSmtp = process.env.USE_SMTP_FALLBACK === "true";
  return useSmtp ? new SmtpProvider() : new ResendProvider();
}

function hasSmtpConfig(): boolean {
  return !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASSWORD
  );
}

// ---------------------------------------------------------------------------
// Public send function
// ---------------------------------------------------------------------------

/**
 * Send a single email via the configured provider.
 *
 * Automatically falls back to SMTP if Resend fails and SMTP is configured.
 * Never throws — always returns a SendEmailResult.
 */
export async function sendEmail(
  options: SendEmailOptions
): Promise<SendEmailResult> {
  const primary = getProvider();

  const result = await primary.send(options);

  // If primary failed and we have SMTP configured as fallback, try it
  if (
    !result.success &&
    primary.name === "resend" &&
    hasSmtpConfig()
  ) {
    console.warn(
      `[email] Resend failed (${result.error}), falling back to SMTP`
    );
    const smtp = new SmtpProvider();
    return smtp.send(options);
  }

  return result;
}
