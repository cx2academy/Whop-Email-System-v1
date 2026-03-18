/**
 * app/api/domain/affiliate-click/route.ts
 *
 * POST /api/domain/affiliate-click
 * Body: { searchLogId: string, registrar: 'namecheap' | 'godaddy' | 'cloudflare' }
 *
 * Records which registrar the user clicked for monetization reporting.
 * Called fire-and-forget from the UI — the affiliate redirect happens
 * client-side immediately; this log write is non-blocking.
 *
 * Not rate-limited aggressively — one click per search is the natural pattern.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/auth/session';
import { db } from '@/lib/db/client';

const VALID_REGISTRARS = ['namecheap', 'godaddy', 'cloudflare'] as const;
type Registrar = typeof VALID_REGISTRARS[number];

export async function POST(req: NextRequest) {
  let workspaceId: string;
  try {
    ({ workspaceId } = await requireWorkspaceAccess());
  } catch {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const { searchLogId, registrar } = body as Record<string, unknown>;

  if (
    typeof searchLogId !== 'string' ||
    typeof registrar !== 'string' ||
    !VALID_REGISTRARS.includes(registrar as Registrar)
  ) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // Verify the log belongs to this workspace before updating
  await db.domainSearchLog.updateMany({
    where: { id: searchLogId, workspaceId },
    data: { registrarClicked: registrar, clickedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
