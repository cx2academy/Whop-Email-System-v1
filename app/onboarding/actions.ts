'use server';

import { auth } from '@/auth';
import { db } from '@/lib/db/client';
import { createWhopClient } from '@/lib/whop/client';
import { revalidatePath } from 'next/cache';
import { Resend } from 'resend';
import { requireWorkspaceAccessOrThrow, getSession } from '@/lib/auth/session';
import { getAppUrl } from '@/lib/env';

let resendClient: Resend | null = null;

function getResend() {
  if (!resendClient) {
    const key = process.env.RESEND_API_KEY;
    if (!key) return null; // Onboarding welcome email is optional if key missing
    resendClient = new Resend(key);
  }
  return resendClient;
}

export async function validateWhopKey(apiKey: string) {
  const session = await getSession();
  if (!session?.user?.id) throw new Error('Unauthorized');

  try {
    const client = createWhopClient(apiKey);
    const result = await client.validateApiKey();
    return result;
  } catch (error) {
    console.error('Validation error:', error);
    return { valid: false };
  }
}

export async function validateResendKey(apiKey: string) {
  const session = await getSession();
  if (!session?.user?.id) throw new Error('Unauthorized');

  try {
    const resend = new Resend(apiKey);
    // We do a simple domains list fetch to validate the API key
    const domains = await resend.domains.list();
    if (domains.error) {
      return { valid: false };
    }
    return { valid: true };
  } catch (error) {
    console.error('Resend Validation error:', error);
    return { valid: false };
  }
}

export async function saveOnboardingData(data: {
  name: string;
  slug: string;
  niche?: string;
  brandColor?: string;
  logoUrl?: string;
  whopApiKey?: string;
  whopCompanyName?: string;
  resendApiKey?: string;
}) {
  const { workspaceId } = await requireWorkspaceAccessOrThrow();

  try {
    await db.workspace.update({
      where: { id: workspaceId },
      data: {
        name: data.name,
        slug: data.slug,
        niche: data.niche,
        brandColor: data.brandColor,
        logoUrl: data.logoUrl,
        whopApiKey: data.whopApiKey,
        whopCompanyName: data.whopCompanyName,
        resendApiKey: data.resendApiKey,
      },
    });
  } catch (error: any) {
    if (error.code === 'P2002' && error.meta?.target?.includes('slug')) {
      return { success: false, error: 'That workspace URL is already taken.' };
    }
    console.error('Failed to save onboarding data:', error);
    return { success: false, error: 'An unexpected error occurred while saving.' };
  }

  revalidatePath('/onboarding');
  return { success: true };
}

import { checkDomainAvailability as checkDomainAvailabilityCore } from '@/lib/domains/actions';

export async function checkDomainAvailability(domain: string) {
  return await checkDomainAvailabilityCore(domain);
}

export async function completeOnboarding() {
  const { userId, workspaceId } = await requireWorkspaceAccessOrThrow();

  // Mark user as having achieved first send (or just finished onboarding)
  await db.user.update({
    where: { id: userId },
    data: { hasAchievedFirstSend: true },
  });

  // Send Welcome Email
  try {
    const resend = getResend();
    const session = await getSession();
    if (resend && session?.user?.email) {
      const appUrl = getAppUrl();
      await resend.emails.send({
        from: 'RevTray <welcome@revtray.com>',
        to: session.user.email,
        subject: 'Welcome to RevTray!',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #0D0F12;">
            <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 20px;">Welcome to RevTray!</h1>
            <p style="font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
              We're thrilled to have you on board. RevTray is built to help you see exactly how much revenue your emails are generating.
            </p>
            <p style="font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
              Your Whop account is connected, and we're ready to start syncing your audience.
            </p>
            <a href="${appUrl}/dashboard" style="display: inline-block; background: #22C55E; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
              Go to Dashboard
            </a>
            <p style="font-size: 14px; color: #5A6472; margin-top: 40px;">
              If you have any questions, just reply to this email.
            </p>
          </div>
        `,
      });
    }
  } catch (error) {
    console.error('Failed to send welcome email:', error);
  }

 revalidatePath('/dashboard');
  return { success: true };
}

export async function consumeInviteCode(code: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  const invite = await db.inviteCode.findUnique({
    where: { code: code.toUpperCase() }
  });

  if (!invite) return { success: false };

  if (invite.currentUses < invite.maxUses) {
    await db.inviteCode.update({
      where: { id: invite.id },
      data: { currentUses: { increment: 1 } }
    });
    return { success: true };
  }

  return { success: false };
}
