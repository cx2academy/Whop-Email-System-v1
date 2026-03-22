/**
 * app/dashboard/settings/billing/page.tsx
 *
 * Full-page pricing UI — inspired by Claude's pricing page layout
 * but in RevTray's light design system (white cards, green accents).
 *
 * Layout:
 *   - Large headline + sub
 *   - 3-column plan cards (Free | Starter | Growth | Scale)
 *     shown as: Free on left, Starter center, Growth highlighted, Scale right
 *   - Each card: name, tagline, price, CTA button, feature list
 *   - Add-ons section below
 *   - Usage summary at bottom
 */

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireWorkspaceAccess } from '@/lib/auth/session';
import { db } from '@/lib/db/client';
import { getWorkspaceUsage } from '@/lib/plans/gates';
import { PLANS, PLAN_ORDER } from '@/lib/plans/config';
import { BillingSuccessBanner } from '../billing-success-banner';
import { BillingPageClient } from './billing-page-client';

export const metadata: Metadata = { title: 'Plans & Billing — RevTray' };

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ billing_success?: string }>;
}) {
  const params = await searchParams;
  const { workspaceId, workspaceRole } = await requireWorkspaceAccess();
  const isAdmin = workspaceRole === 'OWNER' || workspaceRole === 'ADMIN';

  const [workspace, usage] = await Promise.all([
    db.workspace.findUnique({
      where: { id: workspaceId },
      select: { plan: true, billingStatus: true, billingPeriodEnd: true },
    }),
    getWorkspaceUsage(workspaceId),
  ]);

  if (!workspace) redirect('/dashboard');

  const currentPlan = workspace.plan;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 64px' }}>
      {params.billing_success && (
        <div style={{ marginBottom: 24 }}>
          <BillingSuccessBanner message={params.billing_success} />
        </div>
      )}

      <BillingPageClient
        currentPlan={currentPlan}
        usage={usage}
        isAdmin={isAdmin}
        billingStatus={workspace.billingStatus}
        billingPeriodEnd={workspace.billingPeriodEnd?.toISOString() ?? null}
      />
    </div>
  );
}
