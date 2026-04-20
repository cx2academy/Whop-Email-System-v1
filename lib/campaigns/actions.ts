/**
 * lib/campaigns/actions.ts
 *
 * Server Actions for campaign management.
 * All actions enforce workspace isolation via requireWorkspaceAccess().
 */

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/lib/db/client";
import { sendCampaign } from "@/lib/campaigns/send-engine";
import { requireWorkspaceAccess, requireAdminAccess } from "@/lib/auth/session";
import type { ApiResponse } from "@/types";
import { track } from "@/lib/telemetry";
import { checkUsageLimit, checkPlanLimit } from "@/lib/plans/gates";
import type { AttributionModel } from "@/lib/attribution/constants";
import type { EmailCampaign, CampaignStatus, CampaignType } from "@prisma/client";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const createCampaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required").max(128).trim(),
  type: z.enum(["BROADCAST", "DRIP", "TRIGGER"]).default("BROADCAST"),
  subject: z.string().min(1, "Subject line is required").max(255).trim(),
  previewText: z.string().max(255).optional(),
  htmlBody: z.string().min(1, "Email body is required"),
  textBody: z.string().optional(),
  audienceTagIds: z.array(z.string()).default([]),
  audienceSegmentIds: z.array(z.string()).default([]),
  isAbTest: z.boolean().default(false),
  abSubjectB: z.string().max(255).optional(),
  abTestVariantA: z.string().optional(),
  abTestVariantB: z.string().optional(),
  abTestSplitPercent: z.number().optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
  sendViaEmail:  z.boolean().default(true),
  sendViaWhopDm: z.boolean().default(false),
  isSandbox: z.boolean().default(false).optional(),
});

const updateCampaignSchema = createCampaignSchema.partial();

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

/**
 * Create a new campaign in DRAFT status.
 */
