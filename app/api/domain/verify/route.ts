/**
 * app/api/domain/verify/route.ts
 *
 * POST /api/domain/verify
 * Body: { domainId: string }
 *
 * Re-checks all four DNS record categories (SPF, DKIM, DMARC, Return-Path)
 * for the given sending domain and returns the full current status.
 *
 * This is the API-route counterpart of the `verifyDomain` server action.
 * It's used by the domain wizard's polling mechanism so verification can
 * run without a full page reload.
 *
 * Rate limit: 10 verifications per minute per workspace
 * (DNS propagation takes minutes–hours, so polling more is pointless)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/auth/session';
import { rateLimit } from '@/lib/rate-limit';
import { db } from '@/lib/db/client';
import { checkDomain } from '@/lib/deliverability/domain-verification';

const verifyLimiter = rateLimit({ limit: 10, windowMs: 60_000 });

export async function POST(req: NextRequest) {
  // --- Auth ---
  let workspaceId: string;
  try {
    ({ workspaceId } = await requireWorkspaceAccess());
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // --- Rate limit ---
  const rl = verifyLimiter.check(`domain:verify:${workspaceId}`);
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Too many verification attempts. DNS propagation takes time — wait a minute.' },
      { status: 429 }
    );
  }

  // --- Parse body ---
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { domainId } = body as Record<string, unknown>;
  if (!domainId || typeof domainId !== 'string') {
    return NextResponse.json({ error: 'domainId is required.' }, { status: 400 });
  }

  // --- Load domain (enforce workspace ownership) ---
  const domain = await db.sendingDomain.findFirst({
    where: { id: domainId, workspaceId },
  });

  if (!domain) {
    return NextResponse.json({ error: 'Domain not found.' }, { status: 404 });
  }

  // --- Run DNS checks ---
  const result = await checkDomain(domain.domain, domain.dkimSelector);

  // --- Persist results ---
  await db.sendingDomain.update({
    where: { id: domainId },
    data: {
      spfVerified:        result.spfVerified,
      dkimVerified:       result.dkimVerified,
      dmarcVerified:      result.dmarcVerified,
      returnPathVerified: result.returnPathVerified,
    },
  });

  // --- Compute overall status ---
  const allRequired    = result.spfVerified && result.dkimVerified;
  const fullyComplete  = allRequired && result.dmarcVerified && result.returnPathVerified;
  const status: 'verified' | 'partial' | 'pending' =
    fullyComplete ? 'verified' : allRequired ? 'partial' : 'pending';

  return NextResponse.json({
    domainId,
    domain: domain.domain,
    status,
    records: {
      spf:         { verified: result.spfVerified,        record: result.spfRecord },
      dkim:        { verified: result.dkimVerified,       record: result.dkimRecord },
      dmarc:       { verified: result.dmarcVerified,      record: result.dmarcRecord },
      return_path: { verified: result.returnPathVerified, record: result.returnPathRecord },
    },
  });
}
