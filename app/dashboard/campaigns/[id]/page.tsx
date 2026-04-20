/**
 * app/dashboard/campaigns/[id]/page.tsx
 *
 * Campaign detail page — shows full analytics, status, and actions.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeftIcon } from "lucide-react";
import { requireWorkspaceAccess } from "@/lib/auth/session";
import { getCampaign, getCampaignAnalytics } from "@/lib/campaigns/actions";
import { CampaignActions } from "./campaign-actions";
import { CAMPAIGN_STATUS_LABELS } from "@/lib/constants";
import { formatDate, formatNumber } from "@/lib/utils";
import { EmailPreview } from "./email-preview";

interface CampaignPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata(
  props: CampaignPageProps
): Promise<Metadata> {
  const params = await props.params;
  return { title: `Campaign · ${params.id.slice(0, 8)}` };
}

export default async function CampaignPage(props: CampaignPageProps) {
  const params = await props.params;
  const { workspaceRole } = await requireWorkspaceAccess();

  const [campaign, analytics] = await Promise.all([
    getCampaign(params.id),
    getCampaignAnalytics(params.id),
  ]);

  if (!campaign) notFound();

  const isAdmin = workspaceRole === "OWNER" || workspaceRole === "ADMIN";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/dashboard/campaigns"
          className="flex items-center gap-1 hover:text-foreground"
        >
          <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
          Campaigns
        </Link>
        <span>/</span>
        <span className="truncate text-foreground">{campaign.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{campaign.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{campaign.subject}</p>
        </div>

        <div className="flex items-center gap-3">
          <StatusBadge status={campaign.status} />
          {isAdmin && (
            <CampaignActions
              campaignId={campaign.id}
              status={campaign.status}
            />
          )}
        </div>
      </div>

      {/* Analytics stats */}
      {analytics && campaign.status !== "DRAFT" && (
        <div id="tour-campaign-analytics-stats" className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <StatCard
            label="Recipients"
            value={formatNumber(analytics.totalRecipients)}
            icon="👥"
          />
          <StatCard
            label="Delivered"
            value={formatNumber(analytics.totalSent)}
            sub={analytics.totalRecipients > 0
              ? `${((analytics.totalSent / analytics.totalRecipients) * 100).toFixed(0)}%`
              : undefined}
            icon="📨"
          />
          <StatCard
            label="Opened"
            value={`${analytics.openRate}%`}
            sub={formatNumber(analytics.totalOpened)}
            icon="👁"
          />
          <StatCard
            label="Clicked"
            value={`${analytics.clickRate}%`}
            sub={formatNumber(analytics.totalClicked)}
            icon="🖱"
          />
          <StatCard
            label="Revenue"
            value={analytics.totalRevenue > 0 ? `$${(analytics.totalRevenue / 100).toLocaleString()}` : '—'}
            icon="💰"
          />
        </div>
      )}

      {/* A/B test results */}
      {analytics?.abStats && campaign.status !== "DRAFT" && (
        <div className="rounded-lg border border-border bg-card p-5 space-y-4">
          <h2 className="font-semibold text-foreground">A/B Test Results</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-md border border-border p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase mb-2">
                Subject A
              </p>
              <p className="text-sm font-medium text-foreground mb-3 line-clamp-2">
                {campaign.subject}
              </p>
              <p className="text-2xl font-bold text-foreground">
                {analytics.abStats.variantA.openRate}%
              </p>
              <p className="text-xs text-muted-foreground">
                {analytics.abStats.variantA.opened} opens of {analytics.abStats.variantA.sent} sent
              </p>
            </div>
            <div className="rounded-md border border-border p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase mb-2">
                Subject B
              </p>
              <p className="text-sm font-medium text-foreground mb-3 line-clamp-2">
                {campaign.abSubjectB ?? "—"}
              </p>
              <p className="text-2xl font-bold text-foreground">
                {analytics.abStats.variantB.openRate}%
              </p>
              <p className="text-xs text-muted-foreground">
                {analytics.abStats.variantB.opened} opens of {analytics.abStats.variantB.sent} sent
              </p>
            </div>
          </div>
          {analytics.abStats.winner && (
            <p className="text-sm text-muted-foreground">
              Winner: <span className="font-medium text-foreground">Variant {analytics.abStats.winner}</span>
            </p>
          )}
        </div>
      )}

      {/* Campaign details */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-3">
        <h2 className="font-semibold text-foreground">Details</h2>
        <dl className="space-y-2 text-sm">
          <DetailRow label="Type" value={campaign.type} />
          <DetailRow
            label="Audience"
            value={
              campaign.audienceTagIds.length === 0
                ? "All subscribed contacts"
                : `${campaign.audienceTagIds.length} tag(s)`
            }
          />
          {campaign.sentAt && (
            <DetailRow label="Sent" value={formatDate(campaign.sentAt)} />
          )}
          {campaign.scheduledAt && campaign.status === "SCHEDULED" && (
            <DetailRow
              label="Scheduled"
              value={formatDate(campaign.scheduledAt)}
            />
          )}
          <DetailRow label="Created" value={formatDate(campaign.createdAt)} />
          {campaign.isAbTest && (
            <DetailRow label="A/B test" value="Yes — 50/50 split" />
          )}
        </dl>
      </div>

      {/* HTML preview */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold text-foreground">Email preview</h2>
        </div>
        <div className="p-5">
          <EmailPreview html={campaign.htmlBody} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: "bg-muted text-muted-foreground",
    SCHEDULED: "bg-blue-100 text-blue-700",
    SENDING: "bg-yellow-100 text-yellow-700",
    COMPLETED: "bg-green-100 text-green-700",
    FAILED: "bg-red-100 text-red-700",
    PAUSED: "bg-orange-100 text-orange-700",
  };
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${styles[status] ?? styles.DRAFT}`}
    >
      {CAMPAIGN_STATUS_LABELS[status] ?? status}
    </span>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <span className="text-lg">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}
