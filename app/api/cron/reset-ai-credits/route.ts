import { NextRequest, NextResponse } from 'next/server';
import { resetAllWorkspacesMonthly } from '@/lib/ai/monthly-reset';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const result = await resetAllWorkspacesMonthly();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Cron reset-ai-credits failed:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
