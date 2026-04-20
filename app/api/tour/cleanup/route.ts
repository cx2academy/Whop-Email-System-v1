import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

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

    // Delete fake sent campaigns that have unrealistic totalRecipients
    await db.emailCampaign.deleteMany({
      where: {
        workspaceId,
        status: 'SENT',
        totalRecipients: { gt: 10000 },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
