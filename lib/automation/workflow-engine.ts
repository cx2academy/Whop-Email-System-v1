/**
 * lib/automation/workflow-engine.ts
 *
 * Core workflow runner. Advances an enrollment through its steps.
 *
 * Flow:
 *   enrollContact() → creates enrollment → runNextStep()
 *   runNextStep()   → if DELAY → scheduleJob() → return
 *                   → if action → executeStep() → advance → runNextStep()
 *                   → if no more steps → complete enrollment
 *
 * Safety:
 *   - 10 errors per enrollment → mark FAILED
 *   - 10 errors per workflow → auto-disable workflow
 *   - Duplicate enrollment guard (@@unique constraint)
 */

import { db } from '@/lib/db/client';
import { executeStep, calcExecuteAt } from './action-system';
import type { DelayConfig } from './action-system';

const MAX_ENROLLMENT_ERRORS = 10;
const MAX_WORKFLOW_ERRORS   = 10;

// ---------------------------------------------------------------------------
// Enroll a contact into a workflow
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

  // Upsert enrollment — if one already exists and is ACTIVE, skip
  const existing = await db.automationEnrollment.findUnique({
    where: { workflowId_contactId: { workflowId, contactId } },
  });

  if (existing) {
    if (existing.status === 'ACTIVE') return { enrolled: false, reason: 'Already enrolled' };
    // Re-enroll if previous run completed/failed
    await db.automationEnrollment.update({
      where: { id: existing.id },
      data: { status: 'ACTIVE', currentStep: 0, errorCount: 0, completedAt: null, errorMessage: null },
    });
  } else {
    await db.automationEnrollment.create({
      data: { workflowId, contactId, currentStep: 0 },
    });
  }

  // Update workflow stats
  await db.automationWorkflow.update({
    where: { id: workflowId },
    data: { totalRuns: { increment: 1 }, lastTriggeredAt: new Date() },
  });

  const enrollment = await db.automationEnrollment.findUnique({
    where: { workflowId_contactId: { workflowId, contactId } },
  });

  if (enrollment) {
    // Run first steps synchronously (skip the trigger step at position 0)
    await advanceEnrollment(enrollment.id);
  }

  return { enrolled: true };
}

// ---------------------------------------------------------------------------
// Advance an enrollment to the next step
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

  // Walk through steps starting at currentStep
  let position = enrollment.currentStep;

  while (position < steps.length) {
    const step = steps[position];

    // Skip TRIGGER steps (they just mark the entry point)
    if (step.type === 'TRIGGER') {
      position++;
      continue;
    }

    // DELAY: schedule a job and stop here
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

      // Advance position past the delay — job will call runAfterDelay()
      await db.automationEnrollment.update({
        where: { id: enrollmentId },
        data: { currentStep: position + 1 },
      });

      return; // Pause here — resume when job fires
    }

    // ACTION step — execute it
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

  // All steps done — complete the enrollment
  await db.automationEnrollment.update({
    where: { id: enrollmentId },
    data: { status: 'COMPLETED', completedAt: new Date() },
  });
}

// ---------------------------------------------------------------------------
// Error handling with auto-disable
// ---------------------------------------------------------------------------

async function handleStepError(
  enrollmentId: string,
  workflowId: string,
  err: unknown
): Promise<void> {
  const message = err instanceof Error ? err.message : String(err);

  const enrollment = await db.automationEnrollment.update({
    where: { id: enrollmentId },
    data: {
      errorCount: { increment: 1 },
      errorMessage: message,
    },
  });

  if (enrollment.errorCount >= MAX_ENROLLMENT_ERRORS) {
    await db.automationEnrollment.update({
      where: { id: enrollmentId },
      data: { status: 'FAILED' },
    });
  }

  // Increment workflow error count — auto-disable if too many
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
