/**
 * lib/rate-limit.ts
 *
 * Simple sliding-window rate limiter for Next.js API routes.
 *
 * Uses an in-memory Map — sufficient for single-instance deployments.
 * For multi-instance deployments (Vercel Serverless), each instance has
 * its own window. This is acceptable for v1 — a Redis-backed limiter
 * (Upstash @upstash/ratelimit) is the recommended upgrade path.
 *
 * Usage:
 *   const limiter = rateLimit({ limit: 10, windowMs: 60_000 });
 *   const { success } = await limiter.check(req);
 *   if (!success) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
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
