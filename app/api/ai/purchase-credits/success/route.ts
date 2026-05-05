import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/auth/session';
import { addCredits } from '@/lib/ai/credits';
import { CREDIT_PACKAGES, CreditPackageId } from '../route';
import { db } from '@/lib/db/client';

export async function GET(req: NextRequest) {
  let workspaceId: string;
  let userId: string;
  try {
    const session = await requireWorkspaceAccess();
    workspaceId = session.workspaceId;
    userId = session.userId;
  } catch {
    return NextResponse.redirect(new URL('/auth/login', req.url));
  }

  const { searchParams } = new URL(req.url);
  const pkgId = searchParams.get('pkg') as CreditPackageId;
  const workspaceParam = searchParams.get('workspace');

  if (!pkgId || !CREDIT_PACKAGES[pkgId] || workspaceParam !== workspaceId) {
    return NextResponse.redirect(new URL('/dashboard/settings/billing?error=invalid_package', req.url));
  }

  const pkg = CREDIT_PACKAGES[pkgId];
  const productId = pkg.productId;

  if (!productId) {
    return NextResponse.redirect(new URL('/dashboard/settings/billing?error=missing_product_id', req.url));
  }

  // Get Whop User ID from Account
  const account = await db.account.findFirst({
    where: { userId, provider: 'whop' },
    select: { providerAccountId: true }
  });

  const whopUserId = account?.providerAccountId || userId;

  try {
    const whopApiKey = process.env.WHOP_API_KEY;
    if (whopApiKey) {
      const res = await fetch(`https://api.whop.com/api/v2/memberships?product_id=${productId}&user_id=${whopUserId}`, {
        headers: { Authorization: `Bearer ${whopApiKey}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        const memberships = data.data || [];
        const isValid = memberships.some((m: any) => m.valid);
        
        if (isValid) {
          // Verify and add credits
          await addCredits(workspaceId, pkg.credits, 'purchase', pkg.id);
        }
      }
    }
  } catch (err) {
    console.error('[purchase-credits/success] Verification failed:', err);
  }

  return NextResponse.redirect(new URL('/dashboard/settings/billing?credit_success=1', req.url));
}
