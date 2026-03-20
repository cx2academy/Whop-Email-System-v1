/**
 * app/dashboard/layout.tsx — RevTray dark dashboard shell
 */
import { requireWorkspaceAccess } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { DashboardTopbar } from "@/components/layout/dashboard-topbar";
import { CommandPalette } from "@/components/ui/command-palette";
import { AiCreditWarning } from "@/components/ui/ai-credits";
import { ClientProviders } from "@/components/ui/client-providers";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { workspaceId } = await requireWorkspaceAccess();

  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { aiCredits: true },
  });
  const aiCredits = workspace?.aiCredits ?? 0;

  return (
    <ClientProviders>
      <div className="flex min-h-screen" style={{ background: 'hsl(222 47% 6%)' }}>
        <DashboardSidebar />
        <div className="flex flex-1 flex-col min-w-0">
          <DashboardTopbar />
          <main className="flex-1 overflow-auto p-6 animate-fade-in">
            {aiCredits <= 5 && (
              <div className="mb-5">
                <AiCreditWarning initialBalance={aiCredits} />
              </div>
            )}
            {children}
          </main>
        </div>
        <CommandPalette />
      </div>
    </ClientProviders>
  );
}
