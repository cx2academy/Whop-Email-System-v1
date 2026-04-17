/**
 * lib/env.ts
 *
 * Centralised, validated environment variable access.
 *
 * All env var reads in the app MUST go through this module.
 * Calling this file at startup validates the full config and
 * throws a clear error early — rather than at send time.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const serverEnvSchema = z.object({
  // App
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // Database
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .startsWith("postgresql", "DATABASE_URL must be a valid PostgreSQL URL"),

  // Auth
  AUTH_SECRET: z
    .string()
    .min(
      32,
      "AUTH_SECRET must be at least 32 characters. Generate with: openssl rand -base64 32"
    ),

  // Whop OAuth
  WHOP_CLIENT_ID: z.string().min(1, "WHOP_CLIENT_ID is required"),
  WHOP_CLIENT_SECRET: z.string().min(1, "WHOP_CLIENT_SECRET is required"),

  // Resend
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),
  RESEND_FROM_EMAIL: z
    .string()
    .email("RESEND_FROM_EMAIL must be a valid email address"),
  RESEND_FROM_NAME: z.string().min(1, "RESEND_FROM_NAME is required"),

  // SMTP Fallback (all optional — only required if USE_SMTP_FALLBACK=true)
  SMTP_HOST: z.string().optional(),
  SMTP_FROM_EMAIL: z.string().email().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_SECURE: z
    .string()
    .transform((val: string) => val === "true")
    .optional(),

  // Encryption — required to store API keys at rest
  // Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ENCRYPTION_KEY: z
    .string()
    .min(32, "ENCRYPTION_KEY must be at least 32 characters. Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""),

  // Cron job protection — any random secret is fine
  // Generate with: openssl rand -base64 24
  CRON_SECRET: z
    .string()
    .min(1, "CRON_SECRET is required to protect the automation cron endpoint.")
    .optional(), // optional for local dev, but production should set it

  // Webhook secrets — required to verify incoming webhook payloads
  // Set RESEND_WEBHOOK_SECRET from the Resend dashboard → Webhooks → signing secret
  RESEND_WEBHOOK_SECRET: z
    .string()
    .min(1, "RESEND_WEBHOOK_SECRET is required. Copy it from Resend dashboard → Webhooks.")
    .optional(), // optional so the app boots before Resend is configured
  // Set WHOP_WEBHOOK_SECRET from the Whop dashboard → Developer → Webhooks → signing secret
  WHOP_WEBHOOK_SECRET: z
    .string()
    .min(1, "WHOP_WEBHOOK_SECRET is required for production. Copy from Whop dashboard → Webhooks.")
    .optional(), // optional so the app boots before Whop webhook is configured

  // Feature Flags
  USE_SMTP_FALLBACK: z
    .string()
    .transform((val: string) => val === "true")
    .default("false"),
});

const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url("NEXT_PUBLIC_APP_URL must be a valid URL")
    .default("http://localhost:3000"),
});

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function formatZodErrors(
  fieldErrors: Partial<Record<string, string[] | undefined>>
): string {
  return Object.entries(fieldErrors)
    .map(([key, messages]) => {
      const msgStr = Array.isArray(messages) ? messages.join(", ") : "invalid";
      return `  ${key}: ${msgStr}`;
    })
    .join("\n");
}

/**
 * Parse and validate server-side environment variables.
 * Called once at module load — fails fast on missing/invalid config.
 */
function validateServerEnv(): ServerEnv {
  // Skip environment variable validation during Next.js build phase
  if (
    process.env.SKIP_ENV_VALIDATION === "true" ||
    process.env.npm_lifecycle_event === "build" ||
    process.env.NEXT_PHASE === "phase-production-build"
  ) {
    return process.env as unknown as ServerEnv;
  }

  const parsed = serverEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    const errors = formatZodErrors(parsed.error.flatten().fieldErrors);
    throw new Error(
      `\u274C Invalid environment variables:\n${errors}\n\nCheck your .env.local file.`
    );
  }

  return parsed.data;
}

function validateClientEnv(): ClientEnv {
  const parsed = clientEnvSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  });

  if (!parsed.success) {
    const errors = formatZodErrors(parsed.error.flatten().fieldErrors);
    throw new Error(
      `\u274C Invalid public environment variables:\n${errors}`
    );
  }

  return parsed.data;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Validated server-side environment variables.
 * Import this instead of process.env directly in server code.
 */
export const env = validateServerEnv();

/**
 * Validated public (client-safe) environment variables.
 * Safe to use in client components.
 */
export const clientEnv = validateClientEnv();

/**
 * Helper to reliably get the application's base URL, falling back through
 * available environment variables in Vercel and local environments, avoiding "undefined" string.
 */
export function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL !== "undefined") {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.APP_URL && process.env.APP_URL !== "undefined") {
    return process.env.APP_URL.replace(/\/$/, "");
  }
  if (process.env.NEXTAUTH_URL && process.env.NEXTAUTH_URL !== "undefined") {
    return process.env.NEXTAUTH_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL && process.env.VERCEL_URL !== "undefined") {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}
