"use client";

/**
 * app/dashboard/settings/settings-form.tsx
 *
 * Workspace settings form.
 */

import { useState } from "react";
import { updateWorkspace } from "@/lib/workspace/actions";

interface WorkspaceSettingsFormProps {
  workspace: {
    name: string;
    fromEmail: string | null;
    fromName: string | null;
    hasWhopApiKey: boolean;
  };
  isAdmin: boolean;
}

export function WorkspaceSettingsForm({
  workspace,
  isAdmin,
}: WorkspaceSettingsFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsLoading(true);

    try {
      const form = e.currentTarget;
      const data = {
        name: (form.elements.namedItem("name") as HTMLInputElement).value,
        fromEmail:
          (form.elements.namedItem("fromEmail") as HTMLInputElement).value ||
          null,
        fromName:
          (form.elements.namedItem("fromName") as HTMLInputElement).value ||
          null,
        whopApiKey:
          (form.elements.namedItem("whopApiKey") as HTMLInputElement).value ||
          null,
      };

      const result = await updateWorkspace(data);
      if (!result.success) {
        setError(result.error);
      } else {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch {
      setError("Failed to save settings. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-foreground">
          Workspace name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          disabled={!isAdmin || isLoading}
          defaultValue={workspace.name}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <div>
        <label htmlFor="fromEmail" className="mb-1 block text-sm font-medium text-foreground">
          Default from email
        </label>
        <input
          id="fromEmail"
          name="fromEmail"
          type="email"
          disabled={!isAdmin || isLoading}
          defaultValue={workspace.fromEmail ?? ""}
          placeholder="noreply@yourdomain.com"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <div>
        <label htmlFor="fromName" className="mb-1 block text-sm font-medium text-foreground">
          Default from name
        </label>
        <input
          id="fromName"
          name="fromName"
          type="text"
          disabled={!isAdmin || isLoading}
          defaultValue={workspace.fromName ?? ""}
          placeholder="Your Brand Name"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <div>
        <label htmlFor="whopApiKey" className="mb-1 block text-sm font-medium text-foreground">
          Whop API key
        </label>
        <input
          id="whopApiKey"
          name="whopApiKey"
          type="password"
          disabled={!isAdmin || isLoading}
          defaultValue=""
          placeholder={workspace.hasWhopApiKey ? "••••••••••••••••" : "Enter your Whop API key"}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Required for syncing Whop community members. Leave blank to keep existing key.
        </p>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      {success && (
        <p className="text-sm text-green-600">Settings saved successfully.</p>
      )}

      {isAdmin && (
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Saving…" : "Save changes"}
        </button>
      )}
    </form>
  );
}
