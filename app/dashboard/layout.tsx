/**
 * app/dashboard/layout.tsx
 * RevTray light layout shell.
 *
 * Redirects new users to /onboarding if they haven't connected Whop yet.
 * This catches users who register via email/password and land here directly
 * instead of going through the /onboarding route.
 */

import { redirect } from 'next/navigation';
import { requireWorkspaceAccess } from '@/lib/auth/session';
import { db } from '@/lib/db/client';
import { DashboardSidebar } from '@/components/layout/dashboard-sidebar';
import { DashboardTopbar } from '@/components/layout/dashboard-topbar';
import { CommandPalette } from '@/components/ui/command-palette';
import { ClientProviders } from '@/components/ui/client-providers';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { workspaceId, userId } = await requireWorkspaceAccess();

  // Redirect new users who haven't connected Whop yet.
  // whopApiKey missing = fresh account that needs onboarding.
  // Skip redirect if they've explicitly dismissed onboarding or already sent.
  const [workspace, user] = await Promise.all([
    db.workspace.findUnique({
      where: { id: workspaceId },
      select: { whopApiKey: true },
    }),
    db.user.findUnique({
      where: { id: userId },
      select: { onboardingDismissedAt: true, hasAchievedFirstSend: true },
    }),
  ]);

  const needsOnboarding =
    !workspace?.whopApiKey &&
    !user?.hasAchievedFirstSend &&
    !user?.onboardingDismissedAt;

  if (needsOnboarding) redirect('/onboarding');

  return (
    <ClientProviders>
      <div className="flex min-h-screen" style={{ background: 'var(--surface-app)' }}>
        <DashboardSidebar />
        <div className="flex flex-1 flex-col min-w-0">
          <DashboardTopbar />
          <main className="flex-1 overflow-auto animate-fade-up">
            <div className="mx-auto max-w-5xl px-8 py-8">
              {children}
            </div>
          </main>
        </div>
        <CommandPalette />
      </div>
    </ClientProviders>
  );
}
