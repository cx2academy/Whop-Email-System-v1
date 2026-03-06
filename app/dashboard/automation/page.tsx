/**
 * app/dashboard/automation/page.tsx
 *
 * Automation workflows list — overview of all workflows with stats and controls.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { PlusIcon } from 'lucide-react';
import { requireWorkspaceAccess } from '@/lib/auth/session';
import { getWorkflows } from '@/lib/automation/actions';
import { WorkflowCard } from './workflow-card';

export const metadata: Metadata = { title: 'Automation' };

export default async function AutomationPage() {
  const { workspaceRole } = await requireWorkspaceAccess();
  const workflows = await getWorkflows();
  const isAdmin = workspaceRole === 'OWNER' || workspaceRole === 'ADMIN';

  const active   = workflows.filter((w) => w.status === 'ACTIVE').length;
  const disabled = workflows.filter((w) => w.status === 'DISABLED').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Automation</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {workflows.length} workflow{workflows.length !== 1 ? 's' : ''} · {active} active
            {disabled > 0 && <span className="ml-1 text-destructive">· {disabled} disabled</span>}
          </p>
        </div>
        {isAdmin && (
          <Link
            href="/dashboard/automation/new"
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <PlusIcon className="h-4 w-4" />
            New workflow
          </Link>
        )}
      </div>

      {workflows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 py-20 text-center">
          <p className="text-sm font-medium text-foreground">No workflows yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Create a workflow to automatically send emails based on triggers
          </p>
          {isAdmin && (
            <Link
              href="/dashboard/automation/new"
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              <PlusIcon className="h-4 w-4" />
              Create workflow
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {workflows.map((workflow) => (
            <WorkflowCard
              key={workflow.id}
              workflow={{
                id: workflow.id,
                name: workflow.name,
                description: workflow.description,
                status: workflow.status,
                totalRuns: workflow.totalRuns,
                totalEmailsSent: workflow.totalEmailsSent,
                lastTriggeredAt: workflow.lastTriggeredAt?.toISOString() ?? null,
                stepCount: workflow.steps.length,
                enrollmentCount: workflow._count.enrollments,
                errorCount: workflow.errorCount,
              }}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}
    </div>
  );
}
