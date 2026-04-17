import { verifyUnsubscribeToken } from '@/lib/email/unsubscribe';
import { db } from '@/lib/db/client';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  // RFC 8058: The POST body must be "List-Unsubscribe=One-Click"
  const formData = await req.formData();
  const listUnsubscribe = formData.get('List-Unsubscribe');

  if (listUnsubscribe !== 'One-Click') {
    return new NextResponse('Invalid request', { status: 400 });
  }

  // The token is usually passed as a query param in the List-Unsubscribe header URL
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return new NextResponse('Missing token', { status: 400 });
  }

  const verified = verifyUnsubscribeToken(token);

  if (!verified) {
    return new NextResponse('Invalid token', { status: 400 });
  }

  const { workspaceId, contactId } = verified;

  try {
    await db.contact.update({
      where: { id: contactId, workspaceId },
      data: {
        status: 'UNSUBSCRIBED',
        unsubscribedAt: new Date(),
        unsubscribeIp: req.headers.get('x-forwarded-for') || '0.0.0.0',
      },
    });

    return new NextResponse('Unsubscribed successfully', { status: 200 });
  } catch (error) {
    console.error('One-click unsubscribe error:', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
