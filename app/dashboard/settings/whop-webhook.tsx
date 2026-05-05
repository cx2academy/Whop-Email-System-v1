'use client';

/**
 * app/dashboard/settings/whop-webhook.tsx
 *
 * Whop Webhook Integration card.
 * Shows the user their unique webhook URL and lets them save their webhook secret.
 */

import { useState } from 'react';
import { saveWebhookSecret } from './settings-actions';

interface Props {
  workspaceId: string;
  hasSecret: boolean;
  appUrl: string;
}

export function WhopWebhookSettings({ workspaceId, hasSecret, appUrl }: Props) {
  const webhookUrl = `${appUrl}/api/whop/webhook/${workspaceId}`;
  const [copied, setCopied] = useState(false);
  const [secret, setSecret] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function copyUrl() {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSave() {
    if (!secret.trim()) return;
    setSaving(true);
    setError(null);
    const result = await saveWebhookSecret(secret.trim());
    setSaving(false);
    if (result.success) {
      setSaved(true);
      setSecret('');
      setTimeout(() => setSaved(false), 3000);
    } else {
      setError(result.error ?? 'Failed to save');
    }
  }

  return (
    <div className="space-y-5">

      {/* Step 1 — Copy URL */}
      <div>
        <p className="mb-1 text-sm font-medium text-foreground">
          Step 1 — Copy your webhook URL
        </p>
        <p className="mb-2 text-xs text-muted-foreground">
          Paste this into Whop Dashboard → Settings → Webhooks → Add Endpoint
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-md border border-border bg-muted px-3 py-2 text-xs text-muted-foreground truncate">
            {webhookUrl}
          </code>
          <button
            onClick={copyUrl}
            className="shrink-0 rounded-md border border-border px-3 py-2 text-xs font-medium hover:bg-muted transition-colors"
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Step 2 — Events to select */}
      <div>
        <p className="mb-1 text-sm font-medium text-foreground">
          Step 2 — Select these events in Whop
        </p>
        <div className="flex gap-2">
          {['membership.went_valid', 'payment.succeeded'].map((e) => (
            <span key={e} className="rounded-full bg-muted px-3 py-1 text-xs font-mono text-muted-foreground">
              {e}
            </span>
          ))}
        </div>
      </div>

      {/* Step 3 — Paste signing secret */}
      <div>
        <p className="mb-1 text-sm font-medium text-foreground">
          Step 3 — Paste your signing secret
        </p>
        <p className="mb-2 text-xs text-muted-foreground">
          After creating the webhook in Whop, they'll show you a signing secret. Paste it here.
        </p>
        <div className="flex items-center gap-2">
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder={hasSecret ? '••••••••••••••••  (already saved — paste to update)' : 'whsec_...'}
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={handleSave}
            disabled={saving || !secret.trim()}
            className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
          </button>
        </div>
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
        {hasSecret && !saved && (
          <p className="mt-1 text-xs text-green-600 dark:text-green-400">
            ✓ Webhook secret is configured — purchases will be automatically attributed
          </p>
        )}
      </div>

    </div>
  );
}
