/**
 * lib/rate-limit.ts
 *
 * Simple sliding-window rate limiter for Next.js API routes.
 *
 * ⚠️  PRODUCTION LIMITATION: Uses an in-memory Map — each serverless instance
 * has its own isolated store. On Vercel (where functions scale to many instances),
 * this means the effective limit is multiplied by the number of concurrent
 * instances. For example, if Vercel runs 10 instances, the real limit is 10×
 * what's configured here.
 *
 * UPGRADE PATH (recommended for production):
 *   1. npm install @upstash/ratelimit @upstash/redis
 *   2. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Vercel env vars
 *   3. Replace this module with:
 *
 *      import { Ratelimit } from "@upstash/ratelimit";
 *      import { Redis } from "@upstash/redis";
 *
 *      export const authLimiter = new Ratelimit({
 *        redis: Redis.fromEnv(),
 *        limiter: Ratelimit.slidingWindow(10, "60 s"),
 *        analytics: true,
 *      });
 *
 * This in-memory implementation is adequate for:
 *   - Local development
 *   - Single-instance deployments (e.g., a self-hosted VPS)
 *   - Low-traffic scenarios where imperfect rate limiting is acceptable
 *
 * The rate limiter IS currently applied to:
 *   - /api/v1/* (API key calls) — via lib/api/rate-limit.ts
 *   - registerUser server action (account creation spam)
 *
 * TODO: Apply authLimiter to NextAuth credentials signIn callback.
 */

interface RateLimitConfig {
  /** Maximum requests per window */
  limit: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

// Store: key → [timestamps of requests in current window]
const store = new Map<string, number[]>();

// Prune old entries every 5 minutes to prevent memory leak
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of store.entries()) {
      // Remove keys with no recent activity (older than 10 minutes)
      if (timestamps.length === 0 || now - timestamps[timestamps.length - 1] > 600_000) {
        store.delete(key);
      }
    }
  }, 300_000);
}

export function rateLimit(config: RateLimitConfig) {
  return {
    /**
     * Check if the given key is within rate limits.
     * @param key - Identifier (e.g. IP address, userId)
     */
    check(key: string): RateLimitResult {
      const now = Date.now();
      const windowStart = now - config.windowMs;

      // Get or initialise timestamps for this key
      const timestamps = (store.get(key) ?? []).filter((t) => t > windowStart);

      if (timestamps.length >= config.limit) {
        const resetAt = timestamps[0]! + config.windowMs;
        return {
          success: false,
          remaining: 0,
          resetAt,
        };
      }

      timestamps.push(now);
      store.set(key, timestamps);

      return {
        success: true,
        remaining: config.limit - timestamps.length,
        resetAt: now + config.windowMs,
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Pre-configured limiters
// ---------------------------------------------------------------------------

/** Auth endpoints: 10 attempts per minute per IP */
export const authLimiter = rateLimit({ limit: 10, windowMs: 60_000 });

/** Sync trigger: 5 per hour per workspace */
export const syncLimiter = rateLimit({ limit: 5, windowMs: 3_600_000 });

/** API general: 60 requests per minute per user */
export const apiLimiter = rateLimit({ limit: 60, windowMs: 60_000 });

/** Whop validate: 10 per hour per workspace (prevents key-bruteforce) */
export const validateLimiter = rateLimit({ limit: 10, windowMs: 3_600_000 });
