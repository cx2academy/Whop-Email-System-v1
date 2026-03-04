"use server";

/**
 * lib/quickstart/actions.ts
 *
 * Server action powering the Quick Start banner.
 * Sends a test email to the current user, marks hasAchievedFirstSend = true.
 * Reuses existing sendEmail() — no new sending logic.
 */

import { db } from '@/lib/db/client';
import { sendEmail } from '@/lib/email';
import { logger } from '@/lib/logger';
import { requireWorkspaceAccess } from '@/lib/auth/session';

const QUICK_START_TEMPLATES = {
  welcome: {
    label: 'Welcome email',
    subject: 'Welcome to the community!',
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#111"><h1 style="font-size:24px;font-weight:700;margin-bottom:8px">Welcome aboard!</h1><p style="font-size:16px;color:#444;line-height:1.6">We are thrilled to have you here. This is what your community emails will look like.</p><p style="margin-top:32px;font-size:13px;color:#888">Sent as a test from your Whop Email Engine dashboard.</p></div>`,
  },
  announcement: {
    label: 'Announcement',
    subject: 'Big news from the community',
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#111"><h1 style="font-size:24px;font-weight:700;margin-bottom:8px">Big news!</h1><p style="font-size:16px;color:#444;line-height:1.6">We have an exciting announcement to share with the community. Replace this text with your actual news and hit send.</p><p style="margin-top:32px;font-size:13px;color:#888">Sent as a test from your Whop Email Engine dashboard.</p></div>`,
  },
  newsletter: {
    label: 'Newsletter',
    subject: 'This week in the community',
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#111"><h1 style="font-size:24px;font-weight:700;margin-bottom:8px">This week</h1><p style="font-size:16px;color:#444;line-height:1.6"><strong>What is new:</strong><br/>Share your highlights here.</p><p style="font-size:16px;color:#444;line-height:1.6"><strong>Coming up:</strong><br/>Let members know what to look forward to.</p><p style="margin-top:32px;font-size:13px;color:#888">Sent as a test from your Whop Email Engine dashboard.</p></div>`,
  },
} as const;

export type QuickStartTemplateKey = keyof typeof QUICK_START_TEMPLATES;

export interface QuickStartResult {
  success: boolean;
  error?: string;
}

export async function sendQuickStartEmail(
  templateKey: QuickStartTemplateKey,
  toEmail: string
): Promise<QuickStartResult> {
  const { userId, workspaceId } = await requireWorkspaceAccess();

  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { fromEmail: true, fromName: true, name: true },
  });

  if (!workspace?.fromEmail) {
    return {
      success: false,
      error: 'No sender email configured. Add one in Settings first.',
    };
  }

  const template = QUICK_START_TEMPLATES[templateKey];
  const fromName = workspace.fromName ?? workspace.name;

  const result = await sendEmail({
    to: toEmail,
    subject: template.subject,
    html: template.html,
    from: `${fromName} <${workspace.fromEmail}>`,
  });

  if (!result.success) {
    logger.warn('[quickstart] Test email failed', { workspaceId, userId, error: result.error });
    return { success: false, error: result.error ?? 'Failed to send. Try again.' };
  }

  await db.user.update({
    where: { id: userId },
    data: { hasAchievedFirstSend: true },
  });

  logger.info('first_send_completed', { workspaceId, userId, templateKey });

  return { success: true };
}
