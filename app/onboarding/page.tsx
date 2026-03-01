/**
 * app/onboarding/page.tsx
 *
 * Onboarding page — shown to authenticated users who don't yet have a workspace.
 * Allows them to create one and proceed to the dashboard.
 */

import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = {
  title: "Set Up Your Workspace",
};

export default async function OnboardingPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  // If they already have a workspace, skip onboarding
  if (session.user.workspaceId) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-2xl">
            ⚡
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Create your workspace
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A workspace holds your contacts, campaigns, and settings.
          </p>
        </div>

        <OnboardingForm userName={session.user.name} />
      </div>
    </main>
  );
}
