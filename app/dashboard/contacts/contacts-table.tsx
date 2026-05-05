"use client";

/**
 * app/dashboard/contacts/contacts-table.tsx
 *
 * Contacts table with search, status filter, tag segmentation, and pagination.
 * Uses URL search params for filter state (bookmark/share-friendly).
 */

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition, useCallback } from "react";
import type { Contact } from "@prisma/client";
import type { Tag } from "@prisma/client";
import type { PaginatedResult } from "@/types";

type ContactWithTags = Contact & {
  tags: Array<{ tag: Pick<Tag, "id" | "name" | "color"> }>;
};

interface ContactsTableProps {
  contacts: PaginatedResult<ContactWithTags>;
  tags: Tag[];
  currentFilters: {
    search?: string;
    status?: string;
    tag?: string;
  };
}

export function ContactsTable({
  contacts,
  tags,
  currentFilters,
}: ContactsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateFilter = useCallback(
    (key: string, value: string | undefined) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page"); // reset page on filter change
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams]
  );

  const goToPage = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", String(page));
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams]
  );

  return (
    <div className={`space-y-4 ${isPending ? "opacity-60 pointer-events-none" : ""}`}>
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <input
          type="search"
          placeholder="Search by name or email…"
          defaultValue={currentFilters.search ?? ""}
          onChange={(e) => {
            const val = e.target.value;
            if (val.length === 0 || val.length >= 2) {
              updateFilter("search", val || undefined);
            }
          }}
          className="h-9 w-64 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />

        {/* Status filter */}
        <select
          value={currentFilters.status ?? ""}
          onChange={(e) => updateFilter("status", e.target.value || undefined)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">All statuses</option>
          <option value="SUBSCRIBED">Subscribed</option>
          <option value="UNSUBSCRIBED">Unsubscribed</option>
          <option value="BOUNCED">Bounced</option>
          <option value="COMPLAINED">Complained</option>
        </select>

        {/* Tag filter */}
        {tags.length > 0 && (
          <select
            value={currentFilters.tag ?? ""}
            onChange={(e) => updateFilter("tag", e.target.value || undefined)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">All tags</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
        )}

        {/* Clear filters */}
        {(currentFilters.search ||
          currentFilters.status ||
          currentFilters.tag) && (
          <button
            onClick={() => {
              startTransition(() => router.push(pathname));
            }}
            className="text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      {contacts.data.length === 0 ? (
        <EmptyState hasFilters={!!currentFilters.search || !!currentFilters.status || !!currentFilters.tag} />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Contact
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Tags
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Source
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Added
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {contacts.data.map((contact) => (
                <ContactRow key={contact.id} contact={contact} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {contacts.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>
            Showing{" "}
            {((contacts.page - 1) * contacts.limit + 1).toLocaleString()}–
            {Math.min(
              contacts.page * contacts.limit,
              contacts.total
            ).toLocaleString()}{" "}
            of {contacts.total.toLocaleString()}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => goToPage(contacts.page - 1)}
              disabled={!contacts.hasPrevPage || isPending}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <span className="flex items-center px-2 text-xs">
              Page {contacts.page} of {contacts.totalPages}
            </span>
            <button
              onClick={() => goToPage(contacts.page + 1)}
              disabled={!contacts.hasNextPage || isPending}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ContactRow({ contact }: { contact: ContactWithTags }) {
  const displayName =
    [contact.firstName, contact.lastName].filter(Boolean).join(" ") || null;

  const addedDate = new Date(contact.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <tr className="hover:bg-muted/30">
      <td className="px-4 py-3">
        <div>
          {displayName && (
            <p className="font-medium text-foreground">{displayName}</p>
          )}
          <p className={displayName ? "text-xs text-muted-foreground" : "font-medium text-foreground"}>
            {contact.email}
          </p>
        </div>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={contact.status} />
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {contact.tags.map(({ tag }) => (
            <TagPill key={tag.id} name={tag.name} color={tag.color} />
          ))}
        </div>
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {contact.whopMemberId ? "Whop" : "Manual"}
      </td>
      <td className="px-4 py-3 text-right text-muted-foreground">
        {addedDate}
      </td>
    </tr>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    SUBSCRIBED: "bg-green-100 text-green-700",
    UNSUBSCRIBED: "bg-muted text-muted-foreground",
    BOUNCED: "bg-red-100 text-red-700",
    COMPLAINED: "bg-orange-100 text-orange-700",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? styles.SUBSCRIBED}`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

function TagPill({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: color }}
    >
      {name}
    </span>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/20 py-16 text-center">
      <p className="text-sm font-medium text-foreground">
        {hasFilters ? "No contacts match your filters" : "No contacts yet"}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {hasFilters
          ? "Try adjusting your search or filters"
          : "Sync your Whop community to import contacts"}
      </p>
    </div>
  );
}
