'use server';

/**
 * lib/automation/actions.ts
 *
 * Server actions for the automation dashboard.
 * CRUD for workflows + steps, plus activate/pause/trigger controls.
 */

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { requireAdminAccess, requireWorkspaceAccess } from '@/lib/auth/session';
import { manualTrigger, bulkTrigger } from './trigger-system';
import { checkUsageLimit } from '@/lib/plans/gates';
import type { AutomationStepType } from '@prisma/client';

// ---------------------------------------------------------------------------
// Workflow CRUD
// ---------------------------------------------------------------------------

export async function createWorkflow(name: string, description?: string) {
  const { workspaceId } = await requireAdminAccess();

  // Plan gate — check automation limit before creating
  const gate = await checkUsageLimit({ workspaceId, type: 'automations' });
  if (!gate.allowed) return gate.toActionError();

  const workflow = await db.automationWorkflow.create({
    data: { workspaceId, name, description },
  });

  revalidatePath('/dashboard/automation');
  return { success: true as const, data: { workflowId: workflow.id } };
}

export async function updateWorkflow(
  workflowId: string,
  data: { name?: string; description?: string }
) {
  const { workspaceId } = await requireAdminAccess();
  await db.automationWorkflow.updateMany({
    where: { id: workflowId, workspaceId },
    data,
  });
  revalidatePath('/dashboard/automation');
  return { success: true as const };
}

export async function deleteWorkflow(workflowId: string) {
  const { workspaceId } = await requireAdminAccess();
  await db.automationWorkflow.deleteMany({ where: { id: workflowId, workspaceId } });
  revalidatePath('/dashboard/automation');
  return { success: true as const };
}

export async function setWorkflowStatus(
  workflowId: string,
  status: 'ACTIVE' | 'PAUSED' | 'DRAFT'
) {
  const { workspaceId } = await requireAdminAccess();

  const workflow = await db.automationWorkflow.findFirst({
    where: { id: workflowId, workspaceId },
    include: { steps: true },
  });

  if (!workflow) return { success: false as const, error: 'Workflow not found' };

  // Validate before activating
  if (status === 'ACTIVE') {
    if (workflow.steps.length < 2) {
      return { success: false as const, error: 'Workflow needs at least a trigger and one action step' };
    }
    const hasTrigger = workflow.steps.some((s) => s.type === 'TRIGGER');
    if (!hasTrigger) {
      return { success: false as const, error: 'Workflow needs a trigger step' };
    }
    // Reset error count when re-activating
    await db.automationWorkflow.update({
      where: { id: workflowId },
      data: { errorCount: 0 },
    });
  }

  await db.automationWorkflow.updateMany({
    where: { id: workflowId, workspaceId },
    data: { status },
  });

  revalidatePath('/dashboard/automation');
  return { success: true as const };
}

// ---------------------------------------------------------------------------
// Step CRUD
// ---------------------------------------------------------------------------

export async function addStep(
  workflowId: string,
  type: AutomationStepType,
  config: Record<string, unknown>,
  position: number
) {
  const { workspaceId } = await requireAdminAccess();

  const workflow = await db.automationWorkflow.findFirst({
    where: { id: workflowId, workspaceId },
  });
  if (!workflow) return { success: false as const, error: 'Workflow not found' };

  // Shift existing steps down to make room
  await db.automationStep.updateMany({
    where: { workflowId, position: { gte: position } },
    data: { position: { increment: 1 } },
  });

  const step = await db.automationStep.create({
    data: { workflowId, type, position, config: JSON.stringify(config) },
  });

  revalidatePath('/dashboard/automation');
  return { success: true as const, data: { stepId: step.id } };
}

export async function updateStep(
  stepId: string,
  config: Record<string, unknown>
) {
  const { workspaceId } = await requireAdminAccess();

  await db.automationStep.updateMany({
    where: { id: stepId, workflow: { workspaceId } },
    data: { config: JSON.stringify(config) },
  });

  revalidatePath('/dashboard/automation');
  return { success: true as const };
}

export async function deleteStep(stepId: string) {
  const { workspaceId } = await requireAdminAccess();

  const step = await db.automationStep.findFirst({
    where: { id: stepId, workflow: { workspaceId } },
  });
  if (!step) return { success: false as const, error: 'Step not found' };

  await db.automationStep.delete({ where: { id: stepId } });

  // Re-number remaining steps
  const remaining = await db.automationStep.findMany({
    where: { workflowId: step.workflowId },
    orderBy: { position: 'asc' },
  });
  for (let i = 0; i < remaining.length; i++) {
    await db.automationStep.update({ where: { id: remaining[i].id }, data: { position: i } });
  }

  revalidatePath('/dashboard/automation');
  return { success: true as const };
}

// ---------------------------------------------------------------------------
// Trigger controls
// ---------------------------------------------------------------------------

export async function triggerForContact(workflowId: string, contactId: string) {
  const { workspaceId } = await requireAdminAccess();
  const workflow = await db.automationWorkflow.findFirst({ where: { id: workflowId, workspaceId } });
  if (!workflow) return { success: false as const, error: 'Workflow not found' };

  const result = await manualTrigger(workflowId, contactId);
  revalidatePath('/dashboard/automation');
  return result.enrolled
    ? { success: true as const, data: result }
    : { success: false as const, error: result.reason ?? 'Could not enroll' };
}

export async function triggerForAll(workflowId: string) {
  const { workspaceId } = await requireAdminAccess();
  const result = await bulkTrigger(workflowId, workspaceId);
  revalidatePath('/dashboard/automation');
  return { success: true as const, data: result };
}

// ---------------------------------------------------------------------------
// Dashboard data
// ---------------------------------------------------------------------------

export async function getWorkflows() {
  const { workspaceId } = await requireWorkspaceAccess();

  return db.automationWorkflow.findMany({
    where: { workspaceId },
    include: {
      steps: { orderBy: { position: 'asc' } },
      _count: { select: { enrollments: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getWorkflow(workflowId: string) {
  const { workspaceId } = await requireWorkspaceAccess();

  return db.automationWorkflow.findFirst({
    where: { id: workflowId, workspaceId },
    include: {
      steps: { orderBy: { position: 'asc' } },
      enrollments: {
        orderBy: { startedAt: 'desc' },
        take: 20,
        include: { contact: { select: { email: true, firstName: true } } },
      },
      _count: { select: { enrollments: true, jobs: true } },
    },
  });
}
