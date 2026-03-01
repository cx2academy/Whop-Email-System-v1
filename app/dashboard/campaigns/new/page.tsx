/**
 * app/dashboard/campaigns/new/page.tsx
 *
 * New campaign builder — audience selector + email editor + A/B config.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeftIcon } from "lucide-react";
import { requireAdminAccess } from "@/lib/auth/session";
import { getTags } from "@/lib/sync/actions";
import { CampaignBuilder } from "../campaign-builder";

export const metadata: Metadata = {
  title: "New Campaign",
};

export default async function NewCampaignPage() {
  await requireAdminAccess();
  const tags = await getTags();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard/campaigns" className="flex items-center gap-1 hover:text-foreground">
          <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
          Campaigns
        </Link>
        <span>/</span>
        <span className="text-foreground">New campaign</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Create campaign</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Build and send an email campaign to your community
        </p>
      </div>

      <CampaignBuilder tags={tags} />
    </div>
  );
}
