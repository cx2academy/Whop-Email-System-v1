import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { auth } from '@/auth';

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { workspaces: { select: { workspaceId: true } } },
    });

    if (!user || user.workspaces.length === 0) {
      return NextResponse.json({ success: true });
    }

    const workspaceId = user.workspaces[0].workspaceId;
    
    // 1. Delete fake purchases (cascades to attributions)
    try {
      await db.purchase.deleteMany({
        where: {
          workspaceId,
          source: 'demo',
        }
      });
    } catch (e) {
      console.warn('Failed to delete demo purchases:', e);
    }
    
    // 2. Delete fake sent campaigns that have unrealistic totalRecipients
    await db.emailCampaign.deleteMany({
      where: {
        workspaceId,
        status: 'COMPLETED',
        totalRecipients: { gt: 10000 },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
