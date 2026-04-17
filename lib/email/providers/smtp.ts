/**
 * lib/email/providers/smtp.ts
 *
 * SMTP fallback email provider using Nodemailer.
 *
 * Used when:
 *   - RESEND is unavailable / rate-limited
 *   - USE_SMTP_FALLBACK=true in env
 *   - A workspace configures their own SMTP server
 */

import nodemailer from "nodemailer";
import type { EmailProvider, SendEmailOptions, SendEmailResult } from "@/lib/email/index";

export class SmtpProvider implements EmailProvider {
  readonly name = "smtp" as const;

  private getTransporter() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT ?? "587", 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;
    const secure = process.env.SMTP_SECURE === "true";

    if (!host || !user || !pass) {
      throw new Error(
        "SMTP provider requires SMTP_HOST, SMTP_USER, and SMTP_PASSWORD env vars."
      );
    }

    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  }

  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    try {
      const transporter = this.getTransporter();

      const fromEmail =
        options.from ??
        process.env.SMTP_FROM_EMAIL ??
        process.env.RESEND_FROM_EMAIL ??
        "noreply@revtray.com";
      const fromName = process.env.RESEND_FROM_NAME ?? "RevTray";
      const from = fromEmail.includes("<")
        ? fromEmail
        : `${fromName} <${fromEmail}>`;

      const info = await transporter.sendMail({
        from,
        to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo,
        // Idempotency via message-id header
        messageId: options.idempotencyKey
          ? `<${options.idempotencyKey}@revtray.com>`
          : undefined,
      });

      return {
        success: true,
        messageId: info.messageId,
        provider: "smtp",
      };
    } catch (err) {
      return {
        success: false,
        error: `SMTP exception: ${String(err)}`,
        provider: "smtp",
      };
    }
  }
}
