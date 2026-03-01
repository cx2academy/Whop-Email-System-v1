/**
 * components/layout/dashboard-topbar.tsx
 *
 * Top navigation bar for the dashboard.
 * Shows workspace name, user avatar, and sign-out.
 */

import { auth } from "@/auth";
import { SignOutButton } from "@/components/auth/sign-out-button";

export async function DashboardTopbar() {
  const session = await auth();
  const user = session?.user;

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background px-6">
      <div />

      {/* User info + actions */}
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-foreground">{user?.name ?? "User"}</p>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
        </div>

        {/* Avatar */}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {(user?.name ?? user?.email ?? "U").charAt(0).toUpperCase()}
        </div>

        <SignOutButton />
      </div>
    </header>
  );
}
