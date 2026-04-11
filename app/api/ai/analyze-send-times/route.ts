import { NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/auth/session';
import { analyzeCampaignAudience } from '@/lib/ai/send-time';
import { checkCredits, deductCredits } from '@/lib/ai/credits';
import { db } from '@/lib/db/client';

export async function POST(req: Request) {
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    const { campaignId } = await req.json();

    if (!campaignId) {
      return NextResponse.json({ error: 'Missing campaignId' }, { status: 400 });
    }

    const _check = await checkCredits(workspaceId, 'analyzeSendTimes');
    if (!_check.allowed) {
      return NextResponse.json(
        { error: `Not enough AI credits. Need 3, have ${_check.currentBalance}.` },
        { status: 403 }
      );
    }

    const results = await analyzeCampaignAudience(workspaceId, campaignId);

    await db.emailCampaign.update({
      where: { id: campaignId },
      data: { sendTimeOptimized: true },
    });

    await deductCredits(workspaceId, 'analyzeSendTimes');

    return NextResponse.json({ success: true, ...results });
  } catch (error) {
    console.error('[analyzeSendTimes API error]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
