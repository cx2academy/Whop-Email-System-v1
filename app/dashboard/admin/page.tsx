import { db } from '@/lib/db/client';
import { formatNumber } from '@/lib/utils';
import { TrendingUpIcon, UsersIcon, MailIcon, GlobeIcon } from 'lucide-react';

export default async function AdminOverviewPage() {
  const [
    totalRevenueResult,
    workspaceCount,
    userCount,
    emailVolume,
    recentWebhooks,
  ] = await Promise.all([
    db.purchase.aggregate({
      _sum: { amount: true },
    }),
    db.workspace.count(),
    db.user.count(),
    db.emailSend.count({
      where: { status: { in: ['SENT', 'DELIVERED', 'OPENED', 'CLICKED'] } },
    }),
    db.webhookLog.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { workspace: { select: { name: true } } },
    }),
  ]);

  const totalRevenue = totalRevenueResult._sum.amount || 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          label="Global Revenue" 
          value={`$${(totalRevenue / 100).toLocaleString()}`} 
          icon={<TrendingUpIcon className="h-4 w-4" />}
          sub="Total processed revenue"
        />
        <StatCard 
          label="Active Workspaces" 
          value={formatNumber(workspaceCount)} 
          icon={<GlobeIcon className="h-4 w-4" />}
          sub="Total connected companies"
        />
        <StatCard 
          label="Total Users" 
          value={formatNumber(userCount)} 
          icon={<UsersIcon className="h-4 w-4" />}
          sub="Registered accounts"
        />
        <StatCard 
          label="Email Volume" 
          value={formatNumber(emailVolume)} 
          icon={<MailIcon className="h-4 w-4" />}
          sub="Successful sends"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-sidebar-border bg-card p-6 shadow-sm">
          <h3 className="font-semibold mb-4">Recent Webhook Activity</h3>
          <div className="space-y-4">
            {recentWebhooks.map((log) => (
              <div key={log.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{log.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {log.workspace?.name || 'Unknown Workspace'} • {new Date(log.createdAt).toLocaleTimeString()}
                  </p>
                </div>
                <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  log.status === 200 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                }`}>
                  {log.status}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-sidebar-border bg-card p-6 shadow-sm">
          <h3 className="font-semibold mb-4">Platform Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <QuickAction label="View All Users" href="/dashboard/admin/users" />
            <QuickAction label="System Logs" href="/dashboard/admin/health" />
            <QuickAction label="Whop Dashboard" href="https://whop.com/dash" external />
            <QuickAction label="PostHog Analytics" href="https://us.posthog.com" external />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, sub }: { label: string; value: string; icon: React.ReactNode; sub: string }) {
  return (
    <div className="rounded-xl border border-sidebar-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="p-2 bg-brand-tint rounded-lg text-brand">
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}

import Link from 'next/link';
import { ExternalLinkIcon } from 'lucide-react';

function QuickAction({ label, href, external }: { label: string; href: string; external?: boolean }) {
  const Comp = external ? 'a' : Link;
  return (
    <Comp 
      href={href} 
      target={external ? "_blank" : undefined}
      className="flex items-center justify-between rounded-lg border border-sidebar-border p-3 text-sm font-medium hover:bg-muted transition-colors"
    >
      {label}
      {external && <ExternalLinkIcon className="h-3 w-3" />}
    </Comp>
  );
}
