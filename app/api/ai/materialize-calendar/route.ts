import { NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/auth/session';
import { materializeCalendar, type ContentCalendar, type CalendarInput } from '@/lib/ai/content-calendar';

export async function POST(request: Request) {
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    const body = await request.json();
    
    if (body.input?.startDate) {
      body.input.startDate = new Date(body.input.startDate);
    }
    
    const { calendar, input, generateDrafts } = body as { calendar: ContentCalendar; input: CalendarInput; generateDrafts: boolean };

    if (!calendar || !input) {
      return NextResponse.json({ success: false, error: 'Missing calendar or input' }, { status: 400 });
    }

    const result = await materializeCalendar(calendar, input, workspaceId, generateDrafts);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error('[materialize-calendar] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
