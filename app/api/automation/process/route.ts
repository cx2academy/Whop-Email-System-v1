/**
 * app/api/automation/process/route.ts
 *
 * Cron endpoint — processes pending automation jobs.
 * Called every minute by Vercel cron (configured in vercel.json).
 *
 * Protected by CRON_SECRET env var.
 */

import { NextRequest } from 'next/server';
import { processPendingJobs } from '@/lib/automation/delay-scheduler';

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret');

  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const start = Date.now();
  const result = await processPendingJobs();

  return Response.json({
    ok: true,
    ...result,
    durationMs: Date.now() - start,
  });
}
