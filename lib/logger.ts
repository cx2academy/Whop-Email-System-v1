/**
 * lib/logger.ts
 *
 * Structured logger with error monitoring hook.
 *
 * In production, replace `reportToMonitoring()` with your provider:
 *   - Sentry: Sentry.captureException(err, { extra: context })
 *   - Datadog: datadogRum.addError(err, context)
 *   - LogRocket: LogRocket.captureException(err)
 *
 * All server errors flow through here — a single integration point.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  workspaceId?: string;
  userId?: string;
  campaignId?: string;
  contactId?: string;
  route?: string;
  [key: string]: unknown;
}

function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
  const ts = new Date().toISOString();
  const ctx = context ? ` ${JSON.stringify(context)}` : "";
  return `[${ts}] [${level.toUpperCase()}] ${message}${ctx}`;
}

/**
 * Send error to external monitoring service.
 * Replace this body with your actual monitoring SDK in production.
 */
function reportToMonitoring(err: unknown, context?: LogContext): void {
  // TODO: Sentry.captureException(err, { extra: context });
  // For now: structured console.error (captured by Vercel log drain)
  if (process.env.NODE_ENV === "production") {
    console.error(
      JSON.stringify({
        level: "error",
        timestamp: new Date().toISOString(),
        error:
          err instanceof Error
            ? { name: err.name, message: err.message, stack: err.stack }
            : String(err),
        context,
      })
    );
  }
}

export const logger = {
  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === "development") {
      console.debug(formatMessage("debug", message, context));
    }
  },

  info(message: string, context?: LogContext): void {
    console.info(formatMessage("info", message, context));
  },

  warn(message: string, context?: LogContext): void {
    console.warn(formatMessage("warn", message, context));
  },

  error(message: string, err?: unknown, context?: LogContext): void {
    console.error(formatMessage("error", message, context));
    if (err) {
      console.error(err);
      reportToMonitoring(err, { message, ...context });
    }
  },
};
