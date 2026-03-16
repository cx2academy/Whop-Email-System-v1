/**
 * app/dashboard/layout.tsx — RevTray dark dashboard shell
 */
import { requireWorkspaceAccess } from "@/lib/auth/session";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { DashboardTopbar } from "@/components/layout/dashboard-topbar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireWorkspaceAccess();
  return (
    <div className="flex min-h-screen" style={{ background: 'hsl(222 47% 6%)' }}>
      <DashboardSidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <DashboardTopbar />
        <main className="flex-1 overflow-auto p-6 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
