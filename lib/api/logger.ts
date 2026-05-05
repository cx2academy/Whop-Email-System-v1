/**
 * lib/api/logger.ts
 *
 * Logs each v1 API call to the ApiLog table.
 * Call logApiRequest() at the end of each route handler.
 * Non-blocking — errors are swallowed so logging never breaks responses.
 */

import { db } from '@/lib/db/client';

interface ApiLogEntry {
  apiKeyId: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
}

export function logApiRequest(entry: ApiLogEntry): void {
  // Fire-and-forget — never await this
  db.apiLog
    .create({ data: entry })
    .catch((err) => console.warn('[api/logger] Failed to write log:', err));
}
