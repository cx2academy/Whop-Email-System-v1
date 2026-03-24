/**
 * lib/automation/action-system.ts
 *
 * Executes a single automation step for a given enrollment.
 * Now supports CONDITION branching and REMOVE_TAG.
 */

import { db } from '@/lib/db/client';
import { sendEmail } from '@/lib/email';

const MAX_EMAILS_PER_ENROLLMENT = 500;

// ---------------------------------------------------------------------------
// Step configs
// ---------------------------------------------------------------------------

export interface TriggerConfig {
  triggerType: string;
  productId?: string;
  daysThreshold?: number;
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

export interface RemoveTagConfig {
  tagName: string;
}

export interface WebhookConfig {
  url: string;
  method: 'GET' | 'POST';
  payload?: string;
}

export type ConditionField =
  | 'opened_last_email'
  | 'clicked_last_email'
  | 'has_tag'
  | 'opened_in_days'
  | 'any_email_opened';

export interface EmbeddedStep {
  id: string;
  type: 'DELAY' | 'SEND_EMAIL' | 'ADD_TAG' | 'REMOVE_TAG' | 'WEBHOOK';
  config: Record<string, unknown>;
}

export interface ConditionConfig {
  field: ConditionField;
  tagId?: string;
  tagName?: string;
  days?: number;
  trueBranch: EmbeddedStep[];
  falseBranch: EmbeddedStep[];
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
// Condition evaluator
// ---------------------------------------------------------------------------

export async function evaluateCondition(
  config: ConditionConfig,
  contactId: string,
  workspaceId: string
): Promise<boolean> {
  switch (config.field) {
    case 'opened_last_email': {
      // Did this contact open any email in the last 7 days?
      const recent = await db.emailSend.findFirst({
        where: {
          contactId,
          workspaceId,
          openedAt: { not: null, gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      });
      return !!recent;
    }

    case 'clicked_last_email': {
      const recent = await db.emailSend.findFirst({
        where: {
          contactId,
          workspaceId,
          clickedAt: { not: null, gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      });
      return !!recent;
    }

    case 'any_email_opened': {
      const any = await db.emailSend.findFirst({
        where: { contactId, workspaceId, openedAt: { not: null } },
      });
      return !!any;
    }

    case 'opened_in_days': {
      const days = config.days ?? 30;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const opened = await db.emailSend.findFirst({
        where: { contactId, workspaceId, openedAt: { not: null, gte: since } },
      });
      return !!opened;
    }

    case 'has_tag': {
      if (!config.tagName && !config.tagId) return false;
      const tag = config.tagId
        ? await db.tag.findUnique({ where: { id: config.tagId } })
        : await db.tag.findUnique({
            where: { workspaceId_name: { workspaceId, name: config.tagName! } },
          });
      if (!tag) return false;
      const link = await db.contactTag.findUnique({
        where: { contactId_tagId: { contactId, tagId: tag.id } },
      });
      return !!link;
    }

    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Embedded step executor (for CONDITION branches)
// ---------------------------------------------------------------------------

export async function executeEmbeddedSteps(
  steps: EmbeddedStep[],
  contactId: string,
  workspaceId: string,
  enrollmentId: string
): Promise<void> {
  for (const step of steps) {
    // Delays in branches: execute synchronously with a short pause
    if (step.type === 'DELAY') {
      // For embedded delays, we honour the unit but cap at 1 minute for branches
      // Full delay scheduling only happens at the top-level step
      const config = step.config as DelayConfig;
      const ms: Record<string, number> = {
        minutes: Math.min(config.amount * 60 * 1000, 60 * 1000),
        hours: Math.min(config.amount * 60 * 60 * 1000, 60 * 1000),
        days: Math.min(config.amount * 24 * 60 * 60 * 1000, 60 * 1000),
      };
      await new Promise((r) => setTimeout(r, ms[config.unit] ?? 0));
      continue;
    }
    await executeStep(step.type, step.config, contactId, workspaceId, enrollmentId);
  }
}

// ---------------------------------------------------------------------------
// Individual step executors
// ---------------------------------------------------------------------------

async function executeSendEmail(
  config: SendEmailConfig,
  contactId: string,
  workspaceId: string,
  enrollmentId: string
): Promise<void> {
  const sentCount = await db.automationJob.count({
    where: { enrollmentId, status: 'COMPLETED', step: { type: 'SEND_EMAIL' } },
  });
  if (sentCount >= MAX_EMAILS_PER_ENROLLMENT) {
    throw new Error(`Email limit reached for enrollment ${enrollmentId}`);
  }

  const [contact, workspace] = await Promise.all([
    db.contact.findUnique({ where: { id: contactId }, select: { email: true, firstName: true } }),
    db.workspace.findUnique({
      where: { id: workspaceId },
      select: { fromEmail: true, fromName: true, name: true },
    }),
  ]);

  if (!contact || !workspace) throw new Error('Contact or workspace not found');
  if (!workspace.fromEmail) throw new Error('Workspace has no fromEmail configured');

  const fromName = config.fromName ?? workspace.fromName ?? workspace.name;
  const from = `${fromName} <${workspace.fromEmail}>`;

  const personalize = (s: string) =>
    s
      .replace(/\{\{firstName\}\}/g, contact.firstName ?? '')
      .replace(/\{\{email\}\}/g, contact.email);

  await sendEmail(
    {
      to: contact.email,
      subject: personalize(config.subject),
      html: personalize(config.html),
      from,
      idempotencyKey: `auto:${enrollmentId}:${Date.now()}`,
    },
    workspaceId
  );

  const enrollment = await db.automationEnrollment.findUnique({
    where: { id: enrollmentId },
    select: { workflowId: true },
  });
  if (enrollment) {
    await db.automationWorkflow.update({
      where: { id: enrollment.workflowId },
      data: { totalEmailsSent: { increment: 1 } },
    });
  }
}

async function executeAddTag(
  config: AddTagConfig,
  contactId: string,
  workspaceId: string
): Promise<void> {
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

async function executeRemoveTag(
  config: RemoveTagConfig,
  contactId: string,
  workspaceId: string
): Promise<void> {
  const tag = await db.tag.findUnique({
    where: { workspaceId_name: { workspaceId, name: config.tagName } },
  });
  if (!tag) return;
  await db.contactTag.deleteMany({ where: { contactId, tagId: tag.id } });
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
    body,
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) throw new Error(`Webhook returned ${res.status}`);
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
    case 'REMOVE_TAG':
      await executeRemoveTag(config as RemoveTagConfig, contactId, workspaceId);
      break;
    case 'WEBHOOK':
      await executeWebhook(config as WebhookConfig, contactId);
      break;
    case 'CONDITION': {
      const condConfig = config as ConditionConfig;
      const result = await evaluateCondition(condConfig, contactId, workspaceId);
      const branch = result ? condConfig.trueBranch : condConfig.falseBranch;
      if (branch?.length) {
        await executeEmbeddedSteps(branch, contactId, workspaceId, enrollmentId);
      }
      break;
    }
    case 'TRIGGER':
      break;
    default:
      throw new Error(`Unknown step type: ${stepType}`);
  }
}
