/**
 * POST /api/v1/send
 *
 * Send a one-off transactional email from the workspace sender identity.
 *
 * Request body:
 *   to      string | string[]  — recipient(s)
 *   subject string             — email subject
 *   html    string             — HTML body
 *   text    string?            — plain text fallback (optional)
 *
 * Returns:
 *   { messageId: string, provider: string }
 */

import { NextRequest } from 'next/server';
import { sendEmail } from '@/lib/email';
import { db } from '@/lib/db/client';
import { resolveApiKey, unauthorizedResponse } from '@/lib/api/auth';
import { v1Limiter, rateLimitedResponse } from '@/lib/api/rate-limit';
import { logApiRequest } from '@/lib/api/logger';

export async function POST(req: NextRequest) {
  const start = Date.now();

  const apiKey = await resolveApiKey(req);
  if (!apiKey) return unauthorizedResponse();

  const rl = v1Limiter.check(apiKey.id);
  if (!rl.success) return rateLimitedResponse(rl.resetAt);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { to, subject, html, text } = body as Record<string, unknown>;

  if (!to || !subject || !html) {
    return Response.json(
      { error: 'Missing required fields', required: ['to', 'subject', 'html'] },
      { status: 400 }
    );
  }

  // Load workspace sender identity
  const workspace = await db.workspace.findUnique({
    where: { id: apiKey.workspaceId },
    select: { fromEmail: true, fromName: true, name: true },
  });

  if (!workspace?.fromEmail) {
    return Response.json(
      { error: 'No sender email configured', message: 'Add a sender email in workspace Settings first.' },
      { status: 422 }
    );
  }

  const fromName = workspace.fromName ?? workspace.name;
  const result = await sendEmail({
    to: to as string | string[],
    subject: subject as string,
    html: html as string,
    text: text as string | undefined,
    from: `${fromName} <${workspace.fromEmail}>`,
  });

  const statusCode = result.success ? 200 : 502;

  logApiRequest({
    apiKeyId: apiKey.id,
    method: 'POST',
    path: '/api/v1/send',
    statusCode,
    durationMs: Date.now() - start,
  });

  if (!result.success) {
    return Response.json({ error: 'Send failed', message: result.error }, { status: 502 });
  }

  return Response.json({ messageId: result.messageId, provider: result.provider });
}
