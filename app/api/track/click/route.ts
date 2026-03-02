/**
 * app/api/track/click/route.ts
 *
 * Email click tracking redirect endpoint.
 *
 * URL: /api/track/click?c={campaignId}&r={contactId}&url={encodedUrl}
 *
 * Records the click then 302-redirects to the target URL.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get("c");
  const contactId = searchParams.get("r");
  const targetUrl = searchParams.get("u") ?? searchParams.get("url");

  // DEBUG — remove after confirming click tracking works
  console.log("[track/click] hit:", { campaignId, contactId, targetUrl, url: req.url });

  // Validate redirect URL — only allow http/https to prevent open redirect abuse
  const safeRedirect = (() => {
    if (!targetUrl) return null;
    try {
      const parsed = new URL(decodeURIComponent(targetUrl));
      return parsed.protocol === "http:" || parsed.protocol === "https:"
        ? parsed.href
        : null;
    } catch {
      return null;
    }
  })();

  // Fire-and-forget tracking — don't block the redirect
  if (campaignId && contactId) {
    db.emailSend
      .updateMany({
        where: { campaignId, contactId, clickedAt: null },
        data: { status: "CLICKED", clickedAt: new Date() },
      })
      .then(() =>
        db.emailCampaign.update({
          where: { id: campaignId },
          data: { totalClicked: { increment: 1 } },
        })
      )
      .catch((err) =>
        console.warn("[track/click] Non-fatal tracking error:", err)
      );
  }

  // Redirect to target (or home if invalid/missing)
  return NextResponse.redirect(safeRedirect ?? "/", { status: 302 });
}
