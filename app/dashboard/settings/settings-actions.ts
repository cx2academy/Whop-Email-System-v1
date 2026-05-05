'use server';

import { db } from '@/lib/db/client';
import { requireWorkspaceAccess } from '@/lib/auth/session';

export async function saveWebhookSecret(secret: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    await db.workspace.update({
      where: { id: workspaceId },
      data: { webhookSecret: secret },
    });
    return { success: true };
  } catch (err) {
    console.error('saveWebhookSecret error:', err);
    return { success: false, error: 'Failed to save webhook secret' };
  }
}
