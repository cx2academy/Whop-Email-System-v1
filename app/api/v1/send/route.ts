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
import { checkPlanLimit, checkUsageLimit } from '@/lib/plans/gates';

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

  // ── Input validation ──────────────────────────────────────────────────────
  // We don't sanitize HTML (that would break legitimate email styling), but we
  // enforce strict types and size limits so no one can abuse the endpoint to
  // send enormous payloads or inject unexpected types.

  if (!to || !subject || !html) {
    return Response.json(
      { error: 'Missing required fields', required: ['to', 'subject', 'html'] },
      { status: 400 }
    );
  }

  // Validate `to` — must be a string or array of strings (valid email-ish)
  const toArray = Array.isArray(to) ? to : [to];
  if (toArray.length === 0 || toArray.length > 50) {
    return Response.json(
      { error: '`to` must contain between 1 and 50 recipients' },
      { status: 400 }
    );
  }
  if (!toArray.every((r) => typeof r === 'string' && r.includes('@') && r.length <= 254)) {
    return Response.json(
      { error: '`to` contains invalid email address(es)' },
      { status: 400 }
    );
  }

  // Validate subject
  if (typeof subject !== 'string' || subject.trim().length === 0 || subject.length > 998) {
    return Response.json(
      { error: '`subject` must be a non-empty string under 998 characters (RFC 2822)' },
      { status: 400 }
    );
  }

  // Validate html — must be a string, max 2MB
  if (typeof html !== 'string' || html.length > 2_000_000) {
    return Response.json(
      { error: '`html` must be a string under 2MB' },
      { status: 400 }
    );
  }

  // Validate optional text
  if (text !== undefined && (typeof text !== 'string' || text.length > 500_000)) {
    return Response.json(
      { error: '`text` must be a string under 500KB' },
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

  // Plan gates — API access feature + monthly email quota
  const [apiGate, emailGate] = await Promise.all([
    checkPlanLimit({ workspaceId: apiKey.workspaceId, feature: 'apiAccess' }),
    checkUsageLimit({ workspaceId: apiKey.workspaceId, type: 'emails', requested: 1 }),
  ]);
  if (!apiGate.allowed) {
    return Response.json(apiGate.toResponse(), { status: 402 });
  }
  if (!emailGate.allowed) {
    return Response.json(emailGate.toResponse(), { status: 402 });
  }

  const fromName = workspace.fromName ?? workspace.name;
  const result = await sendEmail({
    to: toArray as string[],
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
