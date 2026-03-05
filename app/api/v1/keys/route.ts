/**
 * /api/v1/keys
 *
 * GET  — List all API keys for the workspace (metadata only, never raw key)
 * POST — Generate a new API key (raw key returned ONCE, then hashed)
 *
 * Note: Key deletion is handled via DELETE /api/v1/keys/[id] (see [...id]/route.ts)
 *
 * These routes authenticate via the session cookie (dashboard use),
 * NOT via API key — you can't use an API key to manage API keys.
 */

import { NextRequest } from 'next/server';
import { randomBytes } from 'crypto';
import { hash } from 'bcryptjs';
import { db } from '@/lib/db/client';
import { auth } from '@/auth';

async function getWorkspaceId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.workspaceId ?? null;
}

// GET /api/v1/keys — list keys (no raw values)
export async function GET() {
  const workspaceId = await getWorkspaceId();
  if (!workspaceId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const keys = await db.apiKey.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      lastUsedAt: true,
      createdAt: true,
    },
  });

  return Response.json({ data: keys });
}

// POST /api/v1/keys — create key
export async function POST(req: NextRequest) {
  const workspaceId = await getWorkspaceId();
  if (!workspaceId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let name: string;
  try {
    const body = await req.json();
    name = (body.name as string)?.trim();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!name || name.length < 1 || name.length > 64) {
    return Response.json(
      { error: 'name is required and must be 1-64 characters' },
      { status: 400 }
    );
  }

  // Generate: wee_ prefix + 32 random hex chars = 36 chars total
  const rawKey = 'wee_' + randomBytes(16).toString('hex');
  const keyPrefix = rawKey.slice(0, 12); // wee_XXXXXXXX
  const keyHash = await hash(rawKey, 10);

  const apiKey = await db.apiKey.create({
    data: { workspaceId, name, keyHash, keyPrefix },
    select: { id: true, name: true, keyPrefix: true, createdAt: true },
  });

  track('api_key_created', { workspaceId, properties: { keyId: apiKey.id, name } });

  // Return the raw key ONCE — it cannot be recovered after this response
  return Response.json(
    {
      data: {
        ...apiKey,
        key: rawKey, // shown once only
      },
      message: 'Store this key securely — it will not be shown again.',
    },
    { status: 201 }
  );
}
