/**
 * app/unsubscribe/page.tsx
 *
 * One-click unsubscribe page.
 *
 * URL format: /unsubscribe?token=<base64url(campaignId:contactId)>
 *
 * On load: immediately processes the unsubscribe and shows confirmation.
 * No login required — the token is the auth mechanism.
 */

import type { Metadata } from "next";
import { db } from "@/lib/db/client";

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
};

interface UnsubscribePageProps {
  searchParams: { token?: string };
}

async function processUnsubscribe(
  token: string
): Promise<{ success: boolean; error?: string }> {
  let campaignId: string;
  let contactId: string;

  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const parts = decoded.split(":");
    if (parts.length !== 2) throw new Error("Invalid token format");
    [campaignId, contactId] = parts as [string, string];
  } catch {
    return { success: false, error: "Invalid unsubscribe link" };
  }

  // Verify the contact exists
  const contact = await db.contact.findUnique({
    where: { id: contactId },
    select: { id: true, status: true, workspaceId: true },
  });

  if (!contact) {
    return { success: false, error: "Contact not found" };
  }

  // Idempotent — already unsubscribed is a success
  if (contact.status === "UNSUBSCRIBED") {
    return { success: true };
  }

  // Update contact status
  await db.contact.update({
    where: { id: contactId },
    data: {
      status: "UNSUBSCRIBED",
      unsubscribedAt: new Date(),
    },
  });

  // Update the EmailSend record if it exists
  await db.emailSend
    .updateMany({
      where: { campaignId, contactId },
      data: { status: "UNSUBSCRIBED" },
    })
    .catch(() => null); // Non-fatal

  return { success: true };
}

export default async function UnsubscribePage({
  searchParams,
}: UnsubscribePageProps) {
  const token = searchParams.token;

  if (!token) {
    return <UnsubscribeLayout status="error" message="Missing unsubscribe token." />;
  }

  const result = await processUnsubscribe(token);

  return (
    <UnsubscribeLayout
      status={result.success ? "success" : "error"}
      message={result.error}
    />
  );
}

function UnsubscribeLayout({
  status,
  message,
}: {
  status: "success" | "error";
  message?: string;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-4 text-4xl">
          {status === "success" ? "✅" : "❌"}
        </div>
        <h1 className="mb-2 text-xl font-semibold text-foreground">
          {status === "success" ? "You've been unsubscribed" : "Something went wrong"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {status === "success"
            ? "You will no longer receive emails from this sender."
            : message ?? "This unsubscribe link is invalid or has expired."}
        </p>
      </div>
    </main>
  );
}
