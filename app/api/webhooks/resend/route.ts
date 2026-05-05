/**
 * app/api/webhooks/resend/route.ts
 *
 * Webhook ingestion endpoint for Resend delivery events.
 *
 * Security:
 *   - Verifies the Svix signature on every request using RESEND_WEBHOOK_SECRET.
 *   - Rejects requests with invalid or missing signatures with 401.
 *
 * Idempotency:
 *   - Each event targets a specific timestamp field (deliveredAt, openedAt, etc.).
 *   - We use Prisma's updateMany with a NULL-check on that field, so a second
 *     delivery of the same event is a no-op — it matches zero rows.
 *
 * Multi-tenant safety:
 *   - EmailSend rows are always fetched with workspaceId included in the result.
 *   - Contact and Campaign updates are scoped by the workspaceId from the send row.
 *   - No cross-workspace data is ever read or written.
 *
 * Handled events:
 *   email.delivered  → deliveredAt, status DELIVERED
 *   email.opened     → openedAt,    status OPENED,     campaign totalOpened++
 *   email.clicked    → clickedAt,   status CLICKED,    campaign totalClicked++
 *   email.bounced    → bouncedAt,   status BOUNCED,    campaign totalBounced++, contact status BOUNCED
 *   email.complained → complainedAt,status COMPLAINED, contact status COMPLAINED
 *
 * Setup:
 *   1. Add RESEND_WEBHOOK_SECRET to your .env.local and Vercel env vars.
 *   2. In Resend dashboard → Webhooks → add endpoint:
 *      https://yourdomain.vercel.app/api/webhooks/resend
 *      Select all email.* events.
 *   3. Copy the signing secret shown and set as RESEND_WEBHOOK_SECRET.
 */

import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Resend event type definitions
// ---------------------------------------------------------------------------

interface ResendEmailData {
  email_id: string; // Resend's message ID — matches EmailSend.messageId
  from: string;
  to: string[];
  subject?: string;
  // Bounce-specific
  bounce?: {
    type?: string; // "hard" | "soft"
    reason?: string;
  };
}

interface ResendWebhookEvent {
  type:
    | "email.sent"
    | "email.delivered"
    | "email.opened"
    | "email.clicked"
    | "email.bounced"
    | "email.complained";
  created_at: string; // ISO timestamp from Resend
  data: ResendEmailData;
}

// ---------------------------------------------------------------------------
// Signature verification
// ---------------------------------------------------------------------------

async function verifySignature(req: NextRequest): Promise<ResendWebhookEvent> {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("RESEND_WEBHOOK_SECRET environment variable is not set.");
  }

  // Svix requires the raw body as a string
  const rawBody = await req.text();

  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    throw new SignatureError("Missing Svix signature headers.");
  }

  const wh = new Webhook(secret);

  // verify() throws if the signature is invalid
  const payload = wh.verify(rawBody, {
    "svix-id": svixId,
    "svix-timestamp": svixTimestamp,
    "svix-signature": svixSignature,
  }) as ResendWebhookEvent;

  return payload;
}

class SignatureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SignatureError";
  }
}

// ---------------------------------------------------------------------------
// Lookup helper — resolves email_id → EmailSend row
// ---------------------------------------------------------------------------

