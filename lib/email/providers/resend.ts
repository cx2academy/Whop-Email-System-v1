/**
 * lib/email/providers/resend.ts
 *
 * Resend email provider — primary sending provider.
 *
 * Uses the Resend SDK. All sends are workspace-scoped and include
 * idempotency keys to prevent duplicate delivery.
 */

import { Resend } from "resend";
import type { EmailProvider, SendEmailOptions, SendEmailResult } from "@/lib/email/index";

let _resend: Resend | null = null;

function getResendClient(): Resend {
  if (!_resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error(
        "RESEND_API_KEY environment variable is not set. " +
          "Add it to your .env.local file."
      );
    }
    _resend = new Resend(apiKey);
  }
  return _resend;
}

export class ResendProvider implements EmailProvider {
  readonly name = "resend" as const;

  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    const resend = getResendClient();

    const fromEmail =
      options.from ??
      process.env.RESEND_FROM_EMAIL ??
      "noreply@whopemailengine.com";
    const fromName =
      process.env.RESEND_FROM_NAME ?? "Whop Email Engine";

    const from = fromEmail.includes("<")
      ? fromEmail
      : `${fromName} <${fromEmail}>`;

    try {
      const { data, error } = await resend.emails.send({
        from,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
        ...(options.replyTo && { reply_to: options.replyTo }),
        // Resend supports idempotency keys via headers
        headers: options.idempotencyKey
          ? { "X-Idempotency-Key": options.idempotencyKey }
          : undefined,
      });

      if (error || !data) {
        return {
          success: false,
          error: error?.message ?? "Unknown Resend error",
          provider: "resend",
        };
      }

      return {
        success: true,
        messageId: data.id,
        provider: "resend",
      };
    } catch (err) {
      return {
        success: false,
        error: `Resend exception: ${String(err)}`,
        provider: "resend",
      };
    }
  }
}
