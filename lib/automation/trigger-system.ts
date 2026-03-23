/**
 * lib/automation/trigger-system.ts
 *
 * Matches a trigger event to ACTIVE workflows and enrolls matching contacts.
 *
 * Trigger types (legacy kept for backwards compat):
 *   new_member   — fired when a new contact is synced
 *   purchase     — generic purchase (legacy)
 *   api          — fired via POST /api/automation/trigger
 *   manual       — fired via dashboard UI
 *
 * Whop-native triggers (new):
 *   membership_activated    — someone joins/activates in the Whop community
 *   membership_deactivated  — someone cancels or expires
 *   payment_succeeded       — any successful payment
 *   product_purchased       — specific product purchased (config.productId must match)
 *   product_not_purchased   — member hasn't bought a product after X days (scheduled)
 */

import { db } from '@/lib/db/client';
import { enrollContact } from './workflow-engine';

export type TriggerType =
  | 'new_member'
  | 'purchase'
  | 'api'
  | 'manual'
  | 'membership_activated'
  | 'membership_deactivated'
  | 'payment_succeeded'
  | 'product_purchased'
  | 'product_not_purchased';

export const WHOP_TRIGGER_LABELS: Record<TriggerType, string> = {
  new_member:             'New member joins',
  purchase:               'Purchase (legacy)',
  api:                    'API trigger',
  manual:                 'Manual trigger',
  membership_activated:   'Membership activated',
  membership_deactivated: 'Membership canceled / expired',
  payment_succeeded:      'Payment succeeded',
  product_purchased:      'Specific product purchased',
  product_not_purchased:  'Product not purchased after X days',
};

export interface TriggerEvent {
  workspaceId: string;
  triggerType: TriggerType;
  contactId:   string;
  metadata?:   Record<string, unknown>;
}

export interface TriggerResult {
  workflowsMatched: number;
  enrolled:         number;
  skipped:          number;
}

export async function fireTrigger(event: TriggerEvent): Promise<TriggerResult> {
  const { workspaceId, triggerType, contactId, metadata = {} } = event;

  const workflows = await db.automationWorkflow.findMany({
    where: { workspaceId, status: 'ACTIVE' },
    include: {
      steps: {
        where: { type: 'TRIGGER', position: 0 },
        take: 1,
      },
    },
  });

  const matching = workflows.filter((w) => {
    const triggerStep = w.steps[0];
    if (!triggerStep) return false;
    try {
      const config = JSON.parse(triggerStep.config) as {
        triggerType?: string;
        productId?:   string;
      };

      if (config.triggerType !== triggerType) return false;

      // For product_purchased: config must specify a productId and it must match
      if (triggerType === 'product_purchased') {
        if (!config.productId) return true; // no filter = match all products
        return config.productId === (metadata.productId as string);
      }

      return true;
    } catch {
      return false;
    }
  });

  let enrolled = 0;
  let skipped  = 0;

  for (const workflow of matching) {
    const result = await enrollContact(workflow.id, contactId);
    if (result.enrolled) enrolled++;
    else skipped++;
  }

  return { workflowsMatched: matching.length, enrolled, skipped };
}

/**
 * Manually trigger a workflow for a specific contact (used from dashboard).
 */
export async function manualTrigger(
  workflowId: string,
  contactId:  string
): Promise<{ enrolled: boolean; reason?: string }> {
  return enrollContact(workflowId, contactId);
}

/**
 * Trigger for all subscribed contacts in a workspace (bulk manual trigger).
 */
export async function bulkTrigger(
  workflowId:  string,
  workspaceId: string
): Promise<TriggerResult> {
  const contacts = await db.contact.findMany({
    where: { workspaceId, status: 'SUBSCRIBED' },
    select: { id: true },
    take: 1000,
  });

  let enrolled = 0;
  let skipped  = 0;

  for (const contact of contacts) {
    const result = await enrollContact(workflowId, contact.id);
    if (result.enrolled) enrolled++;
    else skipped++;
  }

  return { workflowsMatched: 1, enrolled, skipped };
}

/**
 * Scheduled check for product_not_purchased trigger.
 * Called by the cron job (/api/automation/process).
 *
 * For each ACTIVE workflow with product_not_purchased trigger:
 *   - Find contacts who joined > daysThreshold days ago
 *   - Check if they have a purchase matching config.productId
 *   - Enroll those who don't
 */
export async function checkProductNotPurchased(workspaceId: string): Promise<TriggerResult> {
  const workflows = await db.automationWorkflow.findMany({
    where: { workspaceId, status: 'ACTIVE' },
    include: {
      steps: { where: { type: 'TRIGGER', position: 0 }, take: 1 },
    },
  });

  const eligible = workflows.filter((w) => {
    const step = w.steps[0];
    if (!step) return false;
    try {
      const c = JSON.parse(step.config);
      return c.triggerType === 'product_not_purchased';
    } catch { return false; }
  });

  let enrolled = 0;
  let skipped  = 0;

  for (const workflow of eligible) {
    try {
      const config = JSON.parse(workflow.steps[0].config) as {
        productId?:     string;
        daysThreshold?: number;
      };

      const { productId, daysThreshold = 7 } = config;
      const cutoff = new Date(Date.now() - daysThreshold * 24 * 60 * 60 * 1000);

      // Find contacts who joined before the cutoff (old enough to have had a chance to buy)
      const contacts = await db.contact.findMany({
        where: { workspaceId, status: 'SUBSCRIBED', createdAt: { lte: cutoff } },
        select: { id: true, email: true },
      });

      for (const contact of contacts) {
        // Check if they have a matching purchase
        const hasPurchase = await db.purchase.findFirst({
          where: {
            workspaceId,
            email:     contact.email,
            ...(productId ? { productId } : {}),
          },
        });

        if (!hasPurchase) {
          const result = await enrollContact(workflow.id, contact.id);
          if (result.enrolled) enrolled++;
          else skipped++;
        }
      }
    } catch (err) {
      console.error(`[product_not_purchased] workflow ${workflow.id} error:`, err);
    }
  }

  return { workflowsMatched: eligible.length, enrolled, skipped };
}
