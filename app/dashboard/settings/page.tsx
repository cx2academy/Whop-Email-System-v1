/**
 * app/dashboard/settings/page.tsx
 *
 * Workspace settings — name, sending identity, Whop API key.
 */

import type { Metadata } from "next";
import { requireWorkspaceAccess } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { WorkspaceSettingsForm } from "./settings-form";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const { workspaceId, workspaceRole } = await requireWorkspaceAccess();

  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      name: true,
      slug: true,
      fromEmail: true,
      fromName: true,
      plan: true,
      // Don't expose full API key in UI — show masked version only
      whopApiKey: true,
    },
  });

  if (!workspace) return null;

  const isAdmin = workspaceRole === "OWNER" || workspaceRole === "ADMIN";

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your workspace configuration
        </p>
      </div>

      {/* Workspace info */}
      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-base font-semibold text-foreground">
          Workspace
        </h2>
        <WorkspaceSettingsForm
          workspace={{
            name: workspace.name,
            fromEmail: workspace.fromEmail,
            fromName: workspace.fromName,
            hasWhopApiKey: !!workspace.whopApiKey,
          }}
          isAdmin={isAdmin}
        />
      </section>

      {/* Danger zone (owner only) */}
      {workspaceRole === "OWNER" && (
        <section className="rounded-lg border border-destructive/30 bg-card p-6">
          <h2 className="mb-2 text-base font-semibold text-destructive">
            Danger Zone
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            These actions are irreversible. Proceed with caution.
          </p>
          <button
            disabled
            className="rounded-md border border-destructive px-4 py-2 text-sm font-medium text-destructive opacity-50 cursor-not-allowed"
            title="Workspace deletion will be available in a future release"
          >
            Delete workspace
          </button>
        </section>
      )}
    </div>
  );
}
