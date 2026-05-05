/**
 * app/dashboard/automation/page.tsx
 * Auto-send — rich empty state, clear visual identity
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { PlusIcon, ZapIcon, PlayIcon, PauseIcon } from 'lucide-react';
import { requireWorkspaceAccess } from '@/lib/auth/session';
import { getWorkflows } from '@/lib/automation/actions';
import { WorkflowCard } from './workflow-card';

export const metadata: Metadata = { title: 'Auto-send' };

export default async function AutomationPage() {
  const { workspaceRole } = await requireWorkspaceAccess();
  const workflows = await getWorkflows();
  const isAdmin = workspaceRole === 'OWNER' || workspaceRole === 'ADMIN';
  const active = workflows.filter((w) => w.status === 'ACTIVE').length;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            Auto-send
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {workflows.length > 0
              ? `${workflows.length} workflow${workflows.length !== 1 ? 's' : ''} · ${active} active`
              : 'Emails that send themselves'}
          </p>
        </div>
        {isAdmin && workflows.length > 0 && (
          <Link
            href="/dashboard/automation/new"
            className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: 'var(--brand)', boxShadow: '0 2px 8px rgba(34,197,94,0.22)' }}
          >
            <PlusIcon className="h-4 w-4" />
            New workflow
          </Link>
        )}
      </div>

      {/* Empty state */}
      {workflows.length === 0 ? (
        <div className="space-y-4">

          {/* Primary empty state */}
          <div
            className="rounded-xl p-10 text-center"
            style={{ border: '1.5px dashed var(--sidebar-border)', background: 'var(--surface-card)' }}
          >
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl mb-5"
              style={{ background: '#F0F9FF' }}
            >
              <ZapIcon className="h-6 w-6" style={{ color: '#0284C7' }} />
            </div>
            <p className="text-base font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>
              Set emails to send automatically
            </p>
            <p className="text-sm max-w-sm mx-auto mb-6 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Trigger emails when someone joins your community, makes a purchase, or goes quiet. No manual work.
            </p>
            {isAdmin && (
              <Link
                href="/dashboard/automation/new"
                className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white"
                style={{ background: 'var(--brand)' }}
              >
                <PlusIcon className="h-4 w-4" />
                Create your first workflow
              </Link>
            )}
          </div>

          {/* Workflow idea cards */}
          <p className="text-xs font-semibold uppercase tracking-wider pt-2" style={{ color: 'var(--text-tertiary)' }}>
            Popular workflows
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { trigger: 'New member joins', action: 'Send welcome email', color: '#F0FDF4', icon: '👋', iconColor: '#16A34A' },
              { trigger: 'Purchase made', action: 'Send thank-you + upsell', color: '#FFF7ED', icon: '🎉', iconColor: '#EA580C' },
              { trigger: 'No opens in 30 days', action: 'Send re-engagement', color: '#F0F9FF', icon: '💤', iconColor: '#0284C7' },
            ].map((idea) => (
              <Link
                key={idea.trigger}
                href="/dashboard/automation/new"
                className="rounded-xl p-4 text-left transition-all hover:shadow-card-md"
                style={{ background: 'var(--surface-card)', border: '1px solid var(--sidebar-border)' }}
              >
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-xl mb-3 text-base"
                  style={{ background: idea.color }}
                >
                  {idea.icon}
                </div>
                <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--text-tertiary)' }}>
                  When: {idea.trigger}
                </p>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {idea.action}
                </p>
              </Link>
            ))}
          </div>
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
                triggerType: (() => {
                  const step0 = workflow.steps.find(s => s.type === 'TRIGGER');
                  if (!step0) return null;
                  try { return (JSON.parse(step0.config) as { triggerType?: string }).triggerType ?? null; }
                  catch { return null; }
                })(),
              }}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}
    </div>
  );
}
