/**
 * lib/api/rate-limit.ts
 *
 * Rate limiter for v1 API routes.
 * 60 requests per minute per API key.
 * Reuses the existing sliding-window rateLimit utility.
 */

import { rateLimit } from '@/lib/rate-limit';

export const v1Limiter = rateLimit({ limit: 60, windowMs: 60_000 });

export function rateLimitedResponse(resetAt: number) {
  return Response.json(
    { error: 'Rate limit exceeded', message: 'Max 60 requests per minute.' },
    {
      status: 429,
      headers: {
        'X-RateLimit-Limit': '60',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
        'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)),
      },
    }
  );
}
