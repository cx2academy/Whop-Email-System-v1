/**
 * app/api/automation/trigger/route.ts
 *
 * External trigger endpoint — allows API keys to fire automation triggers.
 *
 * POST /api/automation/trigger
 * Authorization: Bearer <api_key>
 * Body: { triggerType: 'api', contactId: string, workflowId?: string }
 *
 * If workflowId is provided, enrolls that specific workflow.
 * Otherwise fires the trigger for all matching ACTIVE workflows.
 */

import { NextRequest } from 'next/server';
import { resolveApiKey } from '@/lib/api/auth';
import { fireTrigger, manualTrigger } from '@/lib/automation/trigger-system';

export async function POST(req: NextRequest) {
  const ctx = await resolveApiKey(req);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { triggerType?: string; contactId?: string; workflowId?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { triggerType = 'api', contactId, workflowId } = body;

  if (!contactId) {
    return Response.json({ error: 'contactId is required' }, { status: 422 });
  }

  if (workflowId) {
    const result = await manualTrigger(workflowId, contactId);
    return Response.json({ data: result }, { status: result.enrolled ? 200 : 422 });
  }

  const result = await fireTrigger({
    workspaceId: ctx.workspaceId,
    triggerType: triggerType as 'api',
    contactId,
  });

  return Response.json({ data: result });
}
