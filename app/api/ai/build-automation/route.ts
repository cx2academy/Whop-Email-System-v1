import { NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/auth/session';
import { buildAutomationFromNL } from '@/lib/ai/automation-builder';

export async function POST(req: Request) {
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    const body = await req.json();
    const { description } = body;

    if (!description || typeof description !== 'string') {
      return NextResponse.json({ success: false, error: 'Description is required' }, { status: 400 });
    }

    const result = await buildAutomationFromNL(description, workspaceId);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('build-automation route error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
