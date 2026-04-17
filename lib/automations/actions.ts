'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { requireAdminAccess } from '@/lib/auth/session';
import { AutomationStatus, AutomationStepType } from '@prisma/client';
import { AUTOMATION_BLUEPRINTS } from './blueprints';

/**
 * lib/automations/actions.ts
 * 
 * Server actions for automation CRUD and management.
 */

export async function installBlueprint(blueprintId: string) {
  const { workspaceId } = await requireAdminAccess();
  const blueprint = AUTOMATION_BLUEPRINTS.find(b => b.id === blueprintId);
  
  if (!blueprint) throw new Error('Blueprint not found');

  const workflow = await db.automationWorkflow.create({
    data: {
      workspaceId,
      name: blueprint.name,
      description: blueprint.description,
      status: AutomationStatus.DRAFT,
      steps: {
        create: blueprint.steps.map((step, index) => ({
          type: step.type,
          position: index,
          config: step.config,
        })),
      },
    },
  });

  revalidatePath('/dashboard/automations');
  return { success: true, id: workflow.id };
}

export async function getAutomationLogs() {
  const { workspaceId } = await requireAdminAccess();
  return db.automationLog.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

export async function getAutomations() {
  const { workspaceId } = await requireAdminAccess();
  return db.automationWorkflow.findMany({
    where: { workspaceId },
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: {
        select: { enrollments: true },
      },
    },
  });
}

export async function getAutomation(id: string) {
  const { workspaceId } = await requireAdminAccess();
  return db.automationWorkflow.findUnique({
    where: { id, workspaceId },
    include: {
      steps: { orderBy: { position: 'asc' } },
    },
  });
}

export async function createAutomation(data: { name: string; description?: string }) {
  const { workspaceId } = await requireAdminAccess();

  const workflow = await db.automationWorkflow.create({
    data: {
      workspaceId,
      name: data.name,
      description: data.description,
      status: AutomationStatus.DRAFT,
      steps: {
        create: [
          {
            position: 0,
            type: AutomationStepType.TRIGGER,
            config: { type: 'whop_purchase' },
          },
        ],
      },
    },
  });

  revalidatePath('/dashboard/automations');
  return { success: true, id: workflow.id };
}

export async function updateAutomation(id: string, data: { 
  name?: string; 
  description?: string; 
  status?: AutomationStatus;
  steps?: any[];
}) {
  const { workspaceId } = await requireAdminAccess();

  // 1. Update workflow metadata
  await db.automationWorkflow.update({
    where: { id, workspaceId },
    data: {
      name: data.name,
      description: data.description,
      status: data.status,
    },
  });

  // 2. Update steps if provided
  if (data.steps) {
    // Simple approach: delete all and recreate
    // In a production app, we'd do a more surgical update
    await db.automationStep.deleteMany({ where: { workflowId: id } });
    
    await db.automationStep.createMany({
      data: data.steps.map((step, index) => ({
        workflowId: id,
        type: step.type,
        position: index,
        config: step.config || {},
      })),
    });
  }

  revalidatePath('/dashboard/automations');
  revalidatePath(`/dashboard/automations/${id}`);
  return { success: true };
}

export async function deleteAutomation(id: string) {
  const { workspaceId } = await requireAdminAccess();
  await db.automationWorkflow.delete({
    where: { id, workspaceId },
  });
  revalidatePath('/dashboard/automations');
  return { success: true };
}
