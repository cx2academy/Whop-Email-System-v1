'use server';

/**
 * lib/forms/actions.ts
 *
 * Server actions for lead capture form management and submission.
 *
 * Public flow (no auth):
 *   submitForm()   → creates PENDING contact + sends confirmation email
 *   confirmOptIn() → validates token, upgrades contact to SUBSCRIBED
 *
 * Admin flow (auth required):
 *   createForm, updateForm, deleteForm, getForms, getForm
 */

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { requireAdminAccess, requireWorkspaceAccess } from '@/lib/auth/session';
import { sendEmail } from '@/lib/email';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
    + '-' + Math.random().toString(36).slice(2, 7);
}

// ---------------------------------------------------------------------------
// Admin: CRUD
// ---------------------------------------------------------------------------

const formSchema = z.object({
  name:           z.string().min(1).max(100).trim(),
  headline:       z.string().max(120).trim().optional(),
  description:    z.string().max(300).trim().optional(),
  buttonText:     z.string().max(40).trim().optional(),
  tagIds:         z.array(z.string()).optional(),
  doubleOptIn:    z.boolean().optional(),
  confirmSubject: z.string().max(200).trim().optional(),
  confirmMessage: z.string().max(1000).trim().optional(),
  redirectUrl:    z.string().url().optional().or(z.literal('')),
  successMessage: z.string().max(300).trim().optional(),
  isActive:       z.boolean().optional(),
});

export async function createForm(raw: unknown) {
  const { workspaceId } = await requireAdminAccess();
  const parsed = formSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }
  const d = parsed.data;
  const form = await db.leadCaptureForm.create({
    data: {
      workspaceId,
      name:           d.name,
      slug:           makeSlug(d.name),
      headline:       d.headline       ?? 'Join the newsletter',
      description:    d.description,
      buttonText:     d.buttonText     ?? 'Subscribe',
      tagIds:         d.tagIds         ?? [],
      doubleOptIn:    d.doubleOptIn    ?? true,
      confirmSubject: d.confirmSubject ?? 'Please confirm your subscription',
      confirmMessage: d.confirmMessage,
      redirectUrl:    d.redirectUrl    || null,
      successMessage: d.successMessage ?? 'Thanks! Check your email to confirm.',
      isActive:       d.isActive       ?? true,
    },
  });
  revalidatePath('/dashboard/forms');
  return { success: true as const, data: { formId: form.id, slug: form.slug } };
}

export async function updateForm(formId: string, raw: unknown) {
  const { workspaceId } = await requireAdminAccess();
  const parsed = formSchema.partial().safeParse(raw);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }
  const d = parsed.data;
  await db.leadCaptureForm.updateMany({
    where: { id: formId, workspaceId },
    data: {
      ...(d.name           !== undefined && { name:           d.name }),
      ...(d.headline       !== undefined && { headline:       d.headline }),
      ...(d.description    !== undefined && { description:    d.description }),
      ...(d.buttonText     !== undefined && { buttonText:     d.buttonText }),
      ...(d.tagIds         !== undefined && { tagIds:         d.tagIds }),
      ...(d.doubleOptIn    !== undefined && { doubleOptIn:    d.doubleOptIn }),
      ...(d.confirmSubject !== undefined && { confirmSubject: d.confirmSubject }),
      ...(d.confirmMessage !== undefined && { confirmMessage: d.confirmMessage }),
      ...(d.redirectUrl    !== undefined && { redirectUrl:    d.redirectUrl || null }),
      ...(d.successMessage !== undefined && { successMessage: d.successMessage }),
      ...(d.isActive       !== undefined && { isActive:       d.isActive }),
    },
  });
  revalidatePath('/dashboard/forms');
  return { success: true as const };
}

export async function deleteForm(formId: string) {
  const { workspaceId } = await requireAdminAccess();
  await db.leadCaptureForm.deleteMany({ where: { id: formId, workspaceId } });
  revalidatePath('/dashboard/forms');
  return { success: true as const };
}

export async function getForms() {
  const { workspaceId } = await requireWorkspaceAccess();
  const forms = await db.leadCaptureForm.findMany({
    where:   { workspaceId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, name: true, slug: true, headline: true, isActive: true,
      doubleOptIn: true, submissions: true, createdAt: true,
    },
  });
  return forms.map((f) => ({ ...f, createdAt: f.createdAt.toISOString() }));
}

export async function getForm(formId: string) {
  const { workspaceId } = await requireWorkspaceAccess();
  const form = await db.leadCaptureForm.findFirst({
    where: { id: formId, workspaceId },
  });
  if (!form) return null;
  return { ...form, createdAt: form.createdAt.toISOString(), updatedAt: form.updatedAt.toISOString() };
}

// ---------------------------------------------------------------------------
// Public: submit form (no auth — called from /api/forms/[formId]/submit)
// ---------------------------------------------------------------------------

export interface SubmitFormResult {
  success: boolean;
  error?:  string;
  doubleOptIn?: boolean;
  successMessage?: string;
  redirectUrl?: string | null;
}

