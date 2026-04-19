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

export async function updateWaitlistStatus(id: string, status: 'APPROVED' | 'REJECTED') {
  await ensureAdmin();

  if (status === 'REJECTED') {
    await db.betaWaitlist.update({
      where: { id },
      data: { status: 'REJECTED' }
    });
    return { success: true };
  }

  // If approved, generate code + link it
  const randomString = Math.random().toString(36).substring(2, 8).toUpperCase();
  const code = `BETA-${randomString}`;

  await db.$transaction([
    db.inviteCode.create({
      data: {
        code,
        maxUses: 1,
      }
    }),
    db.betaWaitlist.update({
      where: { id },
      data: { 
        status: 'APPROVED',
        inviteCode: code
      }
    })
  ]);

  // In a real app, we'd trigger the Resend email here too.
  // For now we've updated the DB state.

  return { success: true, code };
}