export async function createCampaign(
  rawData: unknown
): Promise<ApiResponse<{ campaignId: string }>> {
  const { workspaceId } = await requireAdminAccess();

  const parsed = createCampaignSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid campaign data",
    };
  }

  const data = parsed.data;

  // ── Plan gates ────────────────────────────────────────────────────────────

  if (!data.isSandbox) {
    // 1. Monthly campaign count limit
    const campaignGate = await checkUsageLimit({ workspaceId, type: 'campaigns' });
    if (!campaignGate.allowed) return campaignGate.toActionError();

    // 2. A/B testing requires Growth or higher
    if (data.isAbTest) {
      const abGate = await checkPlanLimit({ workspaceId, feature: 'abTesting' });
      if (!abGate.allowed) return abGate.toActionError();
    }

    // 3. Segment targeting requires Starter or higher
    if (data.audienceSegmentIds && data.audienceSegmentIds.length > 0) {
      const segGate = await checkPlanLimit({ workspaceId, feature: 'segments' });
      if (!segGate.allowed) return segGate.toActionError();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  // Validate A/B test: if isAbTest=true, abSubjectB must be provided
  if (data.isAbTest && !data.abSubjectB) {
    return {
      success: false,
      error: "A/B test requires a second subject line",
    };
  }

  // ── Cross-workspace ownership checks ─────────────────────────────────────
  // Verify every tag and segment ID belongs to this workspace.
  // Without this, a user could target contacts from another workspace
  // by injecting foreign IDs into the audience arrays.

  if (data.audienceTagIds && data.audienceTagIds.length > 0) {
    const ownedTags = await db.tag.findMany({
      where: { id: { in: data.audienceTagIds }, workspaceId },
      select: { id: true },
    });
    const ownedTagIds = new Set(ownedTags.map((t) => t.id));
    const invalid = data.audienceTagIds.filter((id) => !ownedTagIds.has(id));
    if (invalid.length > 0) {
      return { success: false, error: "One or more tag IDs are invalid or do not belong to your workspace." };
    }
  }

  if (data.audienceSegmentIds && data.audienceSegmentIds.length > 0) {
    const ownedSegments = await db.segment.findMany({
      where: { id: { in: data.audienceSegmentIds }, workspaceId },
      select: { id: true },
    });
    const ownedSegmentIds = new Set(ownedSegments.map((s) => s.id));
    const invalid = data.audienceSegmentIds.filter((id) => !ownedSegmentIds.has(id));
    if (invalid.length > 0) {
      return { success: false, error: "One or more segment IDs are invalid or do not belong to your workspace." };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  const campaign = await db.emailCampaign.create({
    data: {
      workspaceId,
      name: data.name,
      type: data.type as CampaignType,
      status: "DRAFT",
      subject: data.subject,
      previewText: data.previewText,
      htmlBody: data.htmlBody,
      textBody: data.textBody,
      audienceTagIds: data.audienceTagIds,
      audienceSegmentIds: data.audienceSegmentIds,
      isAbTest: data.isAbTest,
      abSubjectB: data.abSubjectB,
      abTestVariantA: data.abTestVariantA,
      abTestVariantB: data.abTestVariantB,
      abTestSplitPercent: data.abTestSplitPercent,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
    },
  });

  track("campaign_created", { workspaceId, properties: { campaignId: campaign.id, type: data.type, isAbTest: data.isAbTest } });
  revalidatePath("/dashboard/campaigns");
  return { success: true, data: { campaignId: campaign.id } };
}

/**
 * Update a campaign. Only DRAFT campaigns can be edited.
 */
export async function updateCampaign(
  campaignId: string,
  rawData: unknown
): Promise<ApiResponse<void>> {
  const { workspaceId } = await requireAdminAccess();

  // Ownership check
  const campaign = await db.emailCampaign.findUnique({
    where: { id: campaignId, workspaceId },
    select: { status: true },
  });

  if (!campaign) {
    return { success: false, error: "Campaign not found", code: "NOT_FOUND" };
  }
  if (campaign.status !== "DRAFT") {
    return {
      success: false,
      error: `Cannot edit a campaign with status: ${campaign.status}`,
    };
  }

  const parsed = updateCampaignSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid data",
    };
  }

  const { scheduledAt, ...rest } = parsed.data;

  await db.emailCampaign.update({
    where: { id: campaignId },
    data: {
      ...rest,
      ...(scheduledAt !== undefined && {
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      }),
    },
  });

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath("/dashboard/campaigns");
  return { success: true, data: undefined };
}

/**
 * Delete a campaign. Only DRAFT campaigns can be deleted.
 */
export async function deleteCampaign(
  campaignId: string
): Promise<ApiResponse<void>> {
  const { workspaceId } = await requireAdminAccess();

  const campaign = await db.emailCampaign.findUnique({
    where: { id: campaignId, workspaceId },
    select: { status: true },
  });

  if (!campaign) {
    return { success: false, error: "Campaign not found", code: "NOT_FOUND" };
  }
  if (!["DRAFT", "FAILED"].includes(campaign.status)) {
    return {
      success: false,
      error: "Only draft or failed campaigns can be deleted",
    };
  }

  await db.emailCampaign.delete({ where: { id: campaignId } });

  revalidatePath("/dashboard/campaigns");
  return { success: true, data: undefined };
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export interface CampaignListItem {
  id: string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  subject: string;
  totalRecipients: number;
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  sentAt: Date | null;
  scheduledAt: Date | null;
  createdAt: Date;
  sequenceId: string | null;
}

/**
 * List all campaigns for the current workspace, newest first.
 */
export async function getCampaigns(): Promise<CampaignListItem[]> {
  const { workspaceId } = await requireWorkspaceAccess();

  return db.emailCampaign.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      type: true,
      status: true,
      subject: true,
      totalRecipients: true,
      totalSent: true,
      totalOpened: true,
      totalClicked: true,
      sentAt: true,
      scheduledAt: true,
      createdAt: true,
      sequenceId: true,
    },
  });
}

/**
 * Get a single campaign with full details.
 */
export async function getCampaign(
  campaignId: string
): Promise<EmailCampaign | null> {
  const { workspaceId } = await requireWorkspaceAccess();

  return db.emailCampaign.findUnique({
    where: { id: campaignId, workspaceId },
  });
}

/**
 * Get campaign details specifically for preview (htmlBody, subject, previewText).
 */
export async function getCampaignDetail(campaignId: string) {
  const { workspaceId } = await requireWorkspaceAccess();

  return db.emailCampaign.findUnique({
    where: { id: campaignId, workspaceId },
    select: { id: true, subject: true, previewText: true, htmlBody: true },
  });
}

/**
 * Get campaign analytics — send status breakdown.
 */
