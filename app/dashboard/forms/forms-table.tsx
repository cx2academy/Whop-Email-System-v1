'use client';

/**
 * app/dashboard/forms/forms-table.tsx
 * Table of lead capture forms with embed code modal.
 */

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { deleteForm } from '@/lib/forms/actions';
import { ExternalLinkIcon, CodeIcon, Trash2Icon, PencilIcon } from 'lucide-react';

interface FormRow {
  id:          string;
  name:        string;
  slug:        string;
  headline:    string;
  isActive:    boolean;
  doubleOptIn: boolean;
  submissions: number;
  createdAt:   string;
}

interface Props {
  forms:   FormRow[];
  isAdmin: boolean;
}

function EmbedModal({ form, onClose }: { form: FormRow; onClose: () => void }) {
  const [copied, setCopied] = useState<string | null>(null);
  const appUrl  = typeof window !== 'undefined' ? window.location.origin : 'https://app.revtray.com';
  const formUrl = `${appUrl}/forms/${form.slug}`;

  const embedScript = `<script src="${appUrl}/embed.js" data-form="${form.id}" async></script>`;
  const iframeCode  = `<iframe src="${formUrl}" width="100%" height="320" frameborder="0" style="border-radius:12px;"></iframe>`;

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-6 space-y-5"
        style={{ background: 'var(--surface-card)', border: '1px solid var(--sidebar-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            Embed — {form.name}
          </h2>
          <button onClick={onClose} className="text-xl leading-none" style={{ color: 'var(--text-tertiary)' }}>×</button>
        </div>

        {/* Direct link */}
        <div>
          <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
            Direct link
          </p>
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-2.5"
            style={{ background: 'var(--surface-app)', border: '1px solid var(--sidebar-border)' }}
          >
            <code className="flex-1 text-xs truncate" style={{ color: 'var(--text-primary)' }}>{formUrl}</code>
            <button
              onClick={() => copy(formUrl, 'link')}
              className="shrink-0 rounded px-2 py-1 text-xs font-medium transition-colors"
              style={{ background: copied === 'link' ? 'rgba(34,197,94,0.12)' : 'var(--sidebar-border)', color: copied === 'link' ? '#16A34A' : 'var(--text-secondary)' }}
            >
              {copied === 'link' ? 'Copied!' : 'Copy'}
            </button>
            <a href={formUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-tertiary)' }}>
              <ExternalLinkIcon className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Iframe embed */}
        <div>
          <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
            iFrame embed
          </p>
          <div
            className="rounded-lg px-3 py-2.5"
            style={{ background: 'var(--surface-app)', border: '1px solid var(--sidebar-border)' }}
          >
            <code className="block text-xs break-all mb-2" style={{ color: 'var(--text-primary)', lineHeight: 1.6 }}>
              {iframeCode}
            </code>
            <button
              onClick={() => copy(iframeCode, 'iframe')}
              className="rounded px-2 py-1 text-xs font-medium transition-colors"
              style={{ background: copied === 'iframe' ? 'rgba(34,197,94,0.12)' : 'var(--sidebar-border)', color: copied === 'iframe' ? '#16A34A' : 'var(--text-secondary)' }}
            >
              {copied === 'iframe' ? 'Copied!' : 'Copy code'}
            </button>
          </div>
        </div>

        {/* Double opt-in note */}
        {form.doubleOptIn && (
          <div
            className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs"
            style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)' }}
          >
            <span>✓</span>
            <span style={{ color: '#16A34A' }}>
              Double opt-in is enabled — subscribers receive a confirmation email before being added.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function FormsTable({ forms: initialForms, isAdmin }: Props) {
  const [forms,      setForms]      = useState(initialForms);
  const [embedForm,  setEmbedForm]  = useState<FormRow | null>(null);
  const [isPending,  startTransition] = useTransition();

  function handleDelete(formId: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      await deleteForm(formId);
      setForms((prev) => prev.filter((f) => f.id !== formId));
    });
  }

  return (
    <>
      {embedForm && <EmbedModal form={embedForm} onClose={() => setEmbedForm(null)} />}

      <div
        className="rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--sidebar-border)', background: 'var(--surface-card)' }}
      >
        <table className="w-full text-sm">
          <thead style={{ borderBottom: '1px solid var(--sidebar-border)', background: 'var(--surface-app)' }}>
            <tr>
              {['Form', 'Status', 'Submissions', 'Opt-in', ''].map((h, i) => (
                <th
                  key={i}
                  className={`px-5 py-3 text-[11px] font-semibold uppercase tracking-wider ${i === 0 ? 'text-left' : i === 4 ? 'text-right' : 'text-center'}`}
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {forms.map((form, i) => (
              <tr
                key={form.id}
                style={{ borderTop: i > 0 ? '1px solid var(--sidebar-border)' : undefined }}
              >
                {/* Name */}
                <td className="px-5 py-4">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {form.name}
                  </p>
                  <p className="text-xs mt-0.5 truncate max-w-[200px]" style={{ color: 'var(--text-tertiary)' }}>
                    {form.headline}
                  </p>
                </td>

                {/* Status */}
                <td className="px-5 py-4 text-center">
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-semibold"
                    style={{
                      background: form.isActive ? 'rgba(34,197,94,0.1)' : 'var(--surface-app)',
                      color:      form.isActive ? '#16A34A' : 'var(--text-tertiary)',
                    }}
                  >
                    {form.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>

                {/* Submissions */}
                <td className="px-5 py-4 text-center">
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {form.submissions.toLocaleString()}
                  </span>
                </td>

                {/* Opt-in type */}
                <td className="px-5 py-4 text-center">
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {form.doubleOptIn ? 'Double' : 'Single'}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-5 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setEmbedForm(form)}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                      style={{ border: '1px solid var(--sidebar-border)', color: 'var(--text-secondary)', background: 'none' }}
                      title="Get embed code"
                    >
                      <CodeIcon className="h-3.5 w-3.5" />
                      Embed
                    </button>
                    {isAdmin && (
                      <>
                        <Link
                          href={`/dashboard/forms/${form.id}/edit`}
                          className="rounded-lg p-1.5 transition-colors"
                          style={{ color: 'var(--text-tertiary)' }}
                          title="Edit form"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(form.id, form.name)}
                          disabled={isPending}
                          className="rounded-lg p-1.5 transition-colors"
                          style={{ color: '#EF4444' }}
                          title="Delete form"
                        >
                          <Trash2Icon className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
