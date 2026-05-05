'use server';

import { groq } from '@/lib/ai/actions';
import { db } from '@/lib/db/client';
import { requireAdminAccess } from '@/lib/auth/session';
import { checkUsageLimit } from '@/lib/plans/gates';
import { checkCredits, deductCredits } from '@/lib/ai/credits';
import { addStep, createWorkflow } from '@/lib/automation/actions';
import type { AutomationStepType } from '@prisma/client';

export interface AutomationStep {
  position: number;
  type: string;              // one of the AutomationStepType values
  config: Record<string, unknown>;
  description: string;       // human-readable: "Wait 1 day"
}

export interface GeneratedWorkflow {
  name: string;
  description: string;       // 1-2 sentence summary
  trigger: AutomationStep;   // position 0, always TRIGGER type
  steps: AutomationStep[];   // positions 1+
  unmappedResources: string[]; // e.g. ["Tag 'VIP' not found — you'll need to create it"]
}

export async function buildAutomationFromNL(
  description: string,
  workspaceId: string
): Promise<{ success: true; data: GeneratedWorkflow } | { success: false; error: string }> {
  try {
    const creditCheck = await checkCredits(workspaceId, 'buildAutomationFromNL');
    if (!creditCheck.allowed) {
      return { success: false, error: `Not enough AI credits. Need 10, have ${creditCheck.currentBalance}.` };
    }

    const tags = await db.tag.findMany({ where: { workspaceId }, select: { id: true, name: true } });
    const templates = await db.emailTemplate.findMany({ where: { workspaceId }, select: { id: true, name: true, subject: true } });

    const prompt = `ROLE: "You are a marketing automation architect. You convert plain English workflow descriptions into precise step-by-step automation configurations. You specialize in email marketing workflows for online creators who sell courses and community memberships."

AVAILABLE STEP TYPES:
TRIGGER — what starts the automation (always step 0, required):
  - member_joined: new Whop member joins
  - payment_succeeded: member makes a payment
  - member_cancelled: member cancels membership
  - tag_added: specific tag is added to a contact
  config: { event: 'member_joined'|'payment_succeeded'|'member_cancelled'|'tag_added', tagId?: string }

DELAY — pause before the next step:
  config: { unit: 'minutes'|'hours'|'days', amount: number }
  e.g. "wait 3 days" = { unit: 'days', amount: 3 }

SEND_EMAIL — send an email to the contact:
  config: { subject: string, htmlBody: '<p>Email content here. Use {{firstName}} for personalization.</p>' }
  htmlBody should be a simple HTML email with the key content for that step

ADD_TAG — apply a tag to the contact:
  config: { tagId: 'RESOLVE:tag_name' } — use RESOLVE prefix if tag must be looked up by name

AVAILABLE TAGS IN THIS WORKSPACE: ${JSON.stringify(tags)}

RULES:
- ALWAYS start with a TRIGGER step at position 0
- Parse "when someone joins" → TRIGGER: member_joined
- Parse "wait X days/hours" → DELAY step
- Parse "send them an email about X" → SEND_EMAIL with a relevant subject and brief HTML body
- Parse "tag them as X" → ADD_TAG with the matching tagId from available tags; if tag doesn't exist, use RESOLVE:tagname and add to unmappedResources
- For SEND_EMAIL steps, write a genuine brief email (2-3 short paragraphs) appropriate for that step in the sequence. Use {{firstName | fallback: 'there'}} in greeting.
- If the description is ambiguous about timing, default to 1 day delays between emails
- A workflow should have 3-8 steps typically. More than 8 is a campaign sequence, not an automation.
- Never create a webhook step unless explicitly requested
- Set a descriptive name for the workflow based on its purpose

FEW-SHOT EXAMPLES:
Input: "when someone joins, wait 1 day, send a welcome email, wait 3 days, send a tips email, then tag them as onboarded"
Output:
{
  "name": "Welcome Sequence",
  "description": "Welcomes new members and sends tips after a few days.",
  "trigger": { "position": 0, "type": "TRIGGER", "config": { "event": "member_joined" }, "description": "When someone joins" },
  "steps": [
    { "position": 1, "type": "DELAY", "config": { "unit": "days", "amount": 1 }, "description": "Wait 1 day" },
    { "position": 2, "type": "SEND_EMAIL", "config": { "subject": "Welcome!", "htmlBody": "<p>Hi {{firstName | fallback: 'there'}},</p><p>Welcome to the community!</p>" }, "description": "Send welcome email" },
    { "position": 3, "type": "DELAY", "config": { "unit": "days", "amount": 3 }, "description": "Wait 3 days" },
    { "position": 4, "type": "SEND_EMAIL", "config": { "subject": "Top 3 tips", "htmlBody": "<p>Hi {{firstName | fallback: 'there'}},</p><p>Here are some tips.</p>" }, "description": "Send tips email" },
    { "position": 5, "type": "ADD_TAG", "config": { "tagId": "RESOLVE:onboarded" }, "description": "Tag as onboarded" }
  ],
  "unmappedResources": ["Tag 'onboarded' not found — you'll need to create it"]
}

Input: "new member sequence: instant welcome, 2 days later intro to community, 5 days later pitch the premium tier"
Output:
{
  "name": "New Member Sequence",
  "description": "Instant welcome followed by community intro and premium pitch.",
  "trigger": { "position": 0, "type": "TRIGGER", "config": { "event": "member_joined" }, "description": "When someone joins" },
  "steps": [
    { "position": 1, "type": "SEND_EMAIL", "config": { "subject": "Welcome to [Community]!", "htmlBody": "<p>Hi {{firstName | fallback: 'there'}},</p><p>Welcome!</p>" }, "description": "Send instant welcome" },
    { "position": 2, "type": "DELAY", "config": { "unit": "days", "amount": 2 }, "description": "Wait 2 days" },
    { "position": 3, "type": "SEND_EMAIL", "config": { "subject": "Explore the community", "htmlBody": "<p>Hi {{firstName | fallback: 'there'}},</p><p>Explore the community.</p>" }, "description": "Send community intro" },
    { "position": 4, "type": "DELAY", "config": { "unit": "days", "amount": 5 }, "description": "Wait 5 days" },
    { "position": 5, "type": "SEND_EMAIL", "config": { "subject": "Ready to go deeper?", "htmlBody": "<p>Hi {{firstName | fallback: 'there'}},</p><p>Check out our premium tier.</p>" }, "description": "Pitch premium tier" }
  ],
  "unmappedResources": []
}

INPUT DESCRIPTION:
${description}
`;

    const text = await groq(prompt, { jsonSchema: true, maxTokens: 4000 });
    const parsed = JSON.parse(text) as GeneratedWorkflow;

    await deductCredits(workspaceId, 'buildAutomationFromNL');
    return { success: true, data: parsed };
  } catch (err) {
    console.error('buildAutomationFromNL error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to build automation' };
  }
}

