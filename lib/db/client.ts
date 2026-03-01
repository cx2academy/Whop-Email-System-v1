/**
 * Prisma Client singleton.
 *
 * In development, Next.js hot reload can cause the Prisma client to be
 * instantiated many times, exhausting the database connection pool.
 * This module stores the client on the global object in development
 * so it is reused across hot reloads.
 *
 * In production, a fresh client is created once per process.
 *
 * @see https://www.prisma.io/docs/guides/other/troubleshooting-orm/help-articles/nextjs-prisma-client-dev-practices
 */

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
