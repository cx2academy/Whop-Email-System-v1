import pino from 'pino';

/**
 * lib/logger.ts
 * 
 * Structured logging for RevTray.
 * In development, it prints pretty logs to the console.
 * In production, it can be connected to BetterStack (Logtail) via the hosting provider
 * or by adding a transport.
 */

const isDev = process.env.NODE_ENV === 'development';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          ignore: 'pid,hostname',
          translateTime: 'HH:MM:ss Z',
        },
      }
    : undefined,
});

// Helper for logging errors to both console/BetterStack AND Sentry
import * as Sentry from "@sentry/nextjs";

export const logError = (error: Error | string, context?: Record<string, any>) => {
  const message = error instanceof Error ? error.message : error;
  
  logger.error({ err: error, ...context }, message);
  
  Sentry.captureException(error, {
    extra: context,
  });
};

export const logInfo = (message: string, context?: Record<string, any>) => {
  logger.info(context, message);
};
