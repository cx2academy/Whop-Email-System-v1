import { NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/auth/session';
import { materializeWorkflow } from '@/lib/ai/automation-builder';

export async function POST(req: Request) {
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    const body = await req.json();
    const { workflow, isEnabled } = body;

    if (!workflow) {
      return NextResponse.json({ success: false, error: 'Workflow is required' }, { status: 400 });
    }

    const result = await materializeWorkflow(workflow, workspaceId, isEnabled);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('materialize-automation route error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
