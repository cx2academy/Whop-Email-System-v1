'use client';

/**
 * app/dashboard/settings/email-provider.tsx
 *
 * Email sending settings card.
 *
 * Default state: Platform Sending is active — no setup required.
 * The system Resend key (RESEND_API_KEY env) handles all sends automatically.
 *
 * Advanced: Users can optionally connect their own provider (Resend, SES,
 * SendGrid) to route sends through their own account for full billing control.
 *
 * States:
 *   PLATFORM_ACTIVE  — no custom provider, using platform sending (default)
 *   CUSTOM_CONNECTED — workspace has a verified custom provider connected
 *   CONNECTING       — form submitting
 *   ERROR            — validation failed
 */

import { useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProviderType = 'RESEND' | 'SES' | 'SENDGRID';

export interface CurrentProvider {
  provider: ProviderType;
  isVerified: boolean;
  connectedAt: string;
}

interface Props {
  isAdmin: boolean;
  current: CurrentProvider | null;
}

// ---------------------------------------------------------------------------
// Provider metadata
// ---------------------------------------------------------------------------

const PROVIDERS: Record<
  ProviderType,
  { label: string; description: string; docsUrl: string }
> = {
  RESEND: {
    label: 'Resend',
    description: 'Fast setup, excellent deliverability. Best for most users.',
    docsUrl: 'https://resend.com/docs/api-reference/api-keys/create-api-key',
  },
  SES: {
    label: 'Amazon SES',
    description: 'Cheapest at scale — ideal if you already use AWS.',
    docsUrl: 'https://docs.aws.amazon.com/ses/latest/dg/setting-up.html',
  },
  SENDGRID: {
    label: 'SendGrid',
    description: 'Twilio SendGrid. Best-in-class analytics and deliverability.',
    docsUrl: 'https://docs.sendgrid.com/ui/account-and-settings/api-keys',
  },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function SecretInput({
  id, name, placeholder, value, onChange, disabled,
}: {
  id: string; name: string; placeholder: string; value: string;
  onChange: (v: string) => void; disabled: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        autoComplete="off"
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        tabIndex={-1}
      >
        {show ? (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        )}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function EmailProviderSettings({ isAdmin, current }: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ProviderType>('RESEND');
  const [apiKey, setApiKey] = useState('');
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [region, setRegion] = useState('us-east-1');
  const [loading, setLoading] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [connectedProvider, setConnectedProvider] = useState<CurrentProvider | null>(current);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    const body =
      selectedProvider === 'SES'
        ? { provider: 'SES', accessKeyId, secretAccessKey, region }
        : { provider: selectedProvider, apiKey };

    try {
      const res = await fetch('/api/email/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.fieldErrors) setFieldErrors(data.fieldErrors);
        else setError(data.error ?? 'Connection failed. Check your credentials.');
      } else {
        setConnectedProvider({
          provider: selectedProvider,
          isVerified: true,
          connectedAt: new Date().toISOString(),
        });
        setShowAdvanced(false);
        setApiKey('');
        setAccessKeyId('');
        setSecretAccessKey('');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm('Remove your custom provider? Sending will fall back to the platform provider.')) return;
    setDisconnecting(true);
    setError(null);
    try {
      const res = await fetch('/api/email/connect', { method: 'DELETE' });
      if (res.ok) {
        setConnectedProvider(null);
        setShowAdvanced(false);
      } else {
        setError('Failed to disconnect. Try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setDisconnecting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render: Custom provider connected
  // ---------------------------------------------------------------------------

  if (connectedProvider) {
    const meta = PROVIDERS[connectedProvider.provider];
    const connectedDate = new Date(connectedProvider.connectedAt).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });

    return (
      <div className="space-y-4">
        {/* Custom provider active banner */}
        <div
          className="flex items-start gap-3 rounded-lg p-4"
          style={{ background: 'var(--surface-card)', border: '0.5px solid var(--sidebar-border)' }}
        >
          <div
            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
            style={{ background: 'rgba(34,197,94,0.12)' }}
          >
            <svg className="h-4 w-4" style={{ color: 'var(--brand)' }} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {meta.label} connected
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              All outbound emails route through your {meta.label} account · Connected {connectedDate}
            </p>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {isAdmin && (
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="flex items-center gap-2 rounded-md border border-destructive/40 px-3 py-1.5 text-xs text-destructive transition-colors hover:border-destructive hover:bg-destructive/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {disconnecting && <Spinner />}
            {disconnecting ? 'Removing…' : 'Remove custom provider'}
          </button>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Platform sending active (default — no custom provider)
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-5">

      {/* Platform sending — active by default */}
      <div
        className="flex items-start gap-3 rounded-lg p-4"
        style={{ background: 'var(--surface-card)', border: '0.5px solid var(--sidebar-border)' }}
      >
        <div
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
          style={{ background: 'rgba(34,197,94,0.12)' }}
        >
          <svg className="h-4 w-4" style={{ color: 'var(--brand)' }} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Platform sending active
            </p>
            <span
              className="rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ background: 'rgba(34,197,94,0.12)', color: 'var(--brand)' }}
            >
              No setup required
            </span>
          </div>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Your emails are sent through our platform infrastructure. You don&apos;t need to configure anything — just set your sender email in General settings and you&apos;re ready to send.
          </p>
        </div>
      </div>

      {/* Advanced / BYOK toggle */}
      {isAdmin && (
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-medium transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <svg
              className="h-3.5 w-3.5 transition-transform"
              style={{ transform: showAdvanced ? 'rotate(90deg)' : 'none' }}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            Advanced: use your own sending provider
          </button>

          {showAdvanced && (
            <div
              className="mt-4 space-y-5 rounded-lg p-5"
              style={{ border: '0.5px solid var(--sidebar-border)' }}
            >
              <div>
                <p className="text-sm font-medium mb-0.5" style={{ color: 'var(--text-primary)' }}>
                  Bring your own provider
                </p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Connect your own Resend, AWS SES, or SendGrid account. All emails from this workspace will route through your account, giving you full billing control and access to your own analytics.
                </p>
              </div>

              <form onSubmit={handleConnect} className="space-y-4">
                {/* Provider selector */}
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(PROVIDERS) as ProviderType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => { setSelectedProvider(type); setError(null); setFieldErrors({}); }}
                      disabled={loading}
                      className="rounded-lg border px-3 py-2.5 text-left text-xs transition-all disabled:cursor-not-allowed disabled:opacity-50"
                      style={{
                        borderColor: selectedProvider === type ? 'var(--brand)' : 'var(--sidebar-border)',
                        background: selectedProvider === type ? 'rgba(34,197,94,0.06)' : 'transparent',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <span className="font-semibold block">{PROVIDERS[type].label}</span>
                      <span className="mt-0.5 block leading-tight" style={{ color: 'var(--text-secondary)' }}>
                        {PROVIDERS[type].description}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Credential fields */}
                {selectedProvider === 'SES' ? (
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                        AWS Access Key ID
                      </label>
                      <SecretInput id="accessKeyId" name="accessKeyId" placeholder="AKIAIOSFODNN7EXAMPLE"
                        value={accessKeyId} onChange={setAccessKeyId} disabled={loading} />
                      {fieldErrors.accessKeyId && <p className="mt-1 text-xs text-destructive">{fieldErrors.accessKeyId[0]}</p>}
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                        AWS Secret Access Key
                      </label>
                      <SecretInput id="secretAccessKey" name="secretAccessKey" placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                        value={secretAccessKey} onChange={setSecretAccessKey} disabled={loading} />
                      {fieldErrors.secretAccessKey && <p className="mt-1 text-xs text-destructive">{fieldErrors.secretAccessKey[0]}</p>}
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                        AWS Region
                      </label>
                      <select value={region} onChange={(e) => setRegion(e.target.value)} disabled={loading}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
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
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                      {selectedProvider === 'RESEND' ? 'Resend API key' : 'SendGrid API key'}
                    </label>
                    <SecretInput
                      id="apiKey" name="apiKey"
                      placeholder={selectedProvider === 'RESEND' ? 're_xxxxxxxxxxxxxxxxxxxxxxxxxxxx' : 'SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'}
                      value={apiKey} onChange={setApiKey} disabled={loading}
                    />
                    {fieldErrors.apiKey && <p className="mt-1 text-xs text-destructive">{fieldErrors.apiKey[0]}</p>}
                    <p className="mt-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      Need a key?{' '}
                      <a href={PROVIDERS[selectedProvider].docsUrl} target="_blank" rel="noopener noreferrer"
                        className="underline underline-offset-2 hover:text-foreground">
                        {PROVIDERS[selectedProvider].label} docs →
                      </a>
                    </p>
                  </div>
                )}

                {error && (
                  <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5">
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-destructive" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || (selectedProvider === 'SES' ? !accessKeyId.trim() || !secretAccessKey.trim() : !apiKey.trim())}
                  className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ background: 'var(--brand)' }}
                >
                  {loading && <Spinner />}
                  {loading ? 'Validating…' : `Connect ${PROVIDERS[selectedProvider].label}`}
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
