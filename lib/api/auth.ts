/**
 * lib/api/auth.ts
 *
 * API key resolution for v1 routes.
 *
 * Incoming requests must include:
 *   Authorization: Bearer <api_key>
 *
 * Key format: wee_<32 random hex chars>
 * Only the bcrypt hash is stored — the plaintext key is shown once at creation.
 *
 * Returns the resolved ApiKey row (with workspaceId) or null if invalid.
 */

import { NextRequest } from 'next/server';
import { compare } from 'bcryptjs';
import { db } from '@/lib/db/client';

export interface ResolvedApiKey {
  id: string;
  workspaceId: string;
  name: string;
}

/**
 * Extracts and validates the Bearer token from the request.
 * Updates lastUsedAt on success (fire-and-forget, non-blocking).
 *
 * Performance: We pre-filter by keyPrefix (first 12 chars) so bcrypt compare
 * is only called on the 1-2 rows that actually match — not the entire table.
 *
 * Security: We never return which specific validation step failed to prevent
 * oracle attacks. All failures return null (caller returns 401).
 */
export async function resolveApiKey(
  req: NextRequest
): Promise<ResolvedApiKey | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const rawKey = authHeader.slice(7).trim();
  // All keys start with wee_ — reject anything else immediately
  if (!rawKey.startsWith('wee_') || rawKey.length < 36) return null;

  // The prefix is the first 12 chars — use it to narrow DB lookup to at most
  // a handful of rows (prefix collision probability is negligible)
  const prefix = rawKey.slice(0, 12);

  const candidates = await db.apiKey.findMany({
    where: { keyPrefix: prefix },
    select: { id: true, workspaceId: true, name: true, keyHash: true },
    take: 5, // safety cap — a workspace won't have 5 keys sharing a prefix
  });

  // No candidates → fast reject without running bcrypt at all
  if (candidates.length === 0) return null;

  for (const candidate of candidates) {
    const valid = await compare(rawKey, candidate.keyHash);
    if (valid) {
      // Update lastUsedAt non-blocking
      db.apiKey
        .update({ where: { id: candidate.id }, data: { lastUsedAt: new Date() } })
        .catch(() => {});

      return { id: candidate.id, workspaceId: candidate.workspaceId, name: candidate.name };
    }
  }

  return null;
}

/**
 * Standard 401 response for missing/invalid API keys.
 */
export function unauthorizedResponse() {
  return Response.json(
    { error: 'Unauthorized', message: 'Valid API key required. Pass it as: Authorization: Bearer <key>' },
    { status: 401 }
  );
}
