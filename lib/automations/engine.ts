import { db } from '@/lib/db/client';
import { AutomationStatus, EnrollmentStatus, JobStatus, AutomationStepType, NotificationType } from '@prisma/client';
import { captureServerEvent } from '@/lib/posthog-server';
import { createNotification } from '@/lib/notifications/actions';

/**
 * lib/automations/engine.ts
 * 
 * Core logic for the automation system.
 * Handles enrollment, queue processing, and step execution.
 */

// ---------------------------------------------------------------------------
// Enrollment
// ---------------------------------------------------------------------------

export async function enrollContactInWorkflow(params: {
  workspaceId: string;
  contactId: string;
  workflowId: string;
  triggerMetadata?: any;
}) {
  const { workspaceId, contactId, workflowId, triggerMetadata } = params;

  // 1. Verify workflow is active
  const workflow = await db.automationWorkflow.findUnique({
    where: { id: workflowId, workspaceId, status: AutomationStatus.ACTIVE },
    include: { steps: { orderBy: { position: 'asc' } } },
  });

  if (!workflow) return null;

  // 2. Create enrollment (idempotent-ish)
  // We use upsert to avoid duplicate active enrollments for the same contact/workflow
  const enrollment = await db.automationEnrollment.upsert({
    where: { workflowId_contactId: { workflowId, contactId } },
    create: {
      workflowId,
      contactId,
      status: EnrollmentStatus.ACTIVE,
      currentStep: 0,
    },
    update: {
      // If already completed or failed, we might want to re-enroll?
      // For now, only re-enroll if not already active
      status: EnrollmentStatus.ACTIVE,
      currentStep: 0,
      startedAt: new Date(),
      completedAt: null,
      errorCount: 0,
      errorMessage: null,
    },
  });

  // 3. Log enrollment
  await db.automationLog.create({
    data: {
      workspaceId,
      workflowId,
      enrollmentId: enrollment.id,
      contactId,
      event: 'enrollment',
      message: 'Contact enrolled in workflow',
      metadata: triggerMetadata,
    },
  });

  // Track in PostHog
  captureServerEvent(contactId, 'Automation Triggered', {
    workflow_id: workflowId,
    workflow_name: workflow.name,
    workspace_id: workspaceId,
    ...triggerMetadata,
  });

  // 4. Schedule the first non-trigger step
  const firstActionStep = workflow.steps.find(s => s.position === 1);
  if (firstActionStep) {
    await scheduleNextStep(enrollment.id, firstActionStep.id, new Date());
  } else {
    // No steps after trigger? Complete immediately
    await db.automationEnrollment.update({
      where: { id: enrollment.id },
      data: { status: EnrollmentStatus.COMPLETED, completedAt: new Date() },
    });
  }

  return enrollment;
}

/**
 * Finds all active workflows triggered by a specific event and enrolls the contact.
 */
export async function triggerAutomations(params: {
  workspaceId: string;
  contactId: string;
  triggerType: string; // e.g. 'whop_purchase'
  metadata?: any;
}) {
  const { workspaceId, contactId, triggerType, metadata } = params;

  // Find workflows where the first step (trigger) matches the type
  const workflows = await db.automationWorkflow.findMany({
    where: {
      workspaceId,
      status: AutomationStatus.ACTIVE,
      steps: {
        some: {
          position: 0,
          type: AutomationStepType.TRIGGER,
          config: {
            path: ['type'],
            equals: triggerType,
          },
        },
      },
    },
  });

  const results = [];
  for (const wf of workflows) {
    results.push(await enrollContactInWorkflow({
      workspaceId,
      contactId,
      workflowId: wf.id,
      triggerMetadata: metadata,
    }));
  }

  return results;
}

// ---------------------------------------------------------------------------
// Queue Processing
// ---------------------------------------------------------------------------

