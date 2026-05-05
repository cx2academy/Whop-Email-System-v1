/**
 * lib/attribution/attribution-engine.ts
 *
 * Last-click attribution engine.
 *
 * When a purchase is recorded, looks back at the contact's email click history
 * within the attribution window (default 7 days) and assigns revenue to the
 * most recently clicked campaign or automation workflow.
 *
 * Architecture is model-aware — attributionModel field is stored on each
 * attribution record so future models (first_click, linear, time_decay)
 * can be added without schema changes.
 */

import { db } from '@/lib/db/client';

const ATTRIBUTION_WINDOW_DAYS = 7;
const ATTRIBUTION_MODEL = 'last_click';

export interface AttributionResult {
  attributed: boolean;
  campaignId?: string;
  workflowId?: string;
  revenue: number;
}

export async function attributePurchase(
  purchaseId: string,
  workspaceId: string,
  contactId: string | null,
  email: string,
  amountCents: number
): Promise<AttributionResult> {
  // Resolve contactId from email if not provided
  let resolvedContactId = contactId;
  if (!resolvedContactId) {
    const contact = await db.contact.findUnique({
      where: { workspaceId_email: { workspaceId, email } },
      select: { id: true },
    });
    resolvedContactId = contact?.id ?? null;
  }

  if (!resolvedContactId) {
    // Contact not in system — can't attribute
    return { attributed: false, revenue: amountCents };
  }

  const windowStart = new Date(Date.now() - ATTRIBUTION_WINDOW_DAYS * 86400000);

  // Find most recent campaign click within the window (last-click model)
  const lastCampaignClick = await db.clickEvent.findFirst({
    where: {
      contactId: resolvedContactId,
      workspaceId,
      clickedAt: { gte: windowStart },
    },
    orderBy: { clickedAt: 'desc' },
    select: { campaignId: true, clickedAt: true },
  });

  // Also check automation enrollments that sent emails (via jobs completed)
  const lastAutomationClick = await db.automationEnrollment.findFirst({
    where: {
      contactId: resolvedContactId,
      status: 'COMPLETED',
      completedAt: { gte: windowStart },
    },
    orderBy: { completedAt: 'desc' },
    select: { workflowId: true, completedAt: true },
  });

  // Pick whichever is more recent
  let campaignId: string | undefined;
  let workflowId: string | undefined;

  if (lastCampaignClick && lastAutomationClick) {
    const campTime = lastCampaignClick.clickedAt!.getTime();
    const autoTime = lastAutomationClick.completedAt!.getTime();
    if (campTime >= autoTime) {
      campaignId = lastCampaignClick.campaignId;
    } else {
      workflowId = lastAutomationClick.workflowId;
    }
  } else if (lastCampaignClick) {
    campaignId = lastCampaignClick.campaignId;
  } else if (lastAutomationClick) {
    workflowId = lastAutomationClick.workflowId;
  } else {
    return { attributed: false, revenue: amountCents };
  }

  // Create attribution record
  await db.revenueAttribution.create({
    data: {
      workspaceId,
      purchaseId,
      contactId: resolvedContactId,
      campaignId,
      workflowId,
      attributionModel: ATTRIBUTION_MODEL,
      revenue: amountCents,
    },
  });

  // Update cached totalRevenue on campaign
  if (campaignId) {
    await db.emailCampaign.update({
      where: { id: campaignId },
      data: { totalRevenue: { increment: amountCents } },
    });
  }

  // Update automation workflow revenue counter
  if (workflowId) {
    await db.automationWorkflow.updateMany({
      where: { id: workflowId },
      data: { totalEmailsSent: { increment: 0 } }, // just touch for now — no revenue field yet
    });
  }

  return { attributed: true, campaignId, workflowId, revenue: amountCents };
}
