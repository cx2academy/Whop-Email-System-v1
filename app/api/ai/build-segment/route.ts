import { NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/auth/session';
import { buildSegmentFromNL } from '@/lib/ai/segment-builder';

export async function POST(req: Request) {
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    const { description } = await req.json();

    if (!description) {
      return NextResponse.json({ error: 'Missing description' }, { status: 400 });
    }

    const result = await buildSegmentFromNL(description, workspaceId);

    if (result.success) {
      return NextResponse.json({ success: true, data: result.data });
    } else {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
  } catch (error) {
    console.error('[buildSegment API error]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
