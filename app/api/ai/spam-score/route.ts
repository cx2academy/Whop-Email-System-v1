import { NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/auth/session';
import { scoreEmailForSpam } from '@/lib/ai/spam-score';

export async function POST(req: Request) {
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    const { subject, htmlBody } = await req.json();

    if (!subject || !htmlBody) {
      return NextResponse.json({ error: 'Missing subject or htmlBody' }, { status: 400 });
    }

    const result = await scoreEmailForSpam(subject, htmlBody, workspaceId);

    if (result.success) {
      return NextResponse.json({ success: true, data: result.data });
    } else {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
  } catch (error) {
    console.error('[spamScore API error]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
