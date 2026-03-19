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
  scheduledAt: z.string().datetime().optional().nullable(),
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

  // ─────────────────────────────────────────────────────────────────────────

  // Validate A/B test: if isAbTest=true, abSubjectB must be provided
  if (data.isAbTest && !data.abSubjectB) {
    return {
      success: false,
      error: "A/B test requires a second subject line",
    };
  }

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
    campaign.totalOpened > 0
      ? ((campaign.totalClicked / campaign.totalOpened) * 100).toFixed(1)
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
export async function sendCampaignNow(
  campaignId: string
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

  const result = await sendCampaign({ campaignId, workspaceId });

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
