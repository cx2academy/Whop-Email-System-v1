/**
 * app/dashboard/layout.tsx
 *
 * Protected dashboard layout.
 *
 * Every page under /dashboard inherits this layout.
 * It:
 *   1. Enforces authentication (redirects to /auth/login if not signed in)
 *   2. Enforces workspace membership (redirects to /onboarding if none)
 *   3. Renders the sidebar navigation and top bar
 */

import { requireWorkspaceAccess } from "@/lib/auth/session";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { DashboardTopbar } from "@/components/layout/dashboard-topbar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  // This call redirects to /auth/login or /onboarding if checks fail.
  // All pages nested under /dashboard are automatically protected.
  await requireWorkspaceAccess();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <DashboardSidebar />

      {/* Main content area */}
      <div className="flex flex-1 flex-col">
        <DashboardTopbar />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
