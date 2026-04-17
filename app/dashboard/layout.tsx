/**
 * app/dashboard/layout.tsx
 * RevTray light layout shell.
 *
 * Redirects new users to /onboarding if they haven't connected Whop yet.
 * This catches users who register via email/password and land here directly
 * instead of going through the /onboarding route.
 */

import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { requireWorkspaceAccess, isBypassActive } from '@/lib/auth/session';
import { db } from '@/lib/db/client';
import { DashboardSidebar } from '@/components/layout/dashboard-sidebar';
import { DashboardTopbar } from '@/components/layout/dashboard-topbar';
import { CommandPalette } from '@/components/ui/command-palette';
import { ClientProviders } from '@/components/ui/client-providers';
import { isEmailAdmin } from '@/lib/admin/utils';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const userIsAdmin = isEmailAdmin(session?.user?.email);

  // --- EMAIL VERIFICATION GATE ---
  // We require verification for credentials users.
  // Admins are auto-bypassed. Whop users might need special handling but for now we nudge everyone.
  if (session?.user && !session.user.emailVerified && !userIsAdmin) {
    // Only redirect if they are not already on the verify-request page (though layout doesn't wrap that)
    redirect('/auth/verify-request');
  }

  const { workspaceId, userId } = await requireWorkspaceAccess();

  // --- PREVIEW MODE BYPASS ---
  if (await isBypassActive()) {
    return (
      <ClientProviders>
        <div className="flex min-h-screen" style={{ background: 'var(--surface-app)' }}>
          <DashboardSidebar isAdmin={true} />
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
  // --- END PREVIEW MODE BYPASS ---

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
        <DashboardSidebar isAdmin={userIsAdmin} />
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
