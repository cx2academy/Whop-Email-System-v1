/**
 * app/api/whop/billing-success/route.ts
 *
 * GET /api/whop/billing-success?workspaceId=...&plan=...
 *     /api/whop/billing-success?workspaceId=...&addon=...
 *
 * Whop redirects users here after a successful checkout.
 * This route does NOT apply the plan change — the webhook handles that.
 * It just redirects the user back to settings with a success banner.
 *
 * Why separate from the webhook:
 *   The webhook fires server-to-server and may arrive before or after
 *   the user lands here. We don't apply changes here to avoid race
 *   conditions or double-application. The webhook is the source of truth.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const plan  = searchParams.get('plan');
  const addon = searchParams.get('addon');

  // Build a human-readable success message for the banner
  let message = 'payment_received';
  if (plan)  message = 'plan_upgraded';
  if (addon) message = 'addon_applied';

  // Redirect to settings billing tab with success banner
  const settingsUrl = new URL('/dashboard/settings', req.url);
  settingsUrl.searchParams.set('tab', 'billing');
  settingsUrl.searchParams.set('billing_success', message);

  return NextResponse.redirect(settingsUrl);
}