export async function getCampaignAnalytics(campaignId: string) {
  const { workspaceId } = await requireWorkspaceAccess();

  const campaign = await db.emailCampaign.findUnique({
    where: { id: campaignId, workspaceId },
    select: {
      totalRecipients: true,
      totalSent: true,
      totalOpened: true,
      totalClicked: true,
      totalBounced: true,
      totalFailed: true,
      totalRevenue: true,
      isAbTest: true,
      abWinnerVariant: true,
      abSubjectB: true,
    },
  });

  if (!campaign) return null;

  const openRate =
    campaign.totalSent > 0
      ? ((campaign.totalOpened / campaign.totalSent) * 100).toFixed(1)
      : "0.0";
  const clickRate =
    campaign.totalSent > 0
      ? ((campaign.totalClicked / campaign.totalSent) * 100).toFixed(1)
      : "0.0";
  const bounceRate =
    campaign.totalSent > 0
      ? ((campaign.totalBounced / campaign.totalSent) * 100).toFixed(1)
      : "0.0";

  // A/B variant breakdown
  let abStats = null;
  if (campaign.isAbTest) {
    const [aSends, bSends] = await Promise.all([
      db.emailSend.aggregate({
        where: {
          campaignId,
          workspaceId,
          idempotencyKey: { endsWith: ":A" },
        },
        _count: { _all: true },
        _sum: { openedAt: undefined },
      }),
      db.emailSend.aggregate({
        where: {
          campaignId,
          workspaceId,
          idempotencyKey: { endsWith: ":B" },
        },
        _count: { _all: true },
      }),
    ]);

    const aOpens = await db.emailSend.count({
      where: {
        campaignId,
        workspaceId,
        idempotencyKey: { endsWith: ":A" },
        openedAt: { not: null },
      },
    });
    const bOpens = await db.emailSend.count({
      where: {
        campaignId,
        workspaceId,
        idempotencyKey: { endsWith: ":B" },
        openedAt: { not: null },
      },
    });

    const aTotal = aSends._count._all;
    const bTotal = bSends._count._all;

    abStats = {
      variantA: {
        sent: aTotal,
        opened: aOpens,
        openRate: aTotal > 0 ? ((aOpens / aTotal) * 100).toFixed(1) : "0.0",
      },
      variantB: {
        sent: bTotal,
        opened: bOpens,
        openRate: bTotal > 0 ? ((bOpens / bTotal) * 100).toFixed(1) : "0.0",
      },
      winner: campaign.abWinnerVariant,
    };
  }

  return {
    ...campaign,
    openRate,
    clickRate,
    bounceRate,
    abStats,
  };
}

// ---------------------------------------------------------------------------
// Send / schedule
// ---------------------------------------------------------------------------

/**
 * Immediately send a campaign to its audience.
 * Sets status to SENDING, dispatches send engine, returns result.
 */
export async function sandboxCampaignNow(
  campaignId: string
): Promise<ApiResponse<{ totalSent: number; totalFailed: number }>> {
  const { workspaceId } = await requireAdminAccess();
  
  const totalSent = Math.floor(Math.random() * 2000) + 12000;
  const totalOpened = Math.floor(totalSent * (Math.random() * 0.2 + 0.6)); // 60-80% open rate
  const totalClicked = Math.floor(totalOpened * (Math.random() * 0.15 + 0.15)); // 15-30% click rate
  const totalRevenue = Math.floor(totalClicked * (Math.random() * 12 + 5)); 

  await db.emailCampaign.update({
    where: { id: campaignId, workspaceId },
    data: {
      status: "COMPLETED",
      sentAt: new Date(),
      totalRecipients: totalSent,
      totalSent: totalSent,
      totalOpened: totalOpened,
      totalClicked: totalClicked,
      totalRevenue: totalRevenue * 100, // Store in cents
      totalBounced: Math.floor(totalSent * 0.001),
      totalFailed: 0,
    }
  });

  // Create fake purchases and attributions for the tour
  const models: AttributionModel[] = ['last_click', 'first_touch', 'linear', 'time_decay'];
  const fakePurchases = 5;
  const earningsPerPurchase = Math.floor((totalRevenue * 100) / fakePurchases);

  // Create a demo contact if not exists
  const demoContact = await db.contact.upsert({
    where: { workspaceId_email: { workspaceId, email: 'demo-buyer@example.com' } },
    update: {},
    create: {
      workspaceId,
      email: 'demo-buyer@example.com',
      firstName: 'Demo',
      lastName: 'Buyer',
      status: 'SUBSCRIBED'
    }
  });

  for (let i = 0; i < fakePurchases; i++) {
    const purchase = await db.purchase.create({
      data: {
        workspaceId,
        contactId: demoContact.id,
        email: demoContact.email,
        amount: earningsPerPurchase,
        productName: i % 2 === 0 ? "Premium Community Pass" : "Creator Masterclass",
        source: "demo",
        externalId: `demo-purchase-${campaignId}-${i}-${Date.now()}`,
        metadata: { isTour: true }
      }
    });

    // We also need some EmailSend records with clickedAt for on-the-fly models (linear, time_decay)
    // Using a more robust idempotency key to avoid collisions
    await db.emailSend.upsert({
      where: { idempotencyKey: `demo-send-${campaignId}-${i}` },
      update: {
        status: 'CLICKED',
        clickedAt: new Date(Date.now() - (i + 1) * 3600000),
      },
      create: {
        workspaceId,
        campaignId,
        contactId: demoContact.id,
        status: 'CLICKED',
        clickedAt: new Date(Date.now() - (i + 1) * 3600000), // clicked 1-5 hours ago
        sentAt: new Date(Date.now() - 24 * 3600000),
        idempotencyKey: `demo-send-${campaignId}-${i}`,
      }
    });

    // Attribute to all models so the switcher works instantly
    await Promise.all(models.map(m => 
      db.revenueAttribution.create({
        data: {
          workspaceId,
          purchaseId: purchase.id,
          contactId: demoContact.id,
          campaignId,
          attributionModel: m,
          revenue: earningsPerPurchase,
        }
      })
    ));
  }

  return { success: true, data: { totalSent, totalFailed: 0 } };
}

