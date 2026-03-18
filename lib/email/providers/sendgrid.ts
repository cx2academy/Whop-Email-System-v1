/**
 * lib/email/providers/sendgrid.ts
 *
 * SendGrid email provider via Web API v3.
 *
 * Uses the @sendgrid/mail package.
 * API key is passed in at construction time (not from env) so each
 * workspace can supply its own key.
 *
 * Install dependency (add to package.json):
 *   npm install @sendgrid/mail
 */

import sgMail from '@sendgrid/mail';
import type {
  EmailProvider,
  SendEmailOptions,
  SendEmailResult,
} from '@/lib/email/types';

export class SendGridProvider implements EmailProvider {
  readonly name = 'sendgrid' as const;

  // Each provider instance holds its own key — safe for multi-tenant use
  // because we construct a new instance per send (see factory in index.ts).
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    // Set key per-call so instances don't share global state.
    sgMail.setApiKey(this.apiKey);

    const from = options.from ?? 'noreply@whopemailengine.com';
    const toAddresses = Array.isArray(options.to) ? options.to : [options.to];

    try {
      const [response] = await sgMail.send({
        from,
        to: toAddresses,
        subject: options.subject,
        html: options.html,
        ...(options.text && { text: options.text }),
        ...(options.replyTo && { replyTo: options.replyTo }),
        // SendGrid uses custom headers for idempotency tracking
        headers: options.idempotencyKey
          ? { 'X-Idempotency-Key': options.idempotencyKey }
          : undefined,
      });

      // SendGrid returns 202 Accepted on success
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return {
          success: true,
          // SendGrid doesn't return a per-message ID in the API response;
          // message IDs come via event webhook. Use the idempotency key as
          // a stable reference for the send record.
          messageId: options.idempotencyKey ?? `sg-${Date.now()}`,
          provider: 'sendgrid',
        };
      }

      return {
        success: false,
        error: `SendGrid returned unexpected status ${response.statusCode}`,
        provider: 'sendgrid',
      };
    } catch (err: unknown) {
      // @sendgrid/mail throws ResponseError objects with a .response property
      const message =
        (err as { response?: { body?: { errors?: Array<{ message: string }> } } })
          ?.response?.body?.errors?.[0]?.message ??
        (err instanceof Error ? err.message : String(err));

      return {
        success: false,
        error: `SendGrid exception: ${message}`,
        provider: 'sendgrid',
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Validation helper — used by POST /api/email/connect
//
// Calls GET /v3/user/account (read-only, requires only "Mail Send" scope).
// Does NOT send any email.
// ---------------------------------------------------------------------------

export async function validateSendGridKey(
  apiKey: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const res = await fetch('https://api.sendgrid.com/v3/user/account', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (res.status === 401 || res.status === 403) {
      return {
        valid: false,
        error: 'Invalid API key — authentication failed. Check your SendGrid key.',
      };
    }

    if (!res.ok) {
      return {
        valid: false,
        error: `SendGrid API returned ${res.status}. Check your key.`,
      };
    }

    return { valid: true };
  } catch (err) {
    return {
      valid: false,
      error: `Could not reach SendGrid API: ${String(err)}`,
    };
  }
}
