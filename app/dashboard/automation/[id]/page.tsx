/**
 * app/dashboard/automation/[id]/page.tsx
 * Workflow detail — view steps, enrollment history, and controls.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeftIcon } from 'lucide-react';
import { notFound } from 'next/navigation';
import { requireWorkspaceAccess } from '@/lib/auth/session';
import { getWorkflow } from '@/lib/automation/actions';
import { WorkflowControls } from './workflow-controls';

export const metadata: Metadata = { title: 'Workflow' };

export default async function WorkflowDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { workspaceRole } = await requireWorkspaceAccess();
  const workflow = await getWorkflow(params.id);
  if (!workflow) notFound();

  const isAdmin = workspaceRole === 'OWNER' || workspaceRole === 'ADMIN';

  const STATUS_STYLES: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700',
    DRAFT: 'bg-muted text-muted-foreground',
    PAUSED: 'bg-yellow-100 text-yellow-700',
    DISABLED: 'bg-red-100 text-red-700',
  };

  const STEP_ICONS: Record<string, string> = {
    TRIGGER: '⚡', DELAY: '⏱', SEND_EMAIL: '📧', ADD_TAG: '🏷', WEBHOOK: '🔗',
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard/automation" className="flex items-center gap-1 hover:text-foreground">
          <ChevronLeftIcon className="h-4 w-4" />
          Automation
        </Link>
        <span>/</span>
        <span className="text-foreground truncate">{workflow.name}</span>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">{workflow.name}</h1>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[workflow.status] ?? ''}`}>
              {workflow.status.toLowerCase()}
            </span>
          </div>
          {workflow.description && (
            <p className="mt-1 text-sm text-muted-foreground">{workflow.description}</p>
          )}
        </div>
        {isAdmin && (
          <WorkflowControls
            workflowId={workflow.id}
            status={workflow.status}
          />
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total runs',    value: workflow.totalRuns },
          { label: 'Emails sent',   value: workflow.totalEmailsSent },
          { label: 'Enrolled',      value: workflow._count.enrollments },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {workflow.status === 'DISABLED' && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          ⚠️ This workflow was auto-disabled after too many errors ({workflow.errorCount}). Fix the issues, then re-activate it.
        </div>
      )}

      {/* Steps */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Steps</h2>
        <div className="space-y-2">
          {workflow.steps.map((step, i) => {
            let configSummary = '';
            try {
              const c = JSON.parse(step.config);
              if (step.type === 'TRIGGER')    configSummary = c.triggerType ?? '';
              if (step.type === 'DELAY')      configSummary = `Wait ${c.amount} ${c.unit}`;
              if (step.type === 'SEND_EMAIL') configSummary = c.subject ?? '(no subject)';
              if (step.type === 'ADD_TAG')    configSummary = `Tag: ${c.tagName}`;
              if (step.type === 'WEBHOOK')    configSummary = `${c.method} ${c.url}`;
            } catch { /* empty */ }

            return (
              <div key={step.id} className="flex items-center gap-3 rounded-md border border-border bg-card px-4 py-3 text-sm">
                <span className="text-lg">{STEP_ICONS[step.type] ?? '•'}</span>
                <div>
                  <p className="font-medium text-foreground">{i + 1}. {step.type.replace('_', ' ')}</p>
                  {configSummary && <p className="text-xs text-muted-foreground">{configSummary}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recent enrollments */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Recent Enrollments</h2>
        {workflow.enrollments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No enrollments yet.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Contact</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Step</th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">Started</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {workflow.enrollments.map((e) => {
                  const badgeColors: Record<string, string> = {
                    ACTIVE: 'bg-blue-100 text-blue-700',
                    COMPLETED: 'bg-green-100 text-green-700',
                    FAILED: 'bg-red-100 text-red-700',
                    CANCELLED: 'bg-muted text-muted-foreground',
                  };
                  return (
                    <tr key={e.id} className="hover:bg-muted/30">
                      <td className="px-4 py-2 text-foreground">
                        {e.contact.firstName ? `${e.contact.firstName} ` : ''}{e.contact.email}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeColors[e.status] ?? ''}`}>
                          {e.status.toLowerCase()}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">{e.currentStep}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">
                        {e.startedAt.toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
