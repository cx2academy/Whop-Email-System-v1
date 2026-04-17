import { Suspense } from 'react';
import Link from 'next/link';
import { Plus, Zap, Play, Pause, Trash2, MoreVertical, Clock, Mail, Tag } from 'lucide-react';
import { getAutomations, getAutomationLogs } from '@/lib/automations/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AutomationStatus } from '@prisma/client';
import { AutomationsClient } from './automations-client';

export const metadata = {
  title: 'Automations | RevTray',
};

export default async function AutomationsPage() {
  const [automations, logs] = await Promise.all([
    getAutomations(),
    getAutomationLogs(),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Automations</h1>
          <p className="text-muted-foreground">
            Build automated customer journeys that run 24/7.
          </p>
        </div>
        <Link href="/dashboard/automations/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Automation
          </Button>
        </Link>
      </div>

      <AutomationsClient 
        automations={automations} 
        logs={logs}
        AutomationList={<AutomationList automations={automations} />}
      />
    </div>
  );
}

function AutomationList({ automations }: { automations: any[] }) {
  if (automations.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center py-12 text-center border-dashed">
        <div className="rounded-full bg-primary/10 p-4 mb-4">
          <Zap className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-xl">No automations yet</CardTitle>
        <CardDescription className="max-w-sm mt-2">
          Create your first automation or install a blueprint to start engaging your customers automatically.
        </CardDescription>
        <Link href="/dashboard/automations/new" className="mt-6">
          <Button variant="outline">Create Automation</Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {automations.map((automation) => (
        <Card key={automation.id} className="group relative overflow-hidden transition-all hover:shadow-md border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="line-clamp-1">{automation.name}</CardTitle>
                <CardDescription className="line-clamp-2 min-h-[2.5rem]">
                  {automation.description || 'No description provided.'}
                </CardDescription>
              </div>
              <AutomationActions automation={automation} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              <StatusBadge status={automation.status} />
              <Badge variant="secondary" className="gap-1">
                <Zap className="h-3 w-3" />
                {automation._count.enrollments} runs
              </Badge>
            </div>
            
            <div className="flex items-center justify-between mt-4 pt-4 border-t text-sm text-muted-foreground">
              <span>Updated {new Date(automation.updatedAt).toLocaleDateString()}</span>
              <Link href={`/dashboard/automations/${automation.id}`}>
                <Button variant="ghost" size="sm" className="h-8 group-hover:bg-primary group-hover:text-primary-foreground">
                  Open Builder
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: AutomationStatus }) {
  switch (status) {
    case 'ACTIVE':
      return <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>;
    case 'PAUSED':
      return <Badge variant="secondary">Paused</Badge>;
    case 'DISABLED':
      return <Badge variant="destructive">Disabled</Badge>;
    default:
      return <Badge variant="outline">Draft</Badge>;
  }
}

function AutomationActions({ automation }: { automation: any }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/automations/${automation.id}`}>Edit Builder</Link>
        </DropdownMenuItem>
        <DropdownMenuItem>
          {automation.status === 'ACTIVE' ? (
            <div className="flex items-center gap-2">
              <Pause className="h-4 w-4" /> Pause
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Play className="h-4 w-4" /> Activate
            </div>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem className="text-destructive">
          <div className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" /> Delete
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AutomationsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="h-[200px] animate-pulse bg-muted/50" />
      ))}
    </div>
  );
}
