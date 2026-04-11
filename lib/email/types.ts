/**
 * lib/email/types.ts
 *
 * Shared types for the BYOE (Bring Your Own Email) provider layer.
 *
 * Keep this file import-free — it is referenced by every provider,
 * the index, and API routes. Circular imports are prevented by design.
 */

// ---------------------------------------------------------------------------
// Provider name union — extended from "resend" | "smtp" to include new providers
// ---------------------------------------------------------------------------

export type ProviderName = 'resend' | 'ses' | 'sendgrid' | 'smtp' | 'unknown';

// Maps the DB enum value to the runtime provider name.
// Add new entries here when adding new providers.
export const PROVIDER_TYPE_MAP: Record<string, ProviderName> = {
  RESEND:   'resend',
  SES:      'ses',
  SENDGRID: 'sendgrid',
};

// ---------------------------------------------------------------------------
// Send options — unchanged from existing interface so all call sites compile
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
  /** Override from address — format: "Name <email>" or bare email */
  from?: string;
  /** Reply-to address */
  replyTo?: string;
  /**
   * Idempotency key — prevents duplicate sends on retry.
   * Format: "{campaignId}:{contactId}" or "{campaignId}:{contactId}:B"
   */
  idempotencyKey?: string;
  /** Optional scheduled time for the email (ISO 8601 string) */
  scheduledAt?: string;
}

// ---------------------------------------------------------------------------
// Send result — extends existing shape with new provider names
// ---------------------------------------------------------------------------

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: ProviderName;
}

// ---------------------------------------------------------------------------
// Provider interface — implemented by every provider class
// ---------------------------------------------------------------------------

export interface EmailProvider {
  readonly name: ProviderName;
  send(options: SendEmailOptions): Promise<SendEmailResult>;
}

// ---------------------------------------------------------------------------
// Stored provider config (decrypted) — passed from index into provider factory
// ---------------------------------------------------------------------------

export interface ResolvedProviderConfig {
  provider: ProviderName;
  /** Decrypted API key (Resend / SendGrid) or JSON credentials (SES) */
  apiKey: string;
  /** Non-sensitive metadata: region, senderEmail, etc. */
  metadata: ProviderMetadata;
}

export interface ProviderMetadata {
  region?: string;      // SES: AWS region e.g. "us-east-1"
  senderEmail?: string; // Override the workspace fromEmail at provider level
}

// ---------------------------------------------------------------------------
// Validation result — returned by POST /api/email/connect
// ---------------------------------------------------------------------------

export interface ProviderValidationResult {
  valid: boolean;
  error?: string;
}
