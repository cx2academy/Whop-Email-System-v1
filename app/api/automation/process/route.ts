/**
 * app/api/automation/process/route.ts
 *
 * Cron endpoint — processes pending automation jobs + product_not_purchased checks.
 * Called every minute by Vercel cron (configured in vercel.json).
 *
 * Protected by CRON_SECRET env var.
 */

import { NextRequest } from 'next/server';
import { processPendingJobs } from '@/lib/automation/delay-scheduler';
import { checkProductNotPurchased } from '@/lib/automation/trigger-system';
import { db } from '@/lib/db/client';

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret');

  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
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
