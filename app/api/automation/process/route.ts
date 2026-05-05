/**
 * app/api/automation/process/route.ts
 *
 * Cron endpoint — processes pending automation jobs + product_not_purchased checks.
 * Called every minute by Vercel cron (configured in vercel.json).
 *
 * Security:
 *   - In production, CRON_SECRET must be set. Requests without a matching
 *     secret are rejected with 401.
 *   - Vercel cron calls include the `x-vercel-cron` header — we accept that
 *     as an alternative to the secret header.
 *   - In development, secret check is skipped so you can hit the endpoint manually.
 *
 * To test locally: GET /api/automation/process?secret=<your CRON_SECRET>
 */

import { NextRequest } from 'next/server';
import { processPendingJobs } from '@/lib/automation/delay-scheduler';
import { checkProductNotPurchased } from '@/lib/automation/trigger-system';
import { db } from '@/lib/db/client';

export async function GET(req: NextRequest) {
  const isVercelCron = req.headers.get('x-vercel-cron') === '1';
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret');
  const cronSecret = process.env.CRON_SECRET;

  // In production: require either the Vercel cron header OR a valid CRON_SECRET.
  // If CRON_SECRET is not configured, reject all non-Vercel requests to prevent
  // anyone from triggering automation jobs externally.
  if (process.env.NODE_ENV === 'production') {
    if (!isVercelCron) {
      if (!cronSecret) {
        console.error('[cron] CRON_SECRET not configured — rejecting unauthenticated cron call');
        return Response.json({ error: 'Cron secret not configured' }, { status: 401 });
      }
      if (secret !== cronSecret) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
  } else {
    // Development: allow secret check but don't require it
    if (cronSecret && secret && secret !== cronSecret) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const start = Date.now();

  // 1. Process pending delay jobs (existing behaviour)
  const jobResult = await processPendingJobs();

  // 2. Check product_not_purchased triggers across all workspaces
  // Only run every 15 min (use minutes-since-epoch modulo to avoid hammering DB)
  const minutesSinceEpoch = Math.floor(Date.now() / 60000);
  let notPurchasedResult = { workflowsMatched: 0, enrolled: 0, skipped: 0 };

  if (minutesSinceEpoch % 15 === 0) {
    const workspaces = await db.workspace.findMany({ select: { id: true } });
    for (const ws of workspaces) {
      const r = await checkProductNotPurchased(ws.id);
      notPurchasedResult.workflowsMatched += r.workflowsMatched;
      notPurchasedResult.enrolled         += r.enrolled;
      notPurchasedResult.skipped          += r.skipped;
    }
  }

  return Response.json({
    ok: true,
    jobs:            jobResult,
    productChecks:   notPurchasedResult,
    durationMs:      Date.now() - start,
  });
}
