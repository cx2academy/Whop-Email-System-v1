import { verifyUnsubscribeToken } from '@/lib/email/unsubscribe';
import { db } from '@/lib/db/client';
import { redirect } from 'next/navigation';
import { CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';

export default async function UnsubscribePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const verified = verifyUnsubscribeToken(token);

  if (!verified) {
    return (
      <div className="min-h-screen bg-[#090A0C] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <XCircle className="h-16 w-16 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-white">Invalid Link</h1>
          <p className="text-gray-400">
            This unsubscribe link is invalid or has expired. If you believe this is an error, please contact support.
          </p>
          <Link href="/" className="inline-block text-[#22C55E] hover:underline font-medium">
            Go to RevTray
          </Link>
        </div>
      </div>
    );
  }

  const { workspaceId, contactId } = verified;

  try {
    // Perform unsubscribe
    await db.contact.update({
      where: { id: contactId, workspaceId },
      data: {
        status: 'UNSUBSCRIBED',
        unsubscribedAt: new Date(),
      },
    });

    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
      select: { name: true, unsubscribeRedirectUrl: true },
    });

    if (workspace?.unsubscribeRedirectUrl) {
      redirect(workspace.unsubscribeRedirectUrl);
    }

    return (
      <div className="min-h-screen bg-[#090A0C] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <CheckCircle2 className="h-16 w-16 text-[#22C55E]" />
          </div>
          <h1 className="text-2xl font-bold text-white">Unsubscribed</h1>
          <p className="text-gray-400">
            You have been successfully removed from <strong>{workspace?.name || 'the mailing list'}</strong>. 
            You will no longer receive marketing emails from them.
          </p>
          <div className="pt-4">
            <p className="text-xs text-gray-600">
              Did this by mistake? Please contact the sender to resubscribe.
            </p>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return (
      <div className="min-h-screen bg-[#090A0C] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <XCircle className="h-16 w-16 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
          <p className="text-gray-400">
            We couldn&apos;t process your request. Please try again later.
          </p>
        </div>
      </div>
    );
  }
}
