"use client";

/**
 * app/dashboard/campaigns/[id]/campaign-actions.tsx
 *
 * Action buttons for a campaign: check deliverability, send, duplicate, delete.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendCampaignNow, deleteCampaign, duplicateCampaign } from "@/lib/campaigns/actions";
import { runDeliverabilityCheck } from "@/lib/deliverability/actions";
import type { CampaignStatus } from "@prisma/client";

interface CampaignActionsProps {
  campaignId: string;
  status: CampaignStatus;
}

interface DelivReport {
  score: number;
  grade: string;
  warnings: string[];
  recommendations: string[];
}

export function CampaignActions({ campaignId, status }: CampaignActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [delivReport, setDelivReport] = useState<DelivReport | null>(null);

  const canSend   = status === "DRAFT" || status === "SCHEDULED";
  const canDelete = status === "DRAFT" || status === "FAILED";
  const canCheck  = status === "DRAFT" || status === "SCHEDULED";

  async function handleCheck() {
    setIsLoading(true);
    setDelivReport(null);
    setResult(null);
    const r = await runDeliverabilityCheck(campaignId);
    setIsLoading(false);
    if (r.success) {
      setDelivReport(r.data!);
    } else {
      setResult({ type: "error", message: r.error ?? "Check failed" });
    }
  }

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

  const scoreColor = delivReport
    ? delivReport.score >= 75
      ? "bg-green-100 text-green-700"
      : delivReport.score >= 50
      ? "bg-yellow-100 text-yellow-700"
      : "bg-red-100 text-red-700"
    : "";

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap gap-2">
        {canCheck && (
          <button
            onClick={handleCheck}
            disabled={isLoading}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
          >
            {isLoading ? "Checking…" : "Check deliverability"}
          </button>
        )}
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
        <p className={`text-xs ${result.type === "error" ? "text-destructive" : "text-muted-foreground"}`}>
          {result.message}
        </p>
      )}

      {delivReport && (
        <div className="mt-3 w-full rounded-md border border-border bg-muted/30 p-4 text-xs">
          <div className="mb-2 flex items-center gap-2">
            <span className="font-semibold text-foreground">Deliverability Score</span>
            <span className={`rounded-full px-2 py-0.5 font-bold ${scoreColor}`}>
              {delivReport.score}/100 &middot; Grade {delivReport.grade}
            </span>
          </div>

          {delivReport.warnings.length > 0 && (
            <div className="mb-2">
              <p className="mb-1 font-medium text-destructive">Warnings</p>
              <ul className="space-y-0.5 text-muted-foreground">
                {delivReport.warnings.map((w, i) => (
                  <li key={i}>&middot; {w}</li>
                ))}
              </ul>
            </div>
          )}

          {delivReport.recommendations.length > 0 && (
            <div>
              <p className="mb-1 font-medium text-foreground">Recommendations</p>
              <ul className="space-y-0.5 text-muted-foreground">
                {delivReport.recommendations.map((rec, i) => (
                  <li key={i}>&middot; {rec}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-2 text-muted-foreground">
            Full report saved to the{" "}
            <a href="/dashboard/deliverability" className="underline">
              Deliverability dashboard
            </a>.
          </p>
        </div>
      )}
    </div>
  );
}
