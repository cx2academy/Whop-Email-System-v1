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
import { DashboardTourInitializer } from '@/components/tour/dashboard-tour-initializer';

import { checkDomainAvailability } from '@/app/onboarding/actions'; // not needed just a ref
import { BetaQuestEngine } from '@/components/beta/beta-quest-engine';

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
          <DashboardTourInitializer hasCompletedTour={false} />
          {process.env.NEXT_PUBLIC_BETA_MODE === 'true' && <BetaQuestEngine unlockedQuests={[]} />}
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
      select: { onboardingDismissedAt: true, hasAchievedFirstSend: true, hasCompletedTour: true },
    }),
  ]);

  const needsOnboarding =
    !workspace?.whopApiKey &&
    !user?.hasAchievedFirstSend &&
    !user?.onboardingDismissedAt;

  if (needsOnboarding) redirect('/onboarding');

  // --- BETA QUEST ENGINE LOGIC ---
  let unlockedQuests: string[] = [];
  let hasGraduated = false;

  if (process.env.NEXT_PUBLIC_BETA_MODE === 'true') {
    const [feedbacks, domainsCount, contactsCount, campaignsCount, aiLogsCount] = await Promise.all([
      db.betaFeedback.findMany({ where: { workspaceId }, select: { feature: true } }),
      db.sendingDomain.count({ where: { workspaceId } }),
      db.contact.count({ where: { workspaceId } }),
      db.emailCampaign.count({ where: { workspaceId } }),
      db.aiCreditLog.count({ where: { workspaceId } })
    ]);

    const submittedSet = new Set(feedbacks.map(f => f.feature));
    
    // Evaluate base quests
    const completedQuests = {
      domain_setup: domainsCount > 0,
      imported_leads: contactsCount > 0,
      used_ai: aiLogsCount > 0,
      sent_campaign: campaignsCount > 0
    };

    if (completedQuests.domain_setup && !submittedSet.has('domain_setup')) unlockedQuests.push('domain_setup');
    if (completedQuests.imported_leads && !submittedSet.has('imported_leads')) unlockedQuests.push('imported_leads');
    if (completedQuests.used_ai && !submittedSet.has('used_ai')) unlockedQuests.push('used_ai');
    if (completedQuests.sent_campaign && !submittedSet.has('sent_campaign')) unlockedQuests.push('sent_campaign');

    // Graduation evaluation
    const allCoreSubmitted = ['domain_setup', 'imported_leads', 'used_ai', 'sent_campaign'].every(q => submittedSet.has(q));
    
    if (allCoreSubmitted) {
      if (!submittedSet.has('graduation')) {
        unlockedQuests.push('graduation');
      } else {
        hasGraduated = true;
      }
    }
  }
  // --- END BETA QUEST ENGINE LOGIC ---

  return (
    <ClientProviders>
      <div className="flex min-h-screen" style={{ background: 'var(--surface-app)' }}>
        <DashboardSidebar isAdmin={userIsAdmin} hasGraduated={hasGraduated} />
        <div className="flex flex-1 flex-col min-w-0">
          <DashboardTopbar />
          <main className="flex-1 overflow-auto animate-fade-up">
            <div className="mx-auto max-w-5xl px-8 py-8">
              {children}
            </div>
          </main>
        </div>
        <CommandPalette />
        <DashboardTourInitializer hasCompletedTour={user?.hasCompletedTour ?? false} />
        {process.env.NEXT_PUBLIC_BETA_MODE === 'true' && user?.hasCompletedTour && <BetaQuestEngine unlockedQuests={unlockedQuests} />}
      </div>
    </ClientProviders>
  );
}
