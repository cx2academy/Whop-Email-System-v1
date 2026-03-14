/**
 * app/dashboard/campaigns/page.tsx
 *
 * Campaign list view — all campaigns with status, stats, and actions.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { requireWorkspaceAccess } from "@/lib/auth/session";
import { getCampaigns } from "@/lib/campaigns/actions";
import { CAMPAIGN_STATUS_LABELS } from "@/lib/constants";
import { formatDate, formatNumber } from "@/lib/utils";
import type { CampaignStatus } from "@prisma/client";
import { StrategyAdvisor } from "./strategy-advisor";

export const metadata: Metadata = {
  title: "Campaigns",
};

export default async function CampaignsPage() {
  const { workspaceRole } = await requireWorkspaceAccess();
  const campaigns = await getCampaigns();
  const isAdmin = workspaceRole === "OWNER" || workspaceRole === "ADMIN";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Campaigns</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""}
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/campaigns/sequence"
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              ✦ AI Sequence
            </Link>
            <Link
              href="/dashboard/campaigns/new"
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              <PlusIcon className="h-4 w-4" aria-hidden="true" />
              New campaign
            </Link>
          </div>
        )}
      </div>

      {/* Strategy advisor */}
      {/* @ts-expect-error async server component */}
      <StrategyAdvisor />

      {/* Campaign list */}
      {campaigns.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 py-20 text-center">
          <p className="text-sm font-medium text-foreground">No campaigns yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Create your first campaign to start emailing your community
          </p>
          {isAdmin && (
            <Link
              href="/dashboard/campaigns/new"
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              <PlusIcon className="h-4 w-4" aria-hidden="true" />
              Create campaign
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Campaign
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Sent
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Open rate
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {campaigns.map((campaign) => {
                const openRate =
                  campaign.totalSent > 0
                    ? ((campaign.totalOpened / campaign.totalSent) * 100).toFixed(1) + "%"
                    : "—";
                const date = campaign.sentAt ?? campaign.scheduledAt ?? campaign.createdAt;

                return (
                  <tr key={campaign.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/campaigns/${campaign.id}`}
                        className="font-medium text-foreground hover:text-primary"
                      >
                        {campaign.name}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground truncate max-w-xs">
                        {campaign.subject}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <CampaignStatusBadge status={campaign.status} />
                      {campaign.type !== "BROADCAST" && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {campaign.type.toLowerCase()}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {campaign.totalSent > 0
                        ? formatNumber(campaign.totalSent)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {openRate}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {formatDate(date)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  const styles: Record<CampaignStatus, string> = {
    DRAFT: "bg-muted text-muted-foreground",
    SCHEDULED: "bg-blue-100 text-blue-700",
    SENDING: "bg-yellow-100 text-yellow-700",
    COMPLETED: "bg-green-100 text-green-700",
    FAILED: "bg-red-100 text-red-700",
    PAUSED: "bg-orange-100 text-orange-700",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {CAMPAIGN_STATUS_LABELS[status] ?? status}
    </span>
  );
}
