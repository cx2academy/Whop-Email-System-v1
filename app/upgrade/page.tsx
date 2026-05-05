import type { Metadata } from 'next';
import { requireWorkspaceAccess } from '@/lib/auth/session';
import { UpgradePageClient } from './upgrade-client';

export const metadata: Metadata = { title: 'Upgrade Plan' };

export default async function UpgradePage() {
  const { workspaceId } = await requireWorkspaceAccess();
  
  return (
    <div className="min-h-screen w-full py-12 flex flex-col items-center justify-center bg-[#050505]">
      <UpgradePageClient workspaceId={workspaceId} />
    </div>
  );
}
