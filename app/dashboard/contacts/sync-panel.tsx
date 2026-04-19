"use client";

/**
 * app/dashboard/contacts/sync-panel.tsx
 *
 * Manual sync trigger button with live status feedback.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCwIcon } from "lucide-react";
import { triggerSync } from "@/lib/sync/actions";

interface SyncPanelProps {
  latestSync: {
    status: string;
    totalUpserted: number;
    totalFetched: number;
    completedAt: string | null;
  } | null;
}

export function SyncPanel({ latestSync }: SyncPanelProps) {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    type: "success" | "error" | "partial";
    message: string;
  } | null>(null);

  async function handleSync() {
    setIsSyncing(true);
    setSyncResult(null);

    try {
      const result = await triggerSync();

      if (result.success && result.data) {
        const { totalUpserted, totalFetched, status } = result.data;
        setSyncResult({
          type: status === "SUCCESS" ? "success" : "partial",
          message: `Synced ${totalUpserted.toLocaleString()} of ${totalFetched.toLocaleString()} contacts`,
        });
        router.refresh();
      } else {
        setSyncResult({
          type: "error",
          message:
            result.success === false
              ? result.error
              : "Sync failed. Please try again.",
        });
      }
    } catch {
      setSyncResult({
        type: "error",
        message: "An unexpected error occurred.",
      });
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        id="tour-contacts-sync-btn"
        onClick={handleSync}
        disabled={isSyncing}
        className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <RefreshCwIcon
          className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
          aria-hidden="true"
        />
        {isSyncing ? "Syncing…" : "Sync from Whop"}
      </button>

      {syncResult && (
        <p
          className={`text-xs ${
            syncResult.type === "error"
              ? "text-destructive"
              : "text-muted-foreground"
          }`}
        >
          {syncResult.type === "success" && "✓ "}
          {syncResult.type === "partial" && "⚠ "}
          {syncResult.message}
        </p>
      )}

      {!syncResult && latestSync?.completedAt && (
        <p className="text-xs text-muted-foreground">
          Last synced {latestSync.completedAt}
        </p>
      )}
    </div>
  );
}
