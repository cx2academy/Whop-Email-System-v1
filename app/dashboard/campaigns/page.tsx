/**
 * app/dashboard/campaigns/page.tsx
 *
 * Phase 7: "Write with AI" promoted to a first-class entry point.
 * Header now shows: Write with AI | AI sequence | New campaign
 * Empty state has 3 clear paths.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { SparklesIcon } from 'lucide-react';
import { requireWorkspaceAccess } from '@/lib/auth/session';
import { getCampaigns } from '@/lib/campaigns/actions';
import { CampaignsTable } from './campaigns-table';
import { db } from '@/lib/db/client';
import crypto from 'crypto';
import { CreationModal } from './creation-modal';

export const metadata: Metadata = { title: 'Campaigns' };

export default async function CampaignsPage() {
  const { workspaceRole } = await requireWorkspaceAccess();
  
  // Backfill sequenceId for existing campaigns
  const campaignsWithoutSequence = await db.emailCampaign.findMany({
    where: { sequenceId: null }
  });

  const sequenceMap = new Map<string, string>();
  for (const campaign of campaignsWithoutSequence) {
    let sequenceName: string | null = null;
    
    if (campaign.name.includes(' — Email ')) {
      sequenceName = campaign.name.split(' — Email ')[0];
    } else if (campaign.name.includes(' — Day ')) {
      sequenceName = campaign.name.split(' — Day ')[0];
    }

    if (sequenceName) {
      if (!sequenceMap.has(sequenceName)) {
        sequenceMap.set(sequenceName, crypto.randomUUID());
      }
      const sequenceId = sequenceMap.get(sequenceName);
      await db.emailCampaign.update({
        where: { id: campaign.id },
        data: { sequenceId }
      });
    }
  }

  const campaigns = await getCampaigns();
  const isAdmin = workspaceRole === 'OWNER' || workspaceRole === 'ADMIN';

  const sentCampaigns = campaigns.filter((c) => c.totalSent > 0);
  const totalRevenue  = sentCampaigns.reduce((s, c) => s + ((c as any).totalRevenue ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            Campaigns
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}
            {totalRevenue > 0 && (
              <span className="ml-2 font-semibold" style={{ color: '#16A34A' }}>
                · ${(totalRevenue / 100).toLocaleString()} attributed
              </span>
            )}
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <CreationModal />
          </div>
        )}
      </div>

      {/* Content */}
      {campaigns.length === 0 ? (
        <EmptyState isAdmin={isAdmin} />
      ) : (
        <CampaignsTable campaigns={campaigns} />
      )}
    </div>
  );
}

function EmptyState({ isAdmin }: { isAdmin: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl py-16 text-center"
      style={{ border: '1.5px dashed var(--sidebar-border)', background: 'var(--surface-card)' }}>
      <div className="flex h-14 w-14 items-center justify-center rounded-full mb-5"
        style={{ background: 'var(--surface-app)' }}>
        <svg className="h-6 w-6" style={{ color: 'var(--text-tertiary)' }} fill="none"
          viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
        No campaigns yet
      </p>
      <p className="text-xs max-w-xs mb-8" style={{ color: 'var(--text-tertiary)' }}>
        Create your first campaign. Not sure where to start? Let AI write it for you.
      </p>

      {isAdmin && (
        <div className="flex flex-col items-center gap-3">
          <CreationModal />
        </div>
      )}
    </div>
  );
}
