/**
 * app/dashboard/contacts/page.tsx
 * Contacts — Next.js 15 searchParams fix + light theme + strong empty state
 */

import type { Metadata } from 'next';
import { requireWorkspaceAccess } from '@/lib/auth/session';
import { getContacts, getTags, getLatestSyncLog } from '@/lib/sync/actions';
import { ContactsTable } from './contacts-table';
import { SyncPanel } from './sync-panel';
import { formatDate, formatRelativeTime } from '@/lib/utils';
import { UsersIcon, RefreshCwIcon } from 'lucide-react';

export const metadata: Metadata = { title: 'Contacts' };

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; tag?: string; page?: string }>;
}) {
  const params = await searchParams;
  const { workspaceRole } = await requireWorkspaceAccess();

  const page   = Math.max(1, parseInt(params.page ?? '1', 10));
  const tagIds = params.tag ? [params.tag] : undefined;
  const status = params.status as 'SUBSCRIBED' | 'UNSUBSCRIBED' | 'BOUNCED' | 'COMPLAINED' | undefined;

  const [contacts, tags, latestSync] = await Promise.all([
    getContacts({ search: params.search, status, tagIds, page, limit: 25 }),
    getTags(),
    getLatestSyncLog(),
  ]);

  const isAdmin = workspaceRole === 'OWNER' || workspaceRole === 'ADMIN';

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            Contacts
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {contacts.total > 0
              ? `${contacts.total.toLocaleString()} subscriber${contacts.total !== 1 ? 's' : ''}`
              : 'Import your Whop members'}
          </p>
        </div>
        {isAdmin && (
          <SyncPanel
            latestSync={
              latestSync
                ? {
                    status: latestSync.status,
                    totalUpserted: latestSync.totalUpserted,
                    totalFetched: latestSync.totalFetched,
                    completedAt: latestSync.completedAt ? formatRelativeTime(latestSync.completedAt) : null,
                  }
                : null
            }
          />
        )}
      </div>

      {/* Last sync bar */}
      {latestSync?.completedAt && (
        <div
          className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs"
          style={{ background: 'var(--surface-card)', border: '1px solid var(--sidebar-border)' }}
        >
          <RefreshCwIcon className="h-3 w-3 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
          <span style={{ color: 'var(--text-tertiary)' }}>Last sync:</span>
          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
            {latestSync.status === 'SUCCESS'
              ? `${latestSync.totalUpserted.toLocaleString()} contacts imported`
              : latestSync.status.toLowerCase()}
          </span>
          <span style={{ color: 'var(--text-tertiary)' }}>· {formatDate(latestSync.completedAt)}</span>
        </div>
      )}

      {/* Empty state — no contacts at all */}
      {contacts.total === 0 && !params.search && !params.status && !params.tag ? (
        <div
          className="rounded-xl p-12 text-center"
          style={{ border: '1.5px dashed var(--sidebar-border)', background: 'var(--surface-card)' }}
        >
          <div
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl mb-5"
            style={{ background: '#F0F9FF' }}
          >
            <UsersIcon className="h-6 w-6" style={{ color: '#0284C7' }} />
          </div>
          <p className="text-base font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>
            No contacts yet
          </p>
          <p className="text-sm max-w-sm mx-auto mb-6 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Connect your Whop account and sync your members — they'll appear here as contacts ready to email.
          </p>
          {isAdmin && (
            <div className="flex flex-col items-center gap-3">
              <div
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs"
                style={{ background: 'var(--surface-app)', border: '1px solid var(--sidebar-border)', color: 'var(--text-secondary)' }}
              >
                Step 1: Add your Whop API key in{' '}
                <a href="/dashboard/settings?tab=integrations" className="font-semibold underline" style={{ color: 'var(--brand)' }}>
                  Settings → Integrations
                </a>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Then click "Sync now" above to import your members.</p>
            </div>
          )}
        </div>
      ) : (
        <ContactsTable
          contacts={contacts}
          tags={tags}
          currentFilters={{ search: params.search, status: params.status, tag: params.tag }}
        />
      )}
    </div>
  );
}
