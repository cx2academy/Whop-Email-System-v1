/**
 * lib/automation/workflow-engine.ts
 *
 * Core workflow runner. Advances an enrollment through its steps.
 * Now supports CONDITION branching (IF/ELSE) and REMOVE_TAG.
 *
 * Flow:
 *   enrollContact() → creates enrollment → advanceEnrollment()
 *   advanceEnrollment():
 *     TRIGGER  → skip
 *     DELAY    → schedule job, pause
 *     CONDITION → evaluate, run true/false branch inline, advance
 *     ACTION   → execute, advance
 *     done     → mark COMPLETED
 */

import { db } from '@/lib/db/client';
import { executeStep, calcExecuteAt } from './action-system';
import type { DelayConfig } from './action-system';

const MAX_ENROLLMENT_ERRORS = 10;
const MAX_WORKFLOW_ERRORS   = 10;

// ---------------------------------------------------------------------------
// Enroll a contact
// ---------------------------------------------------------------------------

export async function enrollContact(
  workflowId: string,
  contactId: string
): Promise<{ enrolled: boolean; reason?: string }> {
  const workflow = await db.automationWorkflow.findUnique({
    where: { id: workflowId },
    include: { steps: { orderBy: { position: 'asc' } } },
  });

  if (!workflow) return { enrolled: false, reason: 'Workflow not found' };
  if (workflow.status !== 'ACTIVE') return { enrolled: false, reason: 'Workflow not active' };
  if (workflow.steps.length === 0) return { enrolled: false, reason: 'Workflow has no steps' };

  const existing = await db.automationEnrollment.findUnique({
    where: { workflowId_contactId: { workflowId, contactId } },
  });

  if (existing) {
    if (existing.status === 'ACTIVE') return { enrolled: false, reason: 'Already enrolled' };
    await db.automationEnrollment.update({
      where: { id: existing.id },
      data: { status: 'ACTIVE', currentStep: 0, errorCount: 0, completedAt: null, errorMessage: null },
    });
  } else {
    await db.automationEnrollment.create({
      data: { workflowId, contactId, currentStep: 0 },
    });
  }

  await db.automationWorkflow.update({
    where: { id: workflowId },
    data: { totalRuns: { increment: 1 }, lastTriggeredAt: new Date() },
  });

  const enrollment = await db.automationEnrollment.findUnique({
    where: { workflowId_contactId: { workflowId, contactId } },
  });

  if (enrollment) {
    await advanceEnrollment(enrollment.id);
  }

  return { enrolled: true };
}

// ---------------------------------------------------------------------------
// Advance an enrollment
// ---------------------------------------------------------------------------

export async function advanceEnrollment(enrollmentId: string): Promise<void> {
  const enrollment = await db.automationEnrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      workflow: {
        include: { steps: { orderBy: { position: 'asc' } } },
      },
    },
  });

  if (!enrollment || enrollment.status !== 'ACTIVE') return;

  const steps = enrollment.workflow.steps;
  const workspaceId = enrollment.workflow.workspaceId;
  let position = enrollment.currentStep;

  while (position < steps.length) {
    const step = steps[position];

    if (step.type === 'TRIGGER') {
      position++;
      continue;
    }

    if (step.type === 'DELAY') {
      const config = JSON.parse(step.config) as DelayConfig;
      const executeAt = calcExecuteAt(config);

      await db.automationJob.create({
        data: {
          workflowId: enrollment.workflowId,
          stepId: step.id,
          enrollmentId,
          executeAt,
          status: 'PENDING',
        },
      });

      await db.automationEnrollment.update({
        where: { id: enrollmentId },
        data: { currentStep: position + 1 },
      });

      return;
    }

    // ACTION or CONDITION step
    try {
      const config = JSON.parse(step.config) as Record<string, unknown>;
      await executeStep(step.type, config, enrollment.contactId, workspaceId, enrollmentId);
      position++;
      await db.automationEnrollment.update({
        where: { id: enrollmentId },
        data: { currentStep: position },
      });
    } catch (err) {
      await handleStepError(enrollmentId, enrollment.workflowId, err);
      return;
    }
  }

  await db.automationEnrollment.update({
    where: { id: enrollmentId },
    data: { status: 'COMPLETED', completedAt: new Date() },
  });
}

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

async function handleStepError(
  enrollmentId: string,
  workflowId: string,
  err: unknown
): Promise<void> {
  const message = err instanceof Error ? err.message : String(err);

  const enrollment = await db.automationEnrollment.update({
    where: { id: enrollmentId },
    data: { errorCount: { increment: 1 }, errorMessage: message },
  });

  if (enrollment.errorCount >= MAX_ENROLLMENT_ERRORS) {
    await db.automationEnrollment.update({
      where: { id: enrollmentId },
      data: { status: 'FAILED' },
    });
  }

  const workflow = await db.automationWorkflow.update({
    where: { id: workflowId },
    data: { errorCount: { increment: 1 } },
  });

  if (workflow.errorCount >= MAX_WORKFLOW_ERRORS) {
    await db.automationWorkflow.update({
      where: { id: workflowId },
      data: { status: 'DISABLED' },
    });
    console.error(`[automation] Workflow ${workflowId} auto-disabled after ${MAX_WORKFLOW_ERRORS} errors`);
  }

  console.error(`[automation] Step error in enrollment ${enrollmentId}: ${message}`);
}
