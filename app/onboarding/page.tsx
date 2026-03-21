/**
 * app/onboarding/page.tsx
 *
 * Server wrapper for the onboarding flow.
 * Reads session and workspace state, then hands off to the client flow.
 */

import type { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db/client';
import { OnboardingFlow } from './onboarding-flow';

export const metadata: Metadata = { title: 'Get started — RevTray' };

export default async function OnboardingPage() {
  const session = await auth();

  if (!session?.user?.id) redirect('/auth/login');

  // If they have a workspace and have completed setup, go to dashboard
  if (session.user.workspaceId) {
    const workspace = await db.workspace.findUnique({
      where: { id: session.user.workspaceId },
      select: {
        id:             true,
        name:           true,
        fromEmail:      true,
        fromName:       true,
        whopApiKey:     true,
        whopCompanyName: true,
        logoUrl:        true,
        brandColor:     true,
      },
    }).catch(() => null);

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { hasAchievedFirstSend: true, email: true, name: true },
    }).catch(() => null);

    const contactCount = await db.contact.count({
      where: { workspaceId: session.user.workspaceId, status: 'SUBSCRIBED' },
    }).catch(() => 0);

    // Determine starting step based on what's already done
    let startStep = 1;
    if (workspace?.whopApiKey)     startStep = Math.max(startStep, 2);
    if (workspace?.fromName)       startStep = Math.max(startStep, 3);
    if (workspace?.fromEmail)      startStep = Math.max(startStep, 4);
    if (contactCount > 0)          startStep = Math.max(startStep, 6);
    if (user?.hasAchievedFirstSend) redirect('/dashboard');

    return (
      <OnboardingFlow
        workspaceId={session.user.workspaceId}
        userEmail={user?.email ?? session.user.email ?? ''}
        userName={user?.name ?? session.user.name ?? ''}
        startStep={startStep}
        initialData={{
          whopCompanyName: workspace?.whopCompanyName ?? null,
          logoUrl:         workspace?.logoUrl ?? null,
          brandColor:      workspace?.brandColor ?? '#22C55E',
          fromName:        workspace?.fromName ?? null,
          fromEmail:       workspace?.fromEmail ?? null,
          contactCount,
        }}
      />
    );
  }

  // No workspace yet — show step 0 (create workspace + connect Whop in one action)
  return (
    <OnboardingFlow
      workspaceId={null}
      userEmail={session.user.email ?? ''}
      userName={session.user.name ?? ''}
      startStep={1}
      initialData={{
        whopCompanyName: null,
        logoUrl:         null,
        brandColor:      '#22C55E',
        fromName:        null,
        fromEmail:       null,
        contactCount:    0,
      }}
    />
  );
}
