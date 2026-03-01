/**
 * app/api/track/open/route.ts
 *
 * Email open tracking endpoint.
 *
 * Called when the tracking pixel in an email is loaded.
 * Returns a 1x1 transparent GIF to avoid breaking email clients.
 *
 * URL: /api/track/open?c={campaignId}&r={contactId}
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";

// 1x1 transparent GIF (35 bytes)
const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get("c");
  const contactId = searchParams.get("r");

  // Fire-and-forget tracking update — non-blocking
  if (campaignId && contactId) {
    db.emailSend
      .updateMany({
        where: {
          campaignId,
          contactId,
          openedAt: null, // Only record first open
        },
        data: {
          status: "OPENED",
          openedAt: new Date(),
        },
      })
      .then(() =>
        db.emailCampaign.update({
          where: { id: campaignId },
          data: { totalOpened: { increment: 1 } },
        })
      )
      .catch((err) =>
        console.warn("[track/open] Non-fatal tracking error:", err)
      );
  }

  // Always return the pixel immediately — don't block on DB
  return new NextResponse(TRANSPARENT_GIF, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
