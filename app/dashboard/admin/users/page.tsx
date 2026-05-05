import { db } from '@/lib/db/client';
import { formatNumber } from '@/lib/utils';
import { CreditUpdateForm } from './credit-update-form';
import { Badge } from '@/components/ui/badge';

export default async function AdminUsersPage() {
  const workspaces = await db.workspace.findMany({
    include: {
      memberships: {
        include: { user: true },
      },
      _count: {
        select: { contacts: true, campaigns: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-sidebar-border bg-card overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-sidebar-border">
            <tr>
              <th className="px-6 py-3">Workspace / Owner</th>
              <th className="px-6 py-3">Plan</th>
              <th className="px-6 py-3">Usage</th>
              <th className="px-6 py-3">AI Credits</th>
              <th className="px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sidebar-border">
            {workspaces.map((ws) => {
              const owner = ws.memberships.find(m => m.role === 'OWNER')?.user;
              return (
                <tr key={ws.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium">{ws.name}</div>
                    <div className="text-xs text-muted-foreground">{owner?.email || 'No owner'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={ws.plan === 'FREE' ? 'outline' : 'default'}>
                      {ws.plan}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs">
                      {formatNumber(ws._count.contacts)} contacts<br />
                      {formatNumber(ws._count.campaigns)} campaigns
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <CreditUpdateForm workspaceId={ws.id} currentCredits={ws.aiCredits} />
                  </td>
                  <td className="px-6 py-4">
                    {ws.abuseFlagged ? (
                      <Badge variant="destructive">FLAGGED</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">ACTIVE</Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
