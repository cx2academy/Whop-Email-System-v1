import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireWorkspaceAccessOrThrow } from '@/lib/auth/session';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const { workspaceId } = await requireWorkspaceAccessOrThrow();

    const { campaignId } = await params;

    const insight = await prisma.campaignInsight.findUnique({
      where: { campaignId },
    });

    if (!insight) {
      return NextResponse.json(null);
    }

    // Verify workspace access
    if (insight.workspaceId !== workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(insight);
  } catch (error) {
    console.error('[CampaignInsight GET]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
