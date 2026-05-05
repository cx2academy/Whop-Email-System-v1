/**
 * lib/email/providers/resend.ts
 *
 * Resend email provider.
 *
 * Breaking change from v1: no longer reads RESEND_API_KEY from process.env
 * at send time. The API key is resolved by the provider factory in index.ts
 * and passed in via ResendProvider(apiKey). The env-var path is preserved as
 * a fallback so the system still works if no workspace config exists yet.
 */

import { Resend } from 'resend';
import type {
  EmailProvider,
  SendEmailOptions,
  SendEmailResult,
} from '@/lib/email/types';

export class ResendProvider implements EmailProvider {
  readonly name = 'resend' as const;

  private readonly client: Resend;
  private readonly defaultFrom: string;

  constructor(apiKey?: string) {
    const key = apiKey ?? process.env.RESEND_API_KEY;
    if (!key) {
      throw new Error(
        'ResendProvider: no API key provided and RESEND_API_KEY env var is not set.'
      );
    }
    this.client = new Resend(key);

    // Build a safe default from address for when options.from is omitted.
    const fromEmail =
      process.env.RESEND_FROM_EMAIL ?? 'noreply@revtray.com';
    const fromName = process.env.RESEND_FROM_NAME ?? 'RevTray';
    this.defaultFrom = fromEmail.includes('<')
      ? fromEmail
      : `${fromName} <${fromEmail}>`;
  }

  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    const from = options.from ?? this.defaultFrom;

    try {
      const { data, error } = await this.client.emails.send({
        from,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
        ...(options.replyTo && { reply_to: options.replyTo }),
        ...(options.scheduledAt && { scheduled_at: options.scheduledAt }),
        headers: {
          ...(options.idempotencyKey && { 'X-Idempotency-Key': options.idempotencyKey }),
          ...options.headers,
        },
      });

      if (error || !data) {
        return {
          success: false,
          error: error?.message ?? 'Unknown Resend error',
          provider: 'resend',
        };
      }

      return { success: true, messageId: data.id, provider: 'resend' };
    } catch (err) {
      return {
        success: false,
        error: `Resend exception: ${String(err)}`,
        provider: 'resend',
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Validation helper — used by POST /api/email/connect
// Tests the key by hitting Resend's /domains endpoint (read-only, safe).
// ---------------------------------------------------------------------------

export async function validateResendKey(
  apiKey: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const res = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (res.status === 401) {
      return { valid: false, error: 'Invalid API key — authentication failed.' };
    }
    if (!res.ok) {
      return {
        valid: false,
        error: `Resend API returned ${res.status}. Check your key.`,
      };
    }

    return { valid: true };
  } catch (err) {
    return {
      valid: false,
      error: `Could not reach Resend API: ${String(err)}`,
    };
  }
}
