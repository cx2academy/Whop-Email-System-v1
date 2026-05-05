"use client";

/**
 * app/onboarding/onboarding-form.tsx
 *
 * Workspace creation form.
 * After creating the workspace, reloads the page via window.location
 * (hard navigation) so the server issues a fresh JWT cookie that includes
 * the new workspaceId. router.push() alone won't work because the JWT
 * was minted before the workspace existed.
 */

import { useState } from "react";
import { createWorkspace } from "@/lib/workspace/actions";

interface OnboardingFormProps {
  userName?: string | null;
}

export function OnboardingForm({ userName }: OnboardingFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultName = userName ? `${userName}'s Workspace` : "";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const result = await createWorkspace(formData);

      if (!result.success) {
        setError(result.error);
        setIsLoading(false);
        return;
      }

      // Hard navigation forces the server to issue a new JWT cookie
      // that contains the freshly created workspaceId.
      window.location.href = "/api/auth/refresh?callbackUrl=/dashboard";
    } catch {
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label
          htmlFor="name"
          className="mb-1 block text-sm font-medium text-foreground"
        >
          Workspace name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          disabled={isLoading}
          defaultValue={defaultName}
          placeholder="My Creator Brand"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <p className="mt-1.5 text-xs text-muted-foreground">
          You can change this later in settings.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="flex w-full items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? "Creating…" : "Create workspace & continue"}
      </button>
    </form>
  );
}
