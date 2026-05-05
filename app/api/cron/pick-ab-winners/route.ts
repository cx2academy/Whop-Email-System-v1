import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { pickAbWinner } from '@/lib/ai/ab-test';

export async function GET(request: Request) {
  // Optional: Verify Vercel Cron secret if you want to secure it
  const authHeader = request.headers.get('authorization');
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // Find campaigns that are running an A/B test and sent more than 2 hours ago
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    
    const campaignsToPick = await db.emailCampaign.findMany({
      where: {
        isAbTest: true,
        abTestStatus: 'running',
        abTestWinnerPicked: false,
        sentAt: {
          lte: twoHoursAgo,
        },
      },
      select: {
        id: true,
      },
    });

    console.log(`[cron/pick-ab-winners] Found ${campaignsToPick.length} campaigns to evaluate.`);

    for (const campaign of campaignsToPick) {
      await pickAbWinner(campaign.id);
    }

    return NextResponse.json({
      success: true,
      processed: campaignsToPick.length,
    });
  } catch (error) {
    console.error('[cron/pick-ab-winners] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
