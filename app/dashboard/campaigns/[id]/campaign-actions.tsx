"use client";

/**
 * app/dashboard/campaigns/[id]/campaign-actions.tsx
 *
 * Action buttons for a campaign: send now, duplicate, delete.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendCampaignNow, deleteCampaign, duplicateCampaign } from "@/lib/campaigns/actions";
import type { CampaignStatus } from "@prisma/client";

interface CampaignActionsProps {
  campaignId: string;
  status: CampaignStatus;
}

export function CampaignActions({ campaignId, status }: CampaignActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const canSend = status === "DRAFT" || status === "SCHEDULED";
  const canDelete = status === "DRAFT" || status === "FAILED";

  async function handleSend() {
    if (!confirm("Send this campaign now? This cannot be undone.")) return;
    setIsLoading(true);
    setResult(null);
    const r = await sendCampaignNow(campaignId);
    setIsLoading(false);
    if (r.success) {
      setResult({ type: "success", message: `Sent to ${r.data?.totalSent} contacts` });
      router.refresh();
    } else {
      setResult({ type: "error", message: (!r.success && r.error) ? r.error : "Send failed" });
    }
  }

  async function handleDuplicate() {
    setIsLoading(true);
    const r = await duplicateCampaign(campaignId);
    setIsLoading(false);
    if (r.success) {
      router.push(`/dashboard/campaigns/${r.data?.campaignId}`);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this campaign? This cannot be undone.")) return;
    setIsLoading(true);
    const r = await deleteCampaign(campaignId);
    setIsLoading(false);
    if (r.success) {
      router.push("/dashboard/campaigns");
    } else {
      setResult({ type: "error", message: (!r.success && r.error) ? r.error : "Delete failed" });
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        {canSend && (
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {isLoading ? "Sending…" : "Send now"}
          </button>
        )}
        <button
          onClick={handleDuplicate}
          disabled={isLoading}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
        >
          Duplicate
        </button>
        {canDelete && (
          <button
            onClick={handleDelete}
            disabled={isLoading}
            className="rounded-md border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
          >
            Delete
          </button>
        )}
      </div>
      {result && (
        <p
          className={`text-xs ${
            result.type === "error" ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          {result.message}
        </p>
      )}
    </div>
  );
}
