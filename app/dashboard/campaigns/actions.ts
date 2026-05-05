'use server';

import { db } from '@/lib/db/client';
import { requireWorkspaceAccess } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';

export async function toggleCampaignApproval(campaignId: string, isApproved: boolean) {
  const { workspaceId } = await requireWorkspaceAccess();

  await db.emailCampaign.update({
    where: { id: campaignId, workspaceId },
    data: { isApproved },
  });

  revalidatePath('/dashboard/campaigns');
}

export async function approveAllCampaigns(campaignIds: string[]) {
  const { workspaceId } = await requireWorkspaceAccess();

  await db.emailCampaign.updateMany({
    where: { 
      id: { in: campaignIds },
      workspaceId 
    },
    data: { isApproved: true },
  });

  revalidatePath('/dashboard/campaigns');
}

export async function getCampaignDetail(campaignId: string) {
  const { workspaceId } = await requireWorkspaceAccess();

  return db.emailCampaign.findUnique({
    where: { id: campaignId, workspaceId },
    select: { id: true, subject: true, previewText: true, htmlBody: true },
  });
}
