'use client';

/**
 * app/dashboard/forms/new/page.tsx
 * Form builder — create a new lead capture form.
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createForm } from '@/lib/forms/actions';

export default function NewFormPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  // Form state
  const [name,           setName]           = useState('');
  const [headline,       setHeadline]       = useState('Join the newsletter');
  const [description,    setDescription]    = useState('');
  const [buttonText,     setButtonText]     = useState('Subscribe');
  const [doubleOptIn,    setDoubleOptIn]    = useState(true);
  const [confirmSubject, setConfirmSubject] = useState('Please confirm your subscription');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('Thanks! Check your email to confirm.');
  const [redirectUrl,    setRedirectUrl]    = useState('');

  function handleSave() {
    if (!name.trim()) { setError('Form name is required'); return; }
    setError('');
    startTransition(async () => {
      const result = await createForm({
        name, headline, description, buttonText, doubleOptIn,
        confirmSubject, confirmMessage, successMessage,
        redirectUrl: redirectUrl.trim() || undefined,
      });
      if (result.success) {
        router.push('/dashboard/forms');
      } else {
        setError(result.error ?? 'Failed to create form');
      }
    });
  }

  const inputStyle = {
    border:     '1.5px solid var(--sidebar-border)',
    background: 'var(--surface-card)',
    color:      'var(--text-primary)',
    borderRadius: 8,
    padding:    '8px 12px',
    fontSize:   14,
    width:      '100%',
    outline:    'none',
  } as const;

  function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
    return (
      <div
        className="rounded-xl p-5 space-y-4"
        style={{ background: 'var(--surface-card)', border: '1px solid var(--sidebar-border)' }}
      >
        <div className="mb-1">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</p>
          {desc && <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{desc}</p>}
        </div>
        {children}
      </div>
    );
  }

  function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <div>
        <label className="block mb-1.5 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </label>
        {children}
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem', maxWidth: 860, margin: '0 auto' }}>

      {/* Left: Builder */}
      <div className="space-y-4">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', letterSpacing: '-0.03em' }}
          >
            New form
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Build your opt-in form — embed it anywhere
          </p>
        </div>

        {/* Content */}
        <Section title="Form content" desc="What subscribers see on the form page">
          <Field label="Headline">
            <input
              style={inputStyle}
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Join the newsletter"
              onFocus={(e) => (e.target.style.borderColor = 'var(--brand)')}
              onBlur={(e)  => (e.target.style.borderColor = 'var(--sidebar-border)')}
            />
          </Field>
          <Field label="Description (optional)">
            <textarea
              style={{ ...inputStyle, resize: 'none' }}
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Get weekly insights delivered to your inbox."
              onFocus={(e) => (e.target.style.borderColor = 'var(--brand)')}
              onBlur={(e)  => (e.target.style.borderColor = 'var(--sidebar-border)')}
            />
          </Field>
          <Field label="Button text">
            <input
              style={inputStyle}
              value={buttonText}
              onChange={(e) => setButtonText(e.target.value)}
              placeholder="Subscribe"
              onFocus={(e) => (e.target.style.borderColor = 'var(--brand)')}
              onBlur={(e)  => (e.target.style.borderColor = 'var(--sidebar-border)')}
            />
          </Field>
        </Section>

        {/* Opt-in settings */}
        <Section title="Opt-in type" desc="Double opt-in is recommended for GDPR compliance and list quality">
          <div className="flex flex-col gap-3">
            {[
              {
                value: true,
                label: 'Double opt-in',
                desc:  'Subscriber gets a confirmation email. Confirms. Then added to your list. GDPR compliant.',
                recommended: true,
              },
              {
                value: false,
                label: 'Single opt-in',
                desc:  'Subscriber is added immediately after submitting. Faster but lower quality.',
                recommended: false,
              },
            ].map((opt) => (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => setDoubleOptIn(opt.value)}
                className="flex items-start gap-3 rounded-lg p-4 text-left transition-all"
                style={{
                  border:     `1.5px solid ${doubleOptIn === opt.value ? 'var(--brand)' : 'var(--sidebar-border)'}`,
                  background: doubleOptIn === opt.value ? 'rgba(34,197,94,0.04)' : 'none',
                }}
              >
                <div
                  className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2"
                  style={{ borderColor: doubleOptIn === opt.value ? 'var(--brand)' : 'var(--sidebar-border)' }}
                >
                  {doubleOptIn === opt.value && (
                    <div className="h-2 w-2 rounded-full" style={{ background: 'var(--brand)' }} />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{opt.label}</span>
                    {opt.recommended && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                        style={{ background: 'rgba(34,197,94,0.12)', color: 'var(--brand)' }}
                      >
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {opt.desc}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {doubleOptIn && (
            <div className="space-y-3 pt-2">
              <Field label="Confirmation email subject">
                <input
                  style={inputStyle}
                  value={confirmSubject}
                  onChange={(e) => setConfirmSubject(e.target.value)}
                  placeholder="Please confirm your subscription"
                  onFocus={(e) => (e.target.style.borderColor = 'var(--brand)')}
                  onBlur={(e)  => (e.target.style.borderColor = 'var(--sidebar-border)')}
                />
              </Field>
              <Field label="Confirmation message (optional — leave blank for default)">
                <textarea
                  style={{ ...inputStyle, resize: 'none' }}
                  rows={3}
                  value={confirmMessage}
                  onChange={(e) => setConfirmMessage(e.target.value)}
                  placeholder="Click below to confirm your subscription to our newsletter."
                  onFocus={(e) => (e.target.style.borderColor = 'var(--brand)')}
                  onBlur={(e)  => (e.target.style.borderColor = 'var(--sidebar-border)')}
                />
              </Field>
            </div>
          )}
        </Section>

        {/* After submission */}
        <Section title="After submission">
          <Field label="Success message">
            <input
              style={inputStyle}
              value={successMessage}
              onChange={(e) => setSuccessMessage(e.target.value)}
              placeholder="Thanks! Check your email to confirm."
              onFocus={(e) => (e.target.style.borderColor = 'var(--brand)')}
              onBlur={(e)  => (e.target.style.borderColor = 'var(--sidebar-border)')}
            />
          </Field>
          <Field label="Redirect URL (optional — send user here after submit)">
            <input
              style={inputStyle}
              value={redirectUrl}
              onChange={(e) => setRedirectUrl(e.target.value)}
              placeholder="https://yourdomain.com/thank-you"
              onFocus={(e) => (e.target.style.borderColor = 'var(--brand)')}
              onBlur={(e)  => (e.target.style.borderColor = 'var(--sidebar-border)')}
            />
          </Field>
        </Section>
      </div>

      {/* Right: Sidebar */}
      <div className="space-y-4">
        <div
          className="sticky top-8 rounded-xl p-5 space-y-4"
          style={{ background: 'var(--surface-card)', border: '1px solid var(--sidebar-border)' }}
        >
          <Field label="Form name (internal)">
            <input
              style={inputStyle}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Homepage subscribe form"
              onFocus={(e) => (e.target.style.borderColor = 'var(--brand)')}
              onBlur={(e)  => (e.target.style.borderColor = 'var(--sidebar-border)')}
            />
          </Field>

          {/* Preview */}
          <div
            className="rounded-xl p-4"
            style={{ background: 'var(--surface-app)', border: '1px solid var(--sidebar-border)' }}
          >
            <p className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
              Preview
            </p>
            <p className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
              {headline || 'Headline'}
            </p>
            {description && (
              <p className="text-xs mb-3 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {description}
              </p>
            )}
            <div
              className="w-full rounded-lg px-3 py-2 text-xs mb-2"
              style={{ border: '1px solid var(--sidebar-border)', color: 'var(--text-tertiary)', background: 'var(--surface-card)' }}
            >
              Your email address
            </div>
            <div
              className="w-full rounded-lg px-3 py-2 text-xs text-center font-semibold text-white"
              style={{ background: 'var(--brand)' }}
            >
              {buttonText || 'Subscribe'}
            </div>
          </div>

          {error && (
            <p className="text-xs rounded-lg px-3 py-2 bg-red-50 text-red-600 border border-red-200">{error}</p>
          )}

          <button
            onClick={handleSave}
            disabled={isPending || !name.trim()}
            className="w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40"
            style={{ background: 'var(--brand)', boxShadow: '0 2px 8px rgba(34,197,94,0.22)' }}
          >
            {isPending ? 'Creating…' : 'Create form'}
          </button>

          <button
            onClick={() => router.push('/dashboard/forms')}
            className="w-full rounded-lg py-2 text-xs"
            style={{ color: 'var(--text-secondary)', background: 'none' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
