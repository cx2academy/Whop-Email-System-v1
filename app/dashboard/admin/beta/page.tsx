import { ensureAdmin } from '@/lib/admin/utils';
import { db } from '@/lib/db/client';
import { AdminBetaDashboard } from './admin-beta-dashboard';

export const metadata = {
  title: 'Admin Beta Vault',
};

export default async function AdminBetaPage() {
  await ensureAdmin();

  // 1. Gather all beta workspaces (assumed by presence of tracking flags, beta overrides, or simply all for visibility right now)
  const workspaces = await db.workspace.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      resendApiKey: true,
      aiCredits: true,
      _count: {
        select: {
          campaigns: true,
          contacts: true,
        }
      }
    }
  });

  // 2. Gather all micro-surveys
  const feedback = await db.betaFeedback.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { name: true, email: true } },
      workspace: { select: { name: true } }
    }
  });

  // 3. Gather invite codes
  const inviteCodes = await db.inviteCode.findMany({
    orderBy: { createdAt: 'desc' }
  });

  // 4. Gather waitlist
  const waitlist = await db.betaWaitlist.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display tracking-tight text-foreground">Beta Command Center</h1>
        <p className="text-muted-foreground text-sm">Monitor tester activity, feedback streams, and vault security.</p>
      </div>

      <AdminBetaDashboard 
        initialData={{
          workspaces,
          feedback,
          inviteCodes,
          waitlist
        }} 
      />
    </div>
  );
}
