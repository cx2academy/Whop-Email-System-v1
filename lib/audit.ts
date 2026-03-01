/**
 * lib/audit.ts
 *
 * Lightweight audit logging for critical workspace actions.
 *
 * Events are written to console in a structured JSON format — captured
 * by Vercel's log drain and searchable via your log provider.
 *
 * For full audit trail persistence, extend this to write to a database
 * table (AuditLog model) in a future iteration.
 *
 * Audited events:
 *   - workspace.settings_updated
 *   - campaign.created / sent / deleted
 *   - contact.unsubscribed
 *   - sync.triggered
 *   - auth.login / auth.register
 */

type AuditAction =
  | "workspace.settings_updated"
  | "campaign.created"
  | "campaign.sent"
  | "campaign.deleted"
  | "campaign.duplicated"
  | "campaign.scheduled"
  | "contact.unsubscribed"
  | "contact.tag_added"
  | "contact.tag_removed"
  | "sync.triggered"
  | "auth.register"
  | "auth.login_success"
  | "auth.login_failed";

interface AuditEvent {
  action: AuditAction;
  workspaceId?: string;
  userId?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log a structured audit event.
 * Fire-and-forget — never throws.
 */
export function audit(event: AuditEvent): void {
  try {
    const entry = {
      type: "audit",
      timestamp: new Date().toISOString(),
      ...event,
    };

    // Structured log — captured by Vercel log drain / any log aggregator
    console.log(JSON.stringify(entry));
  } catch {
    // Audit logging must never crash the application
  }
}
