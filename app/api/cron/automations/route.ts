import { NextRequest, NextResponse } from 'next/server';
import { processAutomationQueue } from '@/lib/automations/engine';

/**
 * app/api/cron/automations/route.ts
 * 
 * Cron endpoint to process the automation queue.
 * Should be called every 15 minutes by Cronjob.org.
 * 
 * Security: Requires Authorization header with CRON_SECRET.
 */

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  const secret = process.env.CRON_SECRET;

  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await processAutomationQueue();
    return NextResponse.json({
      success: true,
      processed: result.total,
      completed: result.success,
      failed: result.failed,
    });
  } catch (err) {
    console.error('[cron/automations] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Also allow POST for flexibility
export async function POST(req: NextRequest) {
  return GET(req);
}
