import { NextResponse } from 'next/server';
import { requireWorkspaceAccessOrThrow } from '@/lib/auth/session';
import { generateAbVariants } from '@/lib/ai/ab-test';

export async function POST(request: Request) {
  try {
    const { workspaceId } = await requireWorkspaceAccessOrThrow();
    const { subject, htmlBody } = await request.json();

    if (!subject || !htmlBody) {
      return NextResponse.json({ success: false, error: 'Subject and body required' }, { status: 400 });
    }

    const result = await generateAbVariants(subject, htmlBody, 'Email Campaign', workspaceId);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[api/ai/ab-test]', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