export async function sendCampaignNow(
  campaignId: string,
  forceEmailOverride?: string | null
): Promise<ApiResponse<{ totalSent: number; totalFailed: number }>> {
  const { workspaceId, userId } = await requireAdminAccess();

  const campaign = await db.emailCampaign.findUnique({
    where: { id: campaignId, workspaceId },
    select: { status: true, subject: true, htmlBody: true },
  });

  if (!campaign) {
    return { success: false, error: "Campaign not found", code: "NOT_FOUND" };
  }
  if (!["DRAFT", "SCHEDULED"].includes(campaign.status)) {
    return {
      success: false,
      error: `Campaign cannot be sent — current status: ${campaign.status}`,
    };
  }
  if (!campaign.subject || !campaign.htmlBody) {
    return {
      success: false,
      error: "Campaign must have a subject and email body before sending",
    };
  }

  const result = await sendCampaign({ 
    campaignId, 
    workspaceId,
    _tourForceEmail: forceEmailOverride ?? undefined
  });

  // Audit log
  const { audit } = await import("@/lib/audit");
  audit({
    action: "campaign.sent",
    workspaceId,
    userId,
    resourceId: campaignId,
    metadata: { totalSent: result.totalSent, totalFailed: result.totalFailed, status: result.status },
  });

  revalidatePath("/dashboard/campaigns");
  revalidatePath(`/dashboard/campaigns/${campaignId}`);

  return {
    success: result.status !== "FAILED",
    data: { totalSent: result.totalSent, totalFailed: result.totalFailed },
  };
}

/**
 * Schedule a campaign for future delivery.
 */
export async function scheduleCampaign(
  campaignId: string,
  scheduledAt: string
): Promise<ApiResponse<void>> {
  const { workspaceId } = await requireAdminAccess();

  const scheduledDate = new Date(scheduledAt);
  if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
    return {
      success: false,
      error: "Scheduled time must be a valid future date",
    };
  }

  const campaign = await db.emailCampaign.findUnique({
    where: { id: campaignId, workspaceId },
    select: { status: true },
  });
  if (!campaign) {
    return { success: false, error: "Campaign not found", code: "NOT_FOUND" };
  }
  if (campaign.status !== "DRAFT") {
    return { success: false, error: "Only draft campaigns can be scheduled" };
  }

  await db.emailCampaign.update({
    where: { id: campaignId },
    data: { status: "SCHEDULED", scheduledAt: scheduledDate },
  });

  revalidatePath("/dashboard/campaigns");
  return { success: true, data: undefined };
}

/**
 * Duplicate an existing campaign as a new DRAFT.
 */
export async function duplicateCampaign(
  campaignId: string
): Promise<ApiResponse<{ campaignId: string }>> {
  const { workspaceId } = await requireWorkspaceAccess();

  const source = await db.emailCampaign.findUnique({
    where: { id: campaignId, workspaceId },
  });
  if (!source) {
    return { success: false, error: "Campaign not found", code: "NOT_FOUND" };
  }

  const copy = await db.emailCampaign.create({
    data: {
      workspaceId,
      name: `${source.name} (copy)`,
      type: source.type,
      status: "DRAFT",
      subject: source.subject,
      sendViaEmail:  (source as any).sendViaEmail  ?? true,
      sendViaWhopDm: (source as any).sendViaWhopDm ?? false,
      previewText: source.previewText,
      htmlBody: source.htmlBody,
      textBody: source.textBody,
      audienceTagIds: source.audienceTagIds,
      audienceSegmentIds: (source as any).audienceSegmentIds ?? [],
      isAbTest: source.isAbTest,
      abSubjectB: source.abSubjectB,
    },
  });

  revalidatePath("/dashboard/campaigns");
  return { success: true, data: { campaignId: copy.id } };
}
