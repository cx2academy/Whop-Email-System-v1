'use server';

import { db } from '@/lib/db/client';
import { ensureAdmin } from '@/lib/admin/utils';
import { sendEmail } from '@/lib/email';
import { render } from '@react-email/render';
import { BetaWelcomeEmail } from '@/emails/beta-welcome';
import { getAppUrl } from '@/lib/env';

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

  const [,{ email, name }] = await db.$transaction([
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
      },
      select: { email: true, name: true }
    })
  ]);

  // Trigger the Welcome Email
  try {
    const appUrl = getAppUrl();
    const registrationUrl = `${appUrl}/auth/register?invite=${code}`;
    
    const html = await render(
        BetaWelcomeEmail({ 
            name, 
            inviteCode: code, 
            registrationUrl 
        })
    );

    await sendEmail({
      to: email,
      subject: "Welcome to the RevTray Beta Vault",
      html
    });
  } catch (err) {
    console.error("Failed to send beta welcome email:", err);
    // We don't fail the whole action if email fails, but we log it
  }

  return { success: true, code };
}