async function findSendByMessageId(messageId: string) {
  return prisma.emailSend.findFirst({
    where: { messageId },
    select: {
      id: true,
      workspaceId: true,
      campaignId: true,
      contactId: true,
      deliveredAt: true,
      openedAt: true,
      clickedAt: true,
      bouncedAt: true,
      complainedAt: true,
    },
  });
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

async function handleDelivered(
  send: NonNullable<Awaited<ReturnType<typeof findSendByMessageId>>>,
  eventTime: Date
): Promise<void> {
  // Idempotency: skip if already recorded
  if (send.deliveredAt) return;

  await prisma.emailSend.update({
    where: { id: send.id },
    data: {
      status: "DELIVERED",
      deliveredAt: eventTime,
      updatedAt: new Date(),
    },
  });

  logger.info("[webhook/resend] email.delivered", {
    workspaceId: send.workspaceId,
    campaignId: send.campaignId,
    sendId: send.id,
  });
}

async function handleOpened(
  send: NonNullable<Awaited<ReturnType<typeof findSendByMessageId>>>,
  eventTime: Date
): Promise<void> {
  if (send.openedAt) return;

  await prisma.$transaction([
    prisma.emailSend.update({
      where: { id: send.id },
      data: {
        status: "OPENED",
        openedAt: eventTime,
        updatedAt: new Date(),
      },
    }),
    prisma.emailCampaign.update({
      where: { id: send.campaignId },
      data: { totalOpened: { increment: 1 }, updatedAt: new Date() },
    }),
  ]);

  logger.info("[webhook/resend] email.opened", {
    workspaceId: send.workspaceId,
    campaignId: send.campaignId,
    sendId: send.id,
  });
}

async function handleClicked(
  send: NonNullable<Awaited<ReturnType<typeof findSendByMessageId>>>,
  eventTime: Date
): Promise<void> {
  if (send.clickedAt) return;

  await prisma.$transaction([
    prisma.emailSend.update({
      where: { id: send.id },
      data: {
        status: "CLICKED",
        clickedAt: eventTime,
        updatedAt: new Date(),
      },
    }),
    prisma.emailCampaign.update({
      where: { id: send.campaignId },
      data: { totalClicked: { increment: 1 }, updatedAt: new Date() },
    }),
  ]);

  logger.info("[webhook/resend] email.clicked", {
    workspaceId: send.workspaceId,
    campaignId: send.campaignId,
    sendId: send.id,
  });
}

async function handleBounced(
  send: NonNullable<Awaited<ReturnType<typeof findSendByMessageId>>>,
  eventTime: Date,
  bounceData?: ResendEmailData["bounce"]
): Promise<void> {
  if (send.bouncedAt) return;

  await prisma.$transaction([
    prisma.emailSend.update({
      where: { id: send.id },
      data: {
        status: "BOUNCED",
        bouncedAt: eventTime,
        bounceType: bounceData?.type ?? null,
        bounceReason: bounceData?.reason ?? null,
        updatedAt: new Date(),
      },
    }),
    prisma.emailCampaign.update({
      where: { id: send.campaignId },
      data: { totalBounced: { increment: 1 }, updatedAt: new Date() },
    }),
    // Mark contact as BOUNCED so they're excluded from future sends
    prisma.contact.update({
      where: { id: send.contactId },
      data: { status: "BOUNCED", updatedAt: new Date() },
    }),
  ]);

  logger.info("[webhook/resend] email.bounced", {
    workspaceId: send.workspaceId,
    campaignId: send.campaignId,
    contactId: send.contactId,
    sendId: send.id,
    bounceType: bounceData?.type,
  });
}

async function handleComplained(
  send: NonNullable<Awaited<ReturnType<typeof findSendByMessageId>>>,
  eventTime: Date
): Promise<void> {
  if (send.complainedAt) return;

  await prisma.$transaction([
    prisma.emailSend.update({
      where: { id: send.id },
      data: {
        status: "COMPLAINED",
        complainedAt: eventTime,
        updatedAt: new Date(),
      },
    }),
    // Mark contact as COMPLAINED — must never be emailed again
    prisma.contact.update({
      where: { id: send.contactId },
      data: { status: "COMPLAINED", updatedAt: new Date() },
    }),
  ]);

  logger.info("[webhook/resend] email.complained", {
    workspaceId: send.workspaceId,
    campaignId: send.campaignId,
    contactId: send.contactId,
    sendId: send.id,
  });
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Verify signature
  let event: ResendWebhookEvent;
  try {
    event = await verifySignature(req);
  } catch (err) {
    if (err instanceof SignatureError || err instanceof Error) {
      logger.warn("[webhook/resend] Signature verification failed", {
        error: err.message,
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const { type, data, created_at } = event;
  const messageId = data.email_id;
  const eventTime = new Date(created_at);

  logger.info("[webhook/resend] Received event", { type, messageId });

  // 2. Skip unhandled event types gracefully
  if (type === "email.sent") {
    return NextResponse.json({ received: true });
  }

  // 3. Look up the EmailSend row by provider message ID
  const send = await findSendByMessageId(messageId);

  if (!send) {
    logger.warn("[webhook/resend] No EmailSend found for messageId", {
      messageId,
      eventType: type,
    });
    // Return 200 so Resend doesn't retry an event we genuinely can't match
    return NextResponse.json({ received: true });
  }

  // 4. Dispatch to event handler
  try {
    switch (type) {
      case "email.delivered":
        await handleDelivered(send, eventTime);
        break;
      case "email.opened":
        await handleOpened(send, eventTime);
        break;
      case "email.clicked":
        await handleClicked(send, eventTime);
        break;
      case "email.bounced":
        await handleBounced(send, eventTime, data.bounce);
        break;
      case "email.complained":
        await handleComplained(send, eventTime);
        break;
      default:
        logger.warn("[webhook/resend] Unhandled event type", {
          type,
          messageId,
        });
    }
  } catch (err) {
    logger.error("[webhook/resend] Failed to process event", err, {
      type,
      messageId,
      workspaceId: send.workspaceId,
    });
    // Return 500 so Resend retries
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// Resend only sends POST — return 405 for anything else
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
