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
import { OnboardingWizard } from './onboarding-wizard';

export const metadata: Metadata = { title: 'Get started — RevTray' };

export default async function OnboardingPage(props: { searchParams: Promise<{ force?: string }> }) {
  const searchParams = await props.searchParams;
  const isForce = searchParams.force === 'true';

  const session = await auth();
  if (!session?.user?.id) redirect('/auth/login');

  // If user already has a workspace and has finished onboarding, redirect to dashboard
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { hasAchievedFirstSend: true },
  });

  if (user?.hasAchievedFirstSend && !isForce) redirect('/dashboard');

  let workspaceId = session.user.workspaceId;

  // If no workspace, create a default one to start with
  if (!workspaceId) {
    const baseSlug = (session.user.name ?? 'workspace').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 30);
    const count = await db.workspace.count({ where: { slug: { startsWith: baseSlug } } });
    const slug = count === 0 ? baseSlug : `${baseSlug}-${count}`;

    const ws = await db.workspace.create({ data: { name: session.user.name ?? 'My Workspace', slug } });
    await db.workspaceMembership.create({
      data: { workspaceId: ws.id, userId: session.user.id, role: 'OWNER' },
    });
    
    // We need to refresh the session to include the new workspaceId
    // But for the wizard, we can just use the ID we just created
    workspaceId = ws.id;
  }

  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      name: true,
      slug: true,
      brandColor: true,
      whopCompanyName: true,
    },
  });

  if (!workspace) redirect('/auth/login');

  return (
    <OnboardingWizard
      initialData={{
        name: workspace.name,
        slug: workspace.slug,
        brandColor: workspace.brandColor ?? '#22C55E',
        companyName: workspace.whopCompanyName ?? '',
      }}
    />
  );
}
