'use server';

import { db } from '@/lib/db/client';

export async function validateBetaCode(code: string) {
  if (!code) throw new Error('Invite code is required.');

  const invite = await db.inviteCode.findUnique({
    where: { code: code.trim().toUpperCase() }
  });

  if (!invite) {
    throw new Error('Invalid invite code.');
  }

  if (invite.currentUses >= invite.maxUses) {
    throw new Error('This invite code has already been used.');
  }

  if (invite.expiresAt && invite.expiresAt < new Date()) {
    throw new Error('This invite code has expired.');
  }

  return { success: true };
}
