/**
 * app/dashboard/contacts/page.tsx
 *
 * Contacts dashboard — lists all synced contacts with filtering,
 * segmentation by tag, and a manual sync trigger.
 */

import type { Metadata } from "next";
import { requireWorkspaceAccess } from "@/lib/auth/session";
import { getContacts, getTags, getLatestSyncLog } from "@/lib/sync/actions";
import { ContactsTable } from "./contacts-table";
import { SyncPanel } from "./sync-panel";
import { formatDate, formatRelativeTime } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Contacts",
};

interface ContactsPageProps {
  searchParams: {
    search?: string;
    status?: string;
    tag?: string;
    page?: string;
  };
}

export default async function ContactsPage({
  searchParams,
}: ContactsPageProps) {
  const { workspaceRole } = await requireWorkspaceAccess();

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const tagIds = searchParams.tag ? [searchParams.tag] : undefined;
  const status = searchParams.status as
    | "SUBSCRIBED"
    | "UNSUBSCRIBED"
    | "BOUNCED"
    | "COMPLAINED"
    | undefined;

  // Fetch contacts, tags, and latest sync info in parallel
  const [contacts, tags, latestSync] = await Promise.all([
    getContacts({
      search: searchParams.search,
      status,
      tagIds,
      page,
      limit: 25,
    }),
    getTags(),
    getLatestSyncLog(),
  ]);

  const isAdmin = workspaceRole === "OWNER" || workspaceRole === "ADMIN";

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contacts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {contacts.total.toLocaleString()} total contacts
          </p>
        </div>

        {/* Sync panel */}
        {isAdmin && (
          <SyncPanel
            latestSync={
              latestSync
                ? {
                    status: latestSync.status,
                    totalUpserted: latestSync.totalUpserted,
                    totalFetched: latestSync.totalFetched,
                    completedAt: latestSync.completedAt
                      ? formatRelativeTime(latestSync.completedAt)
                      : null,
                  }
                : null
            }
          />
        )}
      </div>

      {/* Last sync info bar */}
      {latestSync?.completedAt && (
        <div className="rounded-md border border-border bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
          Last sync:{" "}
          <span className="font-medium text-foreground">
            {latestSync.status === "SUCCESS"
              ? `${latestSync.totalUpserted.toLocaleString()} contacts synced`
              : `${latestSync.status.toLowerCase()}`}
          </span>{" "}
          · {formatDate(latestSync.completedAt)}
        </div>
      )}

      {/* Contacts table with filters */}
      <ContactsTable
        contacts={contacts}
        tags={tags}
        currentFilters={{
          search: searchParams.search,
          status: searchParams.status,
          tag: searchParams.tag,
        }}
      />
    </div>
  );
}
