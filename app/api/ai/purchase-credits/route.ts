/**
 * app/api/ai/purchase-credits/route.ts
 *
 * POST /api/ai/purchase-credits
 *
 * Adds AI credits to the workspace. Currently simulated (no payment processor).
 * Structure is payment-processor-ready: wire Stripe/Whop checkout in front of
 * the addCredits() call when ready.
 *
 * Available packages (defined in CREDIT_PACKAGES):
 *   starter   →  25 credits  ($4.99)
 *   pro       → 100 credits  ($14.99)
 *   unlimited → 500 credits  ($49.99)
 *
 * Auth: session required, any role
 * Rate limit: 10 per hour per workspace (prevents abuse of free simulate mode)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/auth/session';
import { addCredits } from '@/lib/ai/credits';
import { rateLimit } from '@/lib/rate-limit';

const purchaseLimiter = rateLimit({ limit: 10, windowMs: 3_600_000 });

// ---------------------------------------------------------------------------
// Credit packages — update prices here when wiring real payments
// ---------------------------------------------------------------------------

export const CREDIT_PACKAGES = {
  starter: {
    id:       'starter',
    label:    'Starter Pack',
    credits:  25,
    priceUsd: 4.99,
    popular:  false,
  },
  pro: {
    id:       'pro',
    label:    'Pro Pack',
    credits:  100,
    priceUsd: 14.99,
    popular:  true,
  },
  unlimited: {
    id:       'unlimited',
    label:    'Unlimited Pack',
    credits:  500,
    priceUsd: 49.99,
    popular:  false,
  },
} as const;

export type CreditPackageId = keyof typeof CREDIT_PACKAGES;

// ---------------------------------------------------------------------------
// GET — return available packages + current balance
// ---------------------------------------------------------------------------

export async function GET() {
  let workspaceId: string;
  try {
    ({ workspaceId } = await requireWorkspaceAccess());
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { db } = await import('@/lib/db/client');
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { aiCredits: true },
  });

  return NextResponse.json({
    currentBalance: workspace?.aiCredits ?? 0,
    packages: Object.values(CREDIT_PACKAGES),
  });
}

// ---------------------------------------------------------------------------
// POST — simulate credit purchase (swap for real payment gate later)
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  let workspaceId: string;
  try {
    ({ workspaceId } = await requireWorkspaceAccess());
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = purchaseLimiter.check(`credits:purchase:${workspaceId}`);
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Too many purchase attempts. Try again later.' },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { packageId } = body as Record<string, unknown>;

  if (!packageId || !Object.keys(CREDIT_PACKAGES).includes(packageId as string)) {
    return NextResponse.json(
      {
        error: 'Invalid packageId.',
        validPackages: Object.keys(CREDIT_PACKAGES),
      },
      { status: 400 }
    );
  }

  const pkg = CREDIT_PACKAGES[packageId as CreditPackageId];

  // -------------------------------------------------------------------------
  // TODO: Replace this block with real payment verification before going live
  //
  // Stripe example:
  //   const session = await stripe.checkout.sessions.retrieve(sessionId);
  //   if (session.payment_status !== 'paid') return error;
  //
  // Whop example:
  //   verify the Whop purchase webhook payload before calling addCredits()
  // -------------------------------------------------------------------------

  const { newBalance } = await addCredits(
    workspaceId,
    pkg.credits,
    'purchase',
    `pkg:${pkg.id}`
  );

  return NextResponse.json({
    success: true,
    creditsAdded: pkg.credits,
    newBalance,
    package: pkg,
    message: `${pkg.credits} credits added to your workspace.`,
  });
}
