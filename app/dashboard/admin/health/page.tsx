import { db } from '@/lib/db/client';
import { formatDistanceToNow } from 'date-fns';
import { ActivityIcon, AlertCircleIcon, ClockIcon, CheckCircle2Icon } from 'lucide-react';

export default async function AdminHealthPage() {
  const [
    pendingCount,
    failedCount,
    runningCount,
    recentJobs,
    recentLogs,
  ] = await Promise.all([
    db.automationJob.count({ where: { status: 'PENDING' } }),
    db.automationJob.count({ where: { status: 'FAILED' } }),
    db.automationJob.count({ where: { status: 'RUNNING' } }),
    db.automationJob.findMany({
      take: 10,
      orderBy: { updatedAt: 'desc' },
      include: { 
        workflow: { select: { name: true } },
        enrollment: { include: { contact: { select: { email: true } } } }
      },
    }),
    db.automationLog.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return (
    <div className="space-y-8">
      {/* Queue Status */}
      <div className="grid gap-4 md:grid-cols-3">
        <HealthStat 
          label="Pending Jobs" 
          value={pendingCount} 
          icon={<ClockIcon className="h-4 w-4" />} 
          color="text-blue-600"
          bg="bg-blue-50"
        />
        <HealthStat 
          label="Running Now" 
          value={runningCount} 
          icon={<ActivityIcon className="h-4 w-4" />} 
          color="text-amber-600"
          bg="bg-amber-50"
        />
        <HealthStat 
          label="Failed Jobs" 
          value={failedCount} 
          icon={<AlertCircleIcon className="h-4 w-4" />} 
          color="text-red-600"
          bg="bg-red-50"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Jobs */}
        <div className="rounded-xl border border-sidebar-border bg-card shadow-sm overflow-hidden">
          <div className="p-4 border-b border-sidebar-border bg-muted/30">
            <h3 className="font-semibold text-sm">Recent Queue Activity</h3>
          </div>
          <div className="divide-y divide-sidebar-border">
            {recentJobs.map((job) => (
              <div key={job.id} className="p-4 flex items-center justify-between text-sm">
                <div className="space-y-1">
                  <p className="font-medium">{job.workflow.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {job.enrollment.contact.email} • {formatDistanceToNow(new Date(job.updatedAt))} ago
                  </p>
                </div>
                <StatusBadge status={job.status} />
              </div>
            ))}
          </div>
        </div>

        {/* System Logs */}
        <div className="rounded-xl border border-sidebar-border bg-card shadow-sm overflow-hidden">
          <div className="p-4 border-b border-sidebar-border bg-muted/30">
            <h3 className="font-semibold text-sm">Automation Event Stream</h3>
          </div>
          <div className="divide-y divide-sidebar-border max-h-[500px] overflow-y-auto">
            {recentLogs.map((log) => (
              <div key={log.id} className="p-4 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-muted-foreground">
                    {formatDistanceToNow(new Date(log.createdAt))} ago
                  </span>
                  <span className={`font-bold uppercase tracking-tighter ${
                    log.event.includes('failed') ? 'text-red-500' : 'text-brand'
                  }`}>
                    {log.event}
                  </span>
                </div>
                <p className="text-foreground/80">{log.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function HealthStat({ label, value, icon, color, bg }: { label: string; value: number; icon: React.ReactNode; color: string; bg: string }) {
  return (
    <div className="rounded-xl border border-sidebar-border bg-card p-4 shadow-sm flex items-center gap-4">
      <div className={`p-3 rounded-lg ${bg} ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: 'bg-blue-100 text-blue-700',
    RUNNING: 'bg-amber-100 text-amber-700',
    COMPLETED: 'bg-green-100 text-green-700',
    FAILED: 'bg-red-100 text-red-700',
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${styles[status] || 'bg-muted text-muted-foreground'}`}>
      {status}
    </span>
  );
}
