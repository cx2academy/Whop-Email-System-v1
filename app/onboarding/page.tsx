/**
 * app/onboarding/page.tsx
 *
 * Server component. Reads session + workspace to determine resume point.
 * Passes initial data to the client flow — zero extra fetches during steps.
 */

import type { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db/client';
import { OnboardingFlow } from './flow';

export const metadata: Metadata = { title: 'Get started — RevTray' };

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth/login');

  if (!session.user.workspaceId) {
    const existing = await db.workspaceMembership.findFirst({
      where: { userId: session.user.id },
      select: { workspaceId: true },
    });

    if (existing) {
      redirect(`/api/auth/refresh?callbackUrl=/onboarding`);
    }

    const baseSlug = (session.user.name ?? 'workspace').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 30);
    const count = await db.workspace.count({ where: { slug: { startsWith: baseSlug } } });
    const slug = count === 0 ? baseSlug : `${baseSlug}-${count}`;

    const ws = await db.workspace.create({ data: { name: session.user.name ?? 'My Workspace', slug } });
    await db.workspaceMembership.create({
      data: { workspaceId: ws.id, userId: session.user.id, role: 'OWNER' },
    });

    redirect(`/api/auth/refresh?callbackUrl=/onboarding`);
  }

  const workspaceId = session.user.workspaceId;

  const [workspace, user, contactCount] = await Promise.all([
    db.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        fromEmail: true, fromName: true,
        whopApiKey: true, whopCompanyName: true,
        logoUrl: true, brandColor: true,
        aiCredits: true,   // needed to decide locked vs unlocked sequence step
      },
    }),
    db.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, name: true, hasAchievedFirstSend: true },
    }),
    db.contact.count({ where: { workspaceId, status: 'SUBSCRIBED' } }),
  ]);

  if (user?.hasAchievedFirstSend) redirect('/dashboard');

  let startStep = 1;
  if (workspace?.whopApiKey)  startStep = Math.max(startStep, 2);
  if (workspace?.fromName)    startStep = Math.max(startStep, 3);
  if (workspace?.fromEmail)   startStep = Math.max(startStep, 4);
  if (contactCount > 0)       startStep = Math.max(startStep, 6);

  const userEmail = user?.email ?? session.user.email ?? '';
  const userName  = user?.name  ?? session.user.name  ?? '';

  return (
    <OnboardingFlow
      userEmail={userEmail}
      userName={userName}
      startStep={startStep}
      initialData={{
        companyName:  workspace?.whopCompanyName ?? '',
        brandColor:   workspace?.brandColor ?? '#22C55E',
        fromName:     workspace?.fromName ?? workspace?.whopCompanyName ?? userName,
        contactCount,
        campaignId:   null,
        aiCredits:    workspace?.aiCredits ?? 0,
      }}
    />
  );
}
