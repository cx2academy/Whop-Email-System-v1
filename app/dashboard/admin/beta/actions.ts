'use server';

import { db } from '@/lib/db/client';
import { ensureAdmin } from '@/lib/admin/utils';

export async function generateInviteCode(maxUses: number = 1, prefix: string = 'BETA') {
  await ensureAdmin();

  const randomString = Math.random().toString(36).substring(2, 8).toUpperCase();
  const code = `${prefix}-${randomString}`;

  await db.inviteCode.create({
    data: {
      code,
      maxUses,
    }
  });

  return { success: true };
}
