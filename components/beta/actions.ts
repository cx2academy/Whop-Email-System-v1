'use server';

import { db } from '@/lib/db/client';

export async function validateBetaCode(code: string) {
  if (!code) throw new Error('Invite code is required.');

  const upperCode = code.trim().toUpperCase();

  const invite = await db.inviteCode.findUnique({
    where: { code: upperCode }
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

export async function joinWaitlist(data: { 
  name: string, 
  email: string, 
  whopHandle?: string,
  revenueRange?: string,
  reason: string, 
  acceptedPledge: boolean 
}) {
  if (!data.name || !data.email) {
    throw new Error('Name and email are required.');
  }

  try {
    const existing = await db.betaWaitlist.findUnique({
      where: { email: data.email.toLowerCase() }
    });

    if (existing) {
      throw new Error('You are already on the waitlist!');
    }

    await db.betaWaitlist.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        whopHandle: data.whopHandle || null,
        revenueRange: data.revenueRange || null,
        reason: data.reason || 'Requested beta access via landing page',
        acceptedPledge: data.acceptedPledge
      }
    });

    return { success: true };
  } catch (err: any) {
    throw new Error(err.message || 'Failed to join waitlist.');
  }
}
