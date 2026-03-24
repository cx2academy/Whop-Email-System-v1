/**
 * app/dashboard/forms/page.tsx
 * Lead capture forms — list with embed code access.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { PlusIcon, FormInputIcon } from 'lucide-react';
import { requireWorkspaceAccess } from '@/lib/auth/session';
import { getForms } from '@/lib/forms/actions';
import { FormsTable } from './forms-table';

export const metadata: Metadata = { title: 'Forms' };

export default async function FormsPage() {
  const { workspaceRole } = await requireWorkspaceAccess();
  const forms = await getForms().catch(() => []);
  const isAdmin = workspaceRole === 'OWNER' || workspaceRole === 'ADMIN';

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', letterSpacing: '-0.03em' }}
          >
            Forms
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {forms.length > 0
              ? `${forms.length} form${forms.length !== 1 ? 's' : ''} · grow your list from anywhere`
              : 'Capture subscribers beyond Whop'}
          </p>
        </div>
        {isAdmin && forms.length > 0 && (
          <Link
            href="/dashboard/forms/new"
            className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: 'var(--brand)', boxShadow: '0 2px 8px rgba(34,197,94,0.22)' }}
          >
            <PlusIcon className="h-4 w-4" />
            New form
          </Link>
        )}
      </div>

      {/* Empty state */}
      {forms.length === 0 ? (
        <div className="space-y-4">
          <div
            className="rounded-xl p-10 text-center"
            style={{ border: '1.5px dashed var(--sidebar-border)', background: 'var(--surface-card)' }}
          >
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl mb-5"
              style={{ background: '#EFF6FF' }}
            >
              <FormInputIcon className="h-6 w-6" style={{ color: '#3B82F6' }} />
            </div>
            <p className="text-base font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>
              Capture subscribers from anywhere
            </p>
            <p className="text-sm max-w-sm mx-auto mb-6 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Create embeddable opt-in forms for your website, bio link, or landing page.
              Includes GDPR-compliant double opt-in confirmation.
            </p>
            {isAdmin && (
              <Link
                href="/dashboard/forms/new"
                className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white"
                style={{ background: 'var(--brand)' }}
              >
                <PlusIcon className="h-4 w-4" />
                Create your first form
              </Link>
            )}
          </div>

          {/* Benefits */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: '🌐', title: 'Any website', desc: 'Embed with one line of code or share a direct link' },
              { icon: '✉️', title: 'Double opt-in', desc: 'GDPR-compliant confirmation email built in' },
              { icon: '🏷', title: 'Auto-tag', desc: 'Subscribers get tagged automatically on sign-up' },
            ].map((b) => (
              <div
                key={b.title}
                className="rounded-xl p-4"
                style={{ background: 'var(--surface-card)', border: '1px solid var(--sidebar-border)' }}
              >
                <div className="text-xl mb-2">{b.icon}</div>
                <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>{b.title}</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <FormsTable forms={forms} isAdmin={isAdmin} />
      )}
    </div>
  );
}
