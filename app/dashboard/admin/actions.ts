'use server';

import { auth } from '@/auth';
import { db } from '@/lib/db/client';
import { redirect } from 'next/navigation';

const ADMIN_EMAILS = ['bauxiticstar7546@gmail.com'];

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
    redirect('/dashboard');
  }
}

export async function getGlobalStats() {
  await requireAdmin();

  const [
    totalWorkspaces,
    totalUsers,
    totalCampaigns,
    totalEmailsSent,
    totalRevenue,
    recentWebhooks,
  ] = await Promise.all([
    db.workspace.count(),
    db.user.count(),
    db.emailCampaign.count(),
    db.emailSend.count({ where: { status: 'SENT' } }),
    db.revenueAttribution.aggregate({
      _sum: { amountCents: true },
    }),
    db.webhookLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { workspace: { select: { name: true } } },
    }),
  ]);

  return {
    totalWorkspaces,
    totalUsers,
    totalCampaigns,
    totalEmailsSent,
    totalRevenue: (totalRevenue._sum.amountCents || 0) / 100,
    recentWebhooks,
  };
}
