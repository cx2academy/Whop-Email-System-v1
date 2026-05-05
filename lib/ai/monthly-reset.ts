import { db } from '@/lib/db/client';
import { PLANS } from '@/lib/plans/config';

export async function resetMonthlyCredits(workspaceId: string): Promise<void> {
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, plan: true, aiCredits: true, aiCreditsLastReset: true },
  });

  if (!workspace) return;

  const planConfig = PLANS[workspace.plan];
  const aiCreditsMonthly = planConfig.limits.aiCreditsMonthly;

  if (aiCreditsMonthly === null) return; // Unlimited

  const daysSinceReset = (Date.now() - workspace.aiCreditsLastReset.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceReset >= 28) {
    const oldBalance = workspace.aiCredits;
    const newBalance = aiCreditsMonthly;

    await db.workspace.update({
      where: { id: workspaceId },
      data: {
        aiCredits: newBalance,
        aiCreditsLastReset: new Date(),
      },
    });

    await db.aiCreditLog.create({
      data: {
        workspaceId,
        delta: newBalance - oldBalance,
        balanceAfter: newBalance,
        reason: 'monthly_reset',
        refId: null,
      },
    });
  }
}

export async function resetAllWorkspacesMonthly(): Promise<{ reset: number; skipped: number }> {
  const twentyEightDaysAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);

  const workspacesToReset = await db.workspace.findMany({
    where: {
      aiCreditsLastReset: {
        lte: twentyEightDaysAgo,
      },
    },
    select: { id: true },
  });

  let reset = 0;
  let skipped = 0;

  for (const w of workspacesToReset) {
    try {
      await resetMonthlyCredits(w.id);
      reset++;
    } catch (err) {
      console.error(`Failed to reset credits for workspace ${w.id}:`, err);
      skipped++;
    }
  }

  return { reset, skipped };
}
