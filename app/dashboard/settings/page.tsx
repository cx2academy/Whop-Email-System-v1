/**
 * app/dashboard/settings/page.tsx
 *
 * Workspace settings — name, sending identity, Whop API key.
 */

import type { Metadata } from "next";
import { requireWorkspaceAccess } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { WorkspaceSettingsForm } from "./settings-form";
import { ApiKeys } from "./api-keys";

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
      whopApiKey: true,
      apiKeys: {
        orderBy: { createdAt: 'desc' as const },
        select: { id: true, name: true, keyPrefix: true, lastUsedAt: true, createdAt: true },
      },
    },
  });

  const apiKeys = await db.apiKey.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, keyPrefix: true, lastUsedAt: true, createdAt: true },
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


      {/* API Keys */}
      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-1 text-base font-semibold text-foreground">API Keys</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Use API keys to access the{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">/api/v1</code> endpoints
          from external tools or AI agents.
        </p>
        {isAdmin ? (
          <ApiKeys
            initialKeys={apiKeys.map((k) => ({
              ...k,
              lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
              createdAt: k.createdAt.toISOString(),
            }))}
          />
        ) : (
          <p className="text-sm text-muted-foreground">Only admins can manage API keys.</p>
        )}
      </section>

      {/* Data & Privacy */}
      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-1 text-base font-semibold text-foreground">Data &amp; Privacy</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          How your data is stored and protected in this workspace.
        </p>
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3 rounded-md border border-border bg-muted/30 px-4 py-3">
            <span className="mt-0.5 text-base">🔐</span>
            <div>
              <p className="font-medium text-foreground">API keys encrypted at rest</p>
              <p className="text-muted-foreground">
                Your Whop API key is encrypted with AES-256-GCM before being stored in the database.
                The plaintext key is never persisted.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-md border border-border bg-muted/30 px-4 py-3">
            <span className="mt-0.5 text-base">🛡️</span>
            <div>
              <p className="font-medium text-foreground">Workspace isolation</p>
              <p className="text-muted-foreground">
                All contacts, campaigns, and settings are scoped to your workspace.
                No data is shared between workspaces.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-md border border-border bg-muted/30 px-4 py-3">
            <span className="mt-0.5 text-base">📧</span>
            <div>
              <p className="font-medium text-foreground">Email content</p>
              <p className="text-muted-foreground">
                Email bodies are not end-to-end encrypted — they are transmitted to Resend for delivery.
                Resend is SOC 2 Type II compliant.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-md border border-border bg-muted/30 px-4 py-3">
            <span className="mt-0.5 text-base">🚫</span>
            <div>
              <p className="font-medium text-foreground">Unsubscribes honoured immediately</p>
              <p className="text-muted-foreground">
                Contacts who unsubscribe are excluded from all future sends. Status is updated in real time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* API Keys */}
      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-1 text-base font-semibold text-foreground">API Keys</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Use API keys to access the v1 REST API from external tools or agents.
          See <code className="font-mono text-xs">/docs/api-v1.md</code> for endpoint reference.
        </p>
        <ApiKeysSection
          initialKeys={workspace.apiKeys}
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
