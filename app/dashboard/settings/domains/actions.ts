'use server';

import { requireAdminAccess } from '@/lib/auth/session';
import { db } from '@/lib/db/client';
import { Resend } from 'resend';
import { revalidatePath } from 'next/cache';

let resendClient: Resend | null = null;

function getResend() {
  if (!resendClient) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error('Resend API Key not configured');
    resendClient = new Resend(key);
  }
  return resendClient;
}

export async function getDomains() {
  const { workspaceId } = await requireAdminAccess();

  return await db.sendingDomain.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function addDomain(domainName: string) {
  const { workspaceId } = await requireAdminAccess();
  const resend = getResend();

  try {
    // 1. Create domain in Resend
    const { data, error } = await resend.domains.create({
      name: domainName,
    });

    if (error) throw new Error(error.message);
    if (!data) throw new Error('Failed to create domain in Resend');

    // 2. Save to DB
    const domain = await db.sendingDomain.create({
      data: {
        workspaceId,
        domain: domainName,
        resendDomainId: data.id,
        resendStatus: 'pending',
        resendDnsRecords: data.records as any,
      },
    });

    revalidatePath('/dashboard/settings/domains');
    return { success: true, domain };
  } catch (error: any) {
    console.error('Add domain error:', error);
    return { success: false, error: error.message };
  }
}

export async function verifyDomain(domainId: string) {
  const { workspaceId } = await requireAdminAccess();
  const resend = getResend();

  const domain = await db.sendingDomain.findUnique({
    where: { id: domainId, workspaceId },
  });

  if (!domain || !domain.resendDomainId) throw new Error('Domain not found');

  try {
    const { data, error } = await resend.domains.verify(domain.resendDomainId);

    if (error) throw new Error(error.message);
    
    // Refresh status from Resend
    const resendDomain = await resend.domains.get(domain.resendDomainId);
    
    if (resendDomain.data) {
      await db.sendingDomain.update({
        where: { id: domainId },
        data: {
          resendStatus: resendDomain.data.status,
          dkimVerified: resendDomain.data.status === 'verified',
          spfVerified: resendDomain.data.status === 'verified',
        },
      });
    }

    revalidatePath('/dashboard/settings/domains');
    return { success: true, status: resendDomain.data?.status };
  } catch (error: any) {
    console.error('Verify domain error:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteDomain(domainId: string) {
  const { workspaceId } = await requireAdminAccess();
  const resend = getResend();

  const domain = await db.sendingDomain.findUnique({
    where: { id: domainId, workspaceId },
  });

  if (!domain) throw new Error('Domain not found');

  try {
    if (domain.resendDomainId) {
      await resend.domains.remove(domain.resendDomainId);
    }

    await db.sendingDomain.delete({
      where: { id: domainId },
    });

    revalidatePath('/dashboard/settings/domains');
    return { success: true };
  } catch (error: any) {
    console.error('Delete domain error:', error);
    return { success: false, error: error.message };
  }
}
