/**
 * lib/automation/trigger-system.ts
 *
 * Matches a trigger event to ACTIVE workflows and enrolls matching contacts.
 *
 * Trigger types:
 *   new_member  — fired when a new contact is synced (from sync service)
 *   purchase    — fired via webhook or API
 *   api         — fired via POST /api/automation/trigger
 *   manual      — fired via dashboard UI
 *
 * The first step of a workflow must be a TRIGGER step. Its config specifies
 * which triggerType it responds to.
 */

import { db } from '@/lib/db/client';
import { enrollContact } from './workflow-engine';

export type TriggerType = 'new_member' | 'purchase' | 'api' | 'manual';

export interface TriggerEvent {
  workspaceId: string;
  triggerType: TriggerType;
  contactId: string;
  metadata?: Record<string, unknown>; // future: filter conditions
}

export interface TriggerResult {
  workflowsMatched: number;
  enrolled: number;
  skipped: number;
}

export async function fireTrigger(event: TriggerEvent): Promise<TriggerResult> {
  const { workspaceId, triggerType, contactId } = event;

  // Find all ACTIVE workflows in this workspace whose trigger step matches
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
      const config = JSON.parse(triggerStep.config) as { triggerType?: string };
      return config.triggerType === triggerType;
    } catch {
      return false;
    }
  });

  let enrolled = 0;
  let skipped = 0;

  for (const workflow of matching) {
    const result = await enrollContact(workflow.id, contactId);
    if (result.enrolled) {
      enrolled++;
    } else {
      skipped++;
    }
  }

  return { workflowsMatched: matching.length, enrolled, skipped };
}

/**
 * Manually trigger a workflow for a specific contact (used from dashboard).
 */
export async function manualTrigger(
  workflowId: string,
  contactId: string
): Promise<{ enrolled: boolean; reason?: string }> {
  return enrollContact(workflowId, contactId);
}

/**
 * Trigger for all subscribed contacts in a workspace (bulk manual trigger).
 * Used for "run now" testing.
 */
export async function bulkTrigger(
  workflowId: string,
  workspaceId: string
): Promise<TriggerResult> {
  const contacts = await db.contact.findMany({
    where: { workspaceId, status: 'SUBSCRIBED' },
    select: { id: true },
    take: 1000,
  });

  let enrolled = 0;
  let skipped = 0;

  for (const contact of contacts) {
    const result = await enrollContact(workflowId, contact.id);
    if (result.enrolled) enrolled++;
    else skipped++;
  }

  return { workflowsMatched: 1, enrolled, skipped };
}