export async function materializeWorkflow(
  workflow: GeneratedWorkflow,
  workspaceId: string,
  isEnabled: boolean
): Promise<{ success: true; data: { workflowId: string } } | { success: false; error: string }> {
  try {
    await requireAdminAccess();

    const gate = await checkUsageLimit({ workspaceId, type: 'automations' });
    if (!gate.allowed) {
      return { success: false, error: 'Automation limit reached for your current plan.' };
    }

    // Resolve tags
    for (const step of [workflow.trigger, ...workflow.steps]) {
      if (step.type === 'ADD_TAG' || (step.type === 'TRIGGER' && step.config.event === 'tag_added')) {
        const tagIdStr = step.config.tagId as string;
        if (tagIdStr && tagIdStr.startsWith('RESOLVE:')) {
          const tagName = tagIdStr.replace('RESOLVE:', '');
          const tag = await db.tag.findFirst({ where: { workspaceId, name: tagName } });
          if (!tag) {
            return { success: false, error: `Tag '${tagName}' not found. Please create it first.` };
          }
          step.config.tagId = tag.id;
        }
      }
    }

    const createdWorkflow = await db.automationWorkflow.create({
      data: {
        workspaceId,
        name: workflow.name,
        description: workflow.description,
        status: isEnabled ? 'ACTIVE' : 'DRAFT',
      },
    });

    // Create trigger step
    await db.automationStep.create({
      data: {
        workflowId: createdWorkflow.id,
        type: 'TRIGGER',
        position: 0,
        config: JSON.stringify(workflow.trigger.config),
      },
    });

    // Create other steps
    for (const step of workflow.steps) {
      await db.automationStep.create({
        data: {
          workflowId: createdWorkflow.id,
          type: step.type as AutomationStepType,
          position: step.position,
          config: JSON.stringify(step.config),
        },
      });
    }

    return { success: true, data: { workflowId: createdWorkflow.id } };
  } catch (err) {
    console.error('materializeWorkflow error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to materialize workflow' };
  }
}