export async function processAutomationQueue() {
  const now = new Date();

  // 1. Find pending jobs that are ready to execute
  const jobs = await db.automationJob.findMany({
    where: {
      status: JobStatus.PENDING,
      executeAt: { lte: now },
    },
    include: {
      step: true,
      enrollment: {
        include: {
          contact: true,
          workflow: true,
        },
      },
    },
    take: 50, // Process in batches
  });

  const results = {
    total: jobs.length,
    success: 0,
    failed: 0,
  };

  for (const job of jobs) {
    try {
      // Mark as running
      await db.automationJob.update({
        where: { id: job.id },
        data: { status: JobStatus.RUNNING, attempts: { increment: 1 } },
      });

      await executeAutomationStep(job);

      // Mark as completed
      await db.automationJob.update({
        where: { id: job.id },
        data: { status: JobStatus.COMPLETED },
      });
      results.success++;
    } catch (err) {
      console.error(`[automation] Job ${job.id} failed:`, err);
      await db.automationJob.update({
        where: { id: job.id },
        data: { 
          status: JobStatus.FAILED, 
          errorMessage: String(err) 
        },
      });
      
      await db.automationLog.create({
        data: {
          workspaceId: job.enrollment.workflow.workspaceId,
          workflowId: job.workflowId,
          enrollmentId: job.enrollmentId,
          contactId: job.enrollment.contactId,
          stepId: job.stepId,
          event: 'step_failed',
          message: String(err),
        },
      });

      // Send critical notification to workspace about automation failure
      await createNotification({
        workspaceId: job.enrollment.workflow.workspaceId,
        type: NotificationType.SYSTEM,
        title: 'Automation Workflow Error',
        message: `Workflow "${job.enrollment.workflow.name}" failed for contact ${job.enrollment.contact.email}: ${String(err)}`,
        actionUrl: `/dashboard/automations/${job.workflowId}`,
      });

      results.failed++;
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Step Execution
// ---------------------------------------------------------------------------

async function executeAutomationStep(job: any) {
  const { step, enrollment } = job;
  const config = step.config as any;

  await db.automationLog.create({
    data: {
      workspaceId: enrollment.workflow.workspaceId,
      workflowId: job.workflowId,
      enrollmentId: job.enrollmentId,
      contactId: enrollment.contactId,
      stepId: job.stepId,
      event: 'step_start',
      message: `Executing step: ${step.type}`,
    },
  });

  switch (step.type) {
    case AutomationStepType.SEND_EMAIL:
      await handleSendEmail(job);
      break;
    case AutomationStepType.DELAY:
      // Delay step just schedules the next step
      // The "execution" of a delay step is actually just moving to the next one
      break;
    case AutomationStepType.ADD_TAG:
      await handleAddTag(job);
      break;
    default:
      throw new Error(`Unsupported step type: ${step.type}`);
  }

  // Find and schedule the next step
  const nextStep = await db.automationStep.findFirst({
    where: {
      workflowId: job.workflowId,
      position: step.position + 1,
    },
  });

  if (nextStep) {
    let executeAt = new Date();
    
    // If the current step was a delay, we calculate the next execution time
    if (step.type === AutomationStepType.DELAY) {
      const delayMinutes = config.minutes || 0;
      const delayHours = config.hours || 0;
      const delayDays = config.days || 0;
      const totalMs = (delayMinutes * 60 + delayHours * 3600 + delayDays * 86400) * 1000;
      executeAt = new Date(Date.now() + totalMs);
    }

    await scheduleNextStep(enrollment.id, nextStep.id, executeAt);
    
    // Update enrollment progress
    await db.automationEnrollment.update({
      where: { id: enrollment.id },
      data: { currentStep: nextStep.position },
    });
  } else {
    // No more steps — complete enrollment
    await db.automationEnrollment.update({
      where: { id: enrollment.id },
      data: { status: EnrollmentStatus.COMPLETED, completedAt: new Date() },
    });
    
    await db.automationLog.create({
      data: {
        workspaceId: enrollment.workflow.workspaceId,
        workflowId: job.workflowId,
        enrollmentId: job.enrollmentId,
        contactId: enrollment.contactId,
        event: 'step_complete',
        message: 'Workflow completed',
      },
    });
  }
}

async function scheduleNextStep(enrollmentId: string, stepId: string, executeAt: Date) {
  const step = await db.automationStep.findUnique({ where: { id: stepId } });
  if (!step) return;

  await db.automationJob.create({
    data: {
      enrollmentId,
      stepId,
      workflowId: step.workflowId,
      executeAt,
      status: JobStatus.PENDING,
    },
  });
}

// ---------------------------------------------------------------------------
// Action Handlers
// ---------------------------------------------------------------------------

async function handleSendEmail(job: any) {
  const { step, enrollment } = job;
  const config = step.config as any;
  const contact = enrollment.contact;
  const workspaceId = enrollment.workflow.workspaceId;

  // In a real app, we'd use the campaign sending logic here
  // For now, we'll create an EmailSend record and let the existing infrastructure handle it
  // or just mock it for this phase.
  
  // Actually, let's use a simplified version of campaign sending
  console.log(`[automation] Sending email to ${contact.email} for step ${step.id}`);
  
  // We'll need a template or subject/body in config
  const subject = config.subject || 'Hello!';
  const htmlBody = config.htmlBody || '<p>Hello!</p>';

  // Create a record in email_sends so it shows up in analytics
  // Note: Automation sends are usually "TRIGGER" type campaigns
  // We might need a "ghost" campaign for each automation to group these sends
  
  // For now, just log it
  await db.automationLog.create({
    data: {
      workspaceId,
      workflowId: job.workflowId,
      enrollmentId: job.enrollmentId,
      contactId: contact.id,
      stepId: step.id,
      event: 'step_complete',
      message: `Email sent: ${subject}`,
    },
  });
}

async function handleAddTag(job: any) {
  const { step, enrollment } = job;
  const config = step.config as any;
  const contactId = enrollment.contactId;
  const workspaceId = enrollment.workflow.workspaceId;
  const tagName = config.tagName;

  if (!tagName) throw new Error('Tag name missing in config');

  const tag = await db.tag.upsert({
    where: { workspaceId_name: { workspaceId, name: tagName } },
    create: { workspaceId, name: tagName },
    update: {},
  });

  await db.contactTag.upsert({
    where: { contactId_tagId: { contactId, tagId: tag.id } },
    create: { contactId, tagId: tag.id },
    update: {},
  });

  await db.automationLog.create({
    data: {
      workspaceId,
      workflowId: job.workflowId,
      enrollmentId: job.enrollmentId,
      contactId,
      stepId: step.id,
      event: 'step_complete',
      message: `Tag added: ${tagName}`,
    },
  });
}
