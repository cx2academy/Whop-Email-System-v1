'use client';

/**
 * app/dashboard/settings/email-provider.tsx
 *
 * "Connect Email Provider" settings card.
 *
 * States:
 *   IDLE        — shows provider selector + credential inputs
 *   VALIDATING  — spinner while POST /api/email/connect is in-flight
 *   CONNECTED   — shows green banner with provider name + disconnect button
 *   ERROR       — shows inline error, keeps inputs populated
 *
 * Security:
 *   - Credentials are POSTed directly to /api/email/connect (server route).
 *   - The server validates, encrypts, and stores. The key never comes back.
 *   - This component never holds a decrypted key after the POST completes.
 *   - isAdmin prop gates the form — non-admins see read-only status only.
 */

import { useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProviderType = 'RESEND' | 'SES' | 'SENDGRID';

export interface CurrentProvider {
  provider: ProviderType;
  isVerified: boolean;
  connectedAt: string; // ISO string
}

interface Props {
  isAdmin: boolean;
  current: CurrentProvider | null;
}

// ---------------------------------------------------------------------------
// Provider metadata (labels, descriptions, links, field configs)
// ---------------------------------------------------------------------------

const PROVIDERS: Record<
  ProviderType,
  {
    label: string;
    description: string;
    docsUrl: string;
    color: string;        // Tailwind bg class for the badge
    textColor: string;    // Tailwind text class for the badge
  }
> = {
  RESEND: {
    label: 'Resend',
    description: 'Simple email API. Best for most users — fast setup, excellent deliverability.',
    docsUrl: 'https://resend.com/docs/api-reference/api-keys/create-api-key',
    color: 'bg-violet-100 dark:bg-violet-950',
    textColor: 'text-violet-700 dark:text-violet-300',
  },
  SES: {
    label: 'Amazon SES',
    description: 'AWS email service. Cheapest at scale — ideal if you already use AWS.',
    docsUrl: 'https://docs.aws.amazon.com/ses/latest/dg/setting-up.html',
    color: 'bg-orange-100 dark:bg-orange-950',
    textColor: 'text-orange-700 dark:text-orange-300',
  },
  SENDGRID: {
    label: 'SendGrid',
    description: 'Twilio SendGrid. Best-in-class analytics and deliverability features.',
    docsUrl: 'https://docs.sendgrid.com/ui/account-and-settings/api-keys',
    color: 'bg-blue-100 dark:bg-blue-950',
    textColor: 'text-blue-700 dark:text-blue-300',
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Inline spinner */
function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin text-current"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

/** Password-style input that can toggle visibility */
function SecretInput({
  id,
  name,
  placeholder,
  value,
  onChange,
  disabled,
}: {
  id: string;
  name: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={visible ? 'text' : 'password'}
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        disabled={disabled}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground focus:outline-none disabled:pointer-events-none"
        aria-label={visible ? 'Hide' : 'Show'}
      >
        {visible ? (
          // eye-off icon
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round" />
          </svg>
        ) : (
          // eye icon
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
    </div>
  );
}

/** Provider selector button */
function ProviderButton({
  type,
  selected,
  onClick,
  disabled,
}: {
  type: ProviderType;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  const meta = PROVIDERS[type];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        selected
          ? 'border-primary bg-primary/5 ring-1 ring-primary'
          : 'border-border bg-background hover:border-border/80 hover:bg-muted/40',
      ].join(' ')}
    >
      <span className="flex w-full items-center justify-between">
        <span className="text-sm font-medium text-foreground">{meta.label}</span>
        {selected && (
          <svg className="h-4 w-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )}
      </span>
      <span className="text-xs text-muted-foreground leading-snug">{meta.description}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function EmailProviderSettings({ isAdmin, current: initialCurrent }: Props) {
  // --- State ---
  const [current, setCurrent] = useState<CurrentProvider | null>(initialCurrent);
  const [selectedProvider, setSelectedProvider] = useState<ProviderType>(
    initialCurrent?.provider ?? 'RESEND'
  );

  // Credential fields
  const [apiKey, setApiKey] = useState('');
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [region, setRegion] = useState('us-east-1');

  // UI state
  const [loading, setLoading] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // ---------------------------------------------------------------------------
  // Connect
  // ---------------------------------------------------------------------------
  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);

    // Build payload depending on selected provider
    let payload: Record<string, string>;
    if (selectedProvider === 'SES') {
      payload = { provider: 'SES', accessKeyId, secretAccessKey, region };
    } else {
      payload = { provider: selectedProvider, apiKey };
    }

    try {
      const res = await fetch('/api/email/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as
        | { success: true; provider: ProviderType; message: string }
        | { success: false; error: string; fieldErrors?: Record<string, string[]> };

      if (!data.success) {
        // Map Zod field errors to flat strings
        if ('fieldErrors' in data && data.fieldErrors) {
          const flat: Record<string, string> = {};
          for (const [k, v] of Object.entries(data.fieldErrors)) {
            if (v?.length) flat[k] = v[0];
          }
          setFieldErrors(flat);
        }
        setError(data.error);
        return;
      }

      // Success — update connected state, clear inputs
      setCurrent({
        provider: data.provider,
        isVerified: true,
        connectedAt: new Date().toISOString(),
      });
      setApiKey('');
      setAccessKeyId('');
      setSecretAccessKey('');
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Disconnect
  // ---------------------------------------------------------------------------
  async function handleDisconnect() {
    if (!confirm('Disconnect your email provider? Emails will fall back to the system default.')) return;
    setDisconnecting(true);
    setError(null);

    try {
      const res = await fetch('/api/email/connect', { method: 'DELETE' });
      if (res.ok) {
        setCurrent(null);
        setApiKey('');
        setAccessKeyId('');
        setSecretAccessKey('');
      } else {
        const data = await res.json() as { error?: string };
        setError(data.error ?? 'Failed to disconnect. Try again.');
      }
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setDisconnecting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Connected state — show status banner + disconnect button
  // ---------------------------------------------------------------------------
  if (current) {
    const meta = PROVIDERS[current.provider];
    return (
      <div className="space-y-4">
        {/* Status banner */}
        <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-950/30">
          {/* Check icon */}
          <svg className="mt-0.5 h-5 w-5 shrink-0 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              {meta.label} connected
            </p>
            <p className="text-xs text-green-600 dark:text-green-400">
              Verified and active · Connected {formatDate(current.connectedAt)}
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${meta.color} ${meta.textColor}`}>
            {meta.label}
          </span>
        </div>

        {/* Info row */}
        <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          All outgoing emails from this workspace now route through your{' '}
          <span className="font-medium text-foreground">{meta.label}</span> account.
          Your API key is encrypted at rest and never exposed.
        </div>

        {/* Disconnect */}
        {isAdmin && (
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="flex items-center gap-2 rounded-md border border-destructive/40 px-4 py-2 text-sm text-destructive transition-colors hover:border-destructive hover:bg-destructive/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {disconnecting && <Spinner />}
            {disconnecting ? 'Disconnecting…' : 'Disconnect provider'}
          </button>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // No connection — render connect form
  // ---------------------------------------------------------------------------

  if (!isAdmin) {
    return (
      <p className="text-sm text-muted-foreground">
        No email provider connected. Only workspace Admins and Owners can connect one.
      </p>
    );
  }

  return (
    <form onSubmit={handleConnect} className="space-y-5">

      {/* Provider selector */}
      <div>
        <p className="mb-2 text-sm font-medium text-foreground">Choose provider</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {(Object.keys(PROVIDERS) as ProviderType[]).map((type) => (
            <ProviderButton
              key={type}
              type={type}
              selected={selectedProvider === type}
              onClick={() => {
                setSelectedProvider(type);
                setError(null);
                setFieldErrors({});
              }}
              disabled={loading}
            />
          ))}
        </div>
      </div>

      {/* Credential fields — conditional on provider */}
      <div className="space-y-3">
        {selectedProvider === 'SES' ? (
          <>
            <div>
              <label htmlFor="accessKeyId" className="mb-1 block text-sm font-medium text-foreground">
                AWS Access Key ID
              </label>
              <SecretInput
                id="accessKeyId"
                name="accessKeyId"
                placeholder="AKIAIOSFODNN7EXAMPLE"
                value={accessKeyId}
                onChange={setAccessKeyId}
                disabled={loading}
              />
              {fieldErrors.accessKeyId && (
                <p className="mt-1 text-xs text-destructive">{fieldErrors.accessKeyId}</p>
              )}
            </div>

            <div>
              <label htmlFor="secretAccessKey" className="mb-1 block text-sm font-medium text-foreground">
                AWS Secret Access Key
              </label>
              <SecretInput
                id="secretAccessKey"
                name="secretAccessKey"
                placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                value={secretAccessKey}
                onChange={setSecretAccessKey}
                disabled={loading}
              />
              {fieldErrors.secretAccessKey && (
                <p className="mt-1 text-xs text-destructive">{fieldErrors.secretAccessKey}</p>
              )}
            </div>

            <div>
              <label htmlFor="region" className="mb-1 block text-sm font-medium text-foreground">
                AWS Region
              </label>
              <select
                id="region"
                name="region"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                disabled={loading}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="us-east-1">us-east-1 — US East (N. Virginia)</option>
                <option value="us-east-2">us-east-2 — US East (Ohio)</option>
                <option value="us-west-1">us-west-1 — US West (N. California)</option>
                <option value="us-west-2">us-west-2 — US West (Oregon)</option>
                <option value="eu-west-1">eu-west-1 — Europe (Ireland)</option>
                <option value="eu-west-2">eu-west-2 — Europe (London)</option>
                <option value="eu-central-1">eu-central-1 — Europe (Frankfurt)</option>
                <option value="ap-southeast-1">ap-southeast-1 — Asia Pacific (Singapore)</option>
                <option value="ap-southeast-2">ap-southeast-2 — Asia Pacific (Sydney)</option>
                <option value="ap-northeast-1">ap-northeast-1 — Asia Pacific (Tokyo)</option>
              </select>
              {fieldErrors.region && (
                <p className="mt-1 text-xs text-destructive">{fieldErrors.region}</p>
              )}
            </div>
          </>
        ) : (
          <div>
            <label htmlFor="apiKey" className="mb-1 block text-sm font-medium text-foreground">
              {selectedProvider === 'RESEND' ? 'Resend API key' : 'SendGrid API key'}
            </label>
            <SecretInput
              id="apiKey"
              name="apiKey"
              placeholder={
                selectedProvider === 'RESEND'
                  ? 're_xxxxxxxxxxxxxxxxxxxxxxxxxxxx'
                  : 'SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
              }
              value={apiKey}
              onChange={setApiKey}
              disabled={loading}
            />
            {fieldErrors.apiKey && (
              <p className="mt-1 text-xs text-destructive">{fieldErrors.apiKey}</p>
            )}
            <p className="mt-1.5 text-xs text-muted-foreground">
              Need a key?{' '}
              <a
                href={PROVIDERS[selectedProvider].docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-foreground"
              >
                {PROVIDERS[selectedProvider].label} docs →
              </a>
            </p>
          </div>
        )}
      </div>

      {/* What this does */}
      <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground text-sm">What happens when you connect</p>
        <p>1. Your key is validated against the provider API — no email is sent.</p>
        <p>2. The key is encrypted with AES-256-GCM and stored. The plaintext is never saved.</p>
        <p>3. All emails from this workspace route through your account going forward.</p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-destructive" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={
          loading ||
          (selectedProvider === 'SES'
            ? !accessKeyId.trim() || !secretAccessKey.trim()
            : !apiKey.trim())
        }
        className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading && <Spinner />}
        {loading ? 'Validating & connecting…' : `Connect ${PROVIDERS[selectedProvider].label}`}
      </button>
    </form>
  );
}
