import { NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/auth/session';
import { generateContentCalendar, type CalendarInput } from '@/lib/ai/content-calendar';

export async function POST(request: Request) {
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    const body = await request.json();
    
    // Parse start date back to Date object
    if (body.startDate) {
      body.startDate = new Date(body.startDate);
    }
    
    const input = body as CalendarInput;

    if (!input.product || !input.audience || !input.goal || !input.emailFrequency || !input.startDate) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const result = await generateContentCalendar(input, workspaceId);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error('[generate-calendar] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
