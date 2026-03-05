/**
 * lib/telemetry.ts
 *
 * Lightweight behavioral event tracking for analytics and future ML.
 *
 * Design principles:
 *   - Fire-and-forget: track() never awaits, never throws, never blocks a request
 *   - Append-only: events are never updated or deleted
 *   - Flat schema: properties stored as JSON string for flexible ML feature extraction
 *   - No external service: events go straight to Neon (same DB, no extra latency/cost)
 *
 * Tracked events (snake_case):
 *   first_send_completed   — user sends their first email
 *   campaign_created       — any new campaign is created
 *   onboarding_started     — new user registers
 *   onboarding_abandoned   — user dismisses onboarding checklist before completing
 *   api_key_created        — new API key generated
 *
 * Future ML notes:
 *   - Export: SELECT * FROM telemetry_events WHERE created_at > NOW() - INTERVAL '90 days'
 *   - Features: time_to_first_send, campaigns_per_day, api_usage_rate
 *   - Labels: churn (no send in 30d), power_user (>10 campaigns)
 *   - The properties JSON field is intentionally open — add any signal that may be
 *     useful later without schema migrations.
 */

import { db } from '@/lib/db/client';

export type TelemetryEventName =
  | 'first_send_completed'
  | 'campaign_created'
  | 'onboarding_started'
  | 'onboarding_abandoned'
  | 'api_key_created';

interface TrackOptions {
  workspaceId: string;
  userId?: string;
  properties?: Record<string, unknown>;
}

/**
 * Track a behavioral event. Fire-and-forget — never await this.
 * Errors are swallowed so tracking never impacts the user experience.
 */
export function track(event: TelemetryEventName, options: TrackOptions): void {
  const { workspaceId, userId, properties = {} } = options;

  db.telemetryEvent
    .create({
      data: {
        workspaceId,
        userId: userId ?? null,
        event,
        properties: JSON.stringify({
          ...properties,
          // Always include server timestamp as a feature
          _ts: Date.now(),
        }),
      },
    })
    .catch((err) => {
      // Telemetry must never break the main flow
      console.warn('[telemetry] Failed to track event:', event, err?.message);
    });
}