export async function handleFormSubmit(
  formId: string,
  email: string,
  firstName?: string
): Promise<SubmitFormResult> {
  // Basic validation
  const emailClean = email.trim().toLowerCase();
  if (!emailClean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailClean)) {
    return { success: false, error: 'Please enter a valid email address.' };
  }

  // Load form — no auth, public
  let form;
  try {
    form = await db.leadCaptureForm.findUnique({
      where: { id: formId },
      include: { workspace: { select: { id: true, name: true, fromEmail: true, fromName: true } } },
    });
  } catch {
    return { success: false, error: 'Form not found.' };
  }

  if (!form || !form.isActive) return { success: false, error: 'This form is no longer active.' };

  const workspaceId = form.workspace.id;

  if (form.doubleOptIn) {
    // Double opt-in: create/update contact as PENDING, send confirmation email
    await db.contact.upsert({
      where:  { workspaceId_email: { workspaceId, email: emailClean } },
      create: { workspaceId, email: emailClean, firstName: firstName?.trim() || null, status: 'PENDING' },
      update: { firstName: firstName?.trim() || undefined, status: 'PENDING' },
    });

    // Token expires in 48 hours
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const tokenRow  = await db.formOptInToken.create({
      data: { formId, email: emailClean, firstName: firstName?.trim() || null, expiresAt },
    });

    // Send confirmation email
    const appUrl    = process.env.NEXTAUTH_URL ?? 'https://app.revtray.com';
    const confirmUrl = `${appUrl}/confirm/${tokenRow.token}`;
    const fromName  = form.workspace.fromName ?? form.workspace.name;
    const fromEmail = form.workspace.fromEmail;

    if (fromEmail) {
      const bodyHtml = form.confirmMessage
        ? `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#111">
            <p style="font-size:16px;line-height:1.6">${form.confirmMessage}</p>
            <div style="margin:32px 0">
              <a href="${confirmUrl}" style="background:#22C55E;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block">
                Confirm subscription →
              </a>
            </div>
            <p style="font-size:13px;color:#888">Or copy this link: ${confirmUrl}</p>
          </div>`
        : `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#111">
            <h2 style="font-size:22px;margin-bottom:8px">One more step</h2>
            <p style="font-size:16px;color:#444;line-height:1.6">
              Click the button below to confirm your subscription to <strong>${form.workspace.name}</strong>.
            </p>
            <div style="margin:32px 0">
              <a href="${confirmUrl}" style="background:#22C55E;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block">
                Confirm subscription →
              </a>
            </div>
            <p style="font-size:13px;color:#888">This link expires in 48 hours.</p>
          </div>`;

      await sendEmail(
        {
          to:      emailClean,
          from:    `${fromName} <${fromEmail}>`,
          subject: form.confirmSubject,
          html:    bodyHtml,
        },
        workspaceId
      );
    }

    // Increment submissions counter
    await db.leadCaptureForm.update({
      where: { id: formId },
      data:  { submissions: { increment: 1 } },
    });

    return {
      success:        true,
      doubleOptIn:    true,
      successMessage: form.successMessage,
      redirectUrl:    form.redirectUrl,
    };
  } else {
    // Single opt-in: upsert as SUBSCRIBED + apply tags immediately
    const contact = await db.contact.upsert({
      where:  { workspaceId_email: { workspaceId, email: emailClean } },
      create: { workspaceId, email: emailClean, firstName: firstName?.trim() || null, status: 'SUBSCRIBED' },
      update: { firstName: firstName?.trim() || undefined, status: 'SUBSCRIBED' },
    });

    // Apply tags
    if (form.tagIds.length > 0) {
      const tags = await db.tag.findMany({
        where: { id: { in: form.tagIds }, workspaceId },
      });
      await Promise.all(
        tags.map((tag) =>
          db.contactTag.upsert({
            where:  { contactId_tagId: { contactId: contact.id, tagId: tag.id } },
            create: { contactId: contact.id, tagId: tag.id },
            update: {},
          })
        )
      );
    }

    await db.leadCaptureForm.update({
      where: { id: formId },
      data:  { submissions: { increment: 1 } },
    });

    return {
      success:        true,
      doubleOptIn:    false,
      successMessage: form.successMessage,
      redirectUrl:    form.redirectUrl,
    };
  }
}

// ---------------------------------------------------------------------------
// Public: confirm opt-in token
// ---------------------------------------------------------------------------

export interface ConfirmOptInResult {
  success:       boolean;
  error?:        string;
  workspaceName?: string;
}

export async function confirmOptIn(token: string): Promise<ConfirmOptInResult> {
  let tokenRow;
  try {
    tokenRow = await db.formOptInToken.findUnique({
      where:   { token },
      include: {
        form: {
          include: {
            workspace: { select: { id: true, name: true, fromEmail: true, fromName: true } },
          },
        },
      },
    });
  } catch {
    return { success: false, error: 'Invalid confirmation link.' };
  }

  if (!tokenRow)               return { success: false, error: 'This confirmation link is invalid.' };
  if (tokenRow.confirmed)      return { success: true, workspaceName: tokenRow.form.workspace.name };
  if (tokenRow.expiresAt < new Date()) return { success: false, error: 'This link has expired. Please subscribe again.' };

  const workspaceId = tokenRow.form.workspace.id;

  // Upgrade contact to SUBSCRIBED
  const contact = await db.contact.upsert({
    where:  { workspaceId_email: { workspaceId, email: tokenRow.email } },
    create: {
      workspaceId,
      email:     tokenRow.email,
      firstName: tokenRow.firstName,
      status:    'SUBSCRIBED',
    },
    update: { status: 'SUBSCRIBED' },
  });

  // Apply form tags
  const form = tokenRow.form;
  if (form.tagIds.length > 0) {
    const tags = await db.tag.findMany({
      where: { id: { in: form.tagIds }, workspaceId },
    });
    await Promise.all(
      tags.map((tag) =>
        db.contactTag.upsert({
          where:  { contactId_tagId: { contactId: contact.id, tagId: tag.id } },
          create: { contactId: contact.id, tagId: tag.id },
          update: {},
        })
      )
    );
  }

  // Mark token confirmed
  await db.formOptInToken.update({
    where: { id: tokenRow.id },
    data:  { confirmed: true },
  });

  return { success: true, workspaceName: form.workspace.name };
}
