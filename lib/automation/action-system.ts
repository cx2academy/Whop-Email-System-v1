/**
 * lib/automation/action-system.ts
 *
 * Executes a single automation step for a given enrollment.
 *
 * Each step type maps to a pure async function.
 * Returns { done: boolean } — done=true means the enrollment is complete.
 *
 * Safety limits enforced here:
 *   - Max 500 emails per enrollment (prevents runaway sends)
 */

import { db } from '@/lib/db/client';
import { sendEmail } from '@/lib/email';

const MAX_EMAILS_PER_ENROLLMENT = 500;

// ---------------------------------------------------------------------------
// Step configs (typed)
// ---------------------------------------------------------------------------

export interface TriggerConfig {
  triggerType: 'new_member' | 'purchase' | 'api' | 'manual';
}

export interface DelayConfig {
  amount: number;
  unit: 'minutes' | 'hours' | 'days';
}

export interface SendEmailConfig {
  subject: string;
  html: string;
  fromName?: string;
}

export interface AddTagConfig {
  tagName: string;
}

export interface WebhookConfig {
  url: string;
  method: 'GET' | 'POST';
  payload?: string; // JSON template string
}

// ---------------------------------------------------------------------------
// Delay calculator
// ---------------------------------------------------------------------------

export function calcExecuteAt(config: DelayConfig): Date {
  const ms: Record<DelayConfig['unit'], number> = {
    minutes: 60 * 1000,
    hours: 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000,
  };
  return new Date(Date.now() + config.amount * ms[config.unit]);
}

// ---------------------------------------------------------------------------
// Step executors
// ---------------------------------------------------------------------------

async function executeSendEmail(
  config: SendEmailConfig,
  contactId: string,
  workspaceId: string,
  enrollmentId: string
): Promise<void> {
  // Safety: check email count for this enrollment
  const sentCount = await db.automationJob.count({
    where: {
      enrollmentId,
      status: 'COMPLETED',
      step: { type: 'SEND_EMAIL' },
    },
  });
  if (sentCount >= MAX_EMAILS_PER_ENROLLMENT) {
    throw new Error(`Email limit reached for enrollment ${enrollmentId}`);
  }

  const [contact, workspace] = await Promise.all([
    db.contact.findUnique({ where: { id: contactId }, select: { email: true, firstName: true } }),
    db.workspace.findUnique({ where: { id: workspaceId }, select: { fromEmail: true, fromName: true, name: true } }),
  ]);

  if (!contact || !workspace) throw new Error('Contact or workspace not found');
  if (!workspace.fromEmail) throw new Error('Workspace has no fromEmail configured');

  const fromName = config.fromName ?? workspace.fromName ?? workspace.name;
  const from = `${fromName} <${workspace.fromEmail}>`;

  // Simple personalisation: replace {{firstName}} token
  const subject = config.subject.replace(/\{\{firstName\}\}/g, contact.firstName ?? '');
  const html = config.html.replace(/\{\{firstName\}\}/g, contact.firstName ?? '');

  await sendEmail(
    {
      to: contact.email,
      subject,
      html,
      from,
      idempotencyKey: `auto:${enrollmentId}:${Date.now()}`,
    },
    workspaceId
  );

  // Increment workflow email counter
  await db.automationWorkflow.update({
    where: { id: (await db.automationEnrollment.findUnique({ where: { id: enrollmentId }, select: { workflowId: true } }))!.workflowId },
    data: { totalEmailsSent: { increment: 1 } },
  });
}

async function executeAddTag(
  config: AddTagConfig,
  contactId: string,
  workspaceId: string
): Promise<void> {
  // Upsert tag, then link to contact
  const tag = await db.tag.upsert({
    where: { workspaceId_name: { workspaceId, name: config.tagName } },
    create: { workspaceId, name: config.tagName },
    update: {},
  });

  await db.contactTag.upsert({
    where: { contactId_tagId: { contactId, tagId: tag.id } },
    create: { contactId, tagId: tag.id },
    update: {},
  });
}

async function executeWebhook(
  config: WebhookConfig,
  contactId: string
): Promise<void> {
  const contact = await db.contact.findUnique({
    where: { id: contactId },
    select: { email: true, firstName: true, lastName: true },
  });

  let body: string | undefined;
  if (config.method === 'POST' && config.payload) {
    body = config.payload
      .replace(/\{\{email\}\}/g, contact?.email ?? '')
      .replace(/\{\{firstName\}\}/g, contact?.firstName ?? '');
  }

  const res = await fetch(config.url, {
    method: config.method,
    headers: config.method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
    body: body,
    signal: AbortSignal.timeout(10_000), // 10s timeout
  });

  if (!res.ok) {
    throw new Error(`Webhook returned ${res.status}`);
  }
}

// ---------------------------------------------------------------------------
// Main executor
// ---------------------------------------------------------------------------

export async function executeStep(
  stepType: string,
  config: Record<string, unknown>,
  contactId: string,
  workspaceId: string,
  enrollmentId: string
): Promise<void> {
  switch (stepType) {
    case 'SEND_EMAIL':
      await executeSendEmail(config as SendEmailConfig, contactId, workspaceId, enrollmentId);
      break;
    case 'ADD_TAG':
      await executeAddTag(config as AddTagConfig, contactId, workspaceId);
      break;
    case 'WEBHOOK':
      await executeWebhook(config as WebhookConfig, contactId);
      break;
    case 'TRIGGER':
      // Trigger steps are informational — no execution needed
      break;
    default:
      throw new Error(`Unknown step type: ${stepType}`);
  }
}
