/**
 * Temporary debug route — tries many endpoint variations to find what works.
 * Visit: http://localhost:3000/api/whop/debug
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";

async function tryEndpoint(apiKey: string, path: string, baseUrl = "https://api.whop.com/api/v5") {
  const url = `${baseUrl}${path}`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    });
    const text = await res.text();
    let body: unknown;
    try { body = JSON.parse(text); } catch { body = text.slice(0, 300); }
    return { url, status: res.status, ok: res.ok, body };
  } catch (err) {
    return { url, status: 0, ok: false, body: String(err) };
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.workspaceId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const workspace = await db.workspace.findUnique({
    where: { id: session.user.workspaceId },
    select: { whopApiKey: true },
  });

  if (!workspace?.whopApiKey) {
    return NextResponse.json({ error: "No API key saved" }, { status: 400 });
  }

  const key = workspace.whopApiKey;
  const companyId = "biz_dTAC0xhj7tpYYQ";

  const results = await Promise.all([
    // Different membership endpoint patterns
    tryEndpoint(key, `/company/${companyId}/memberships`),
    tryEndpoint(key, `/companies/${companyId}/memberships`),
    tryEndpoint(key, `/${companyId}/memberships`),
    // Maybe through products
    tryEndpoint(key, `/company/${companyId}/products`),
    tryEndpoint(key, `/products`),
    // v2 API
    tryEndpoint(key, `/company/${companyId}/memberships`, "https://api.whop.com/api/v2"),
    tryEndpoint(key, `/memberships`, "https://api.whop.com/api/v2"),
    // No version prefix
    tryEndpoint(key, `/company/${companyId}/memberships`, "https://api.whop.com"),
  ]);

  return NextResponse.json({ results }, { status: 200 });
}
