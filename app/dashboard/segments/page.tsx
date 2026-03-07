/**
 * app/dashboard/segments/page.tsx
 * Segment list — all saved segments with size and controls.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { PlusIcon } from 'lucide-react';
import { requireWorkspaceAccess } from '@/lib/auth/session';
import { getSegments } from '@/lib/segmentation/actions';
import { SegmentRow } from './segment-row';

export const metadata: Metadata = { title: 'Segments' };

export default async function SegmentsPage() {
  const { workspaceRole } = await requireWorkspaceAccess();
  const segments = await getSegments();
  const isAdmin = workspaceRole === 'OWNER' || workspaceRole === 'ADMIN';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Segments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {segments.length} segment{segments.length !== 1 ? 's' : ''} — dynamic contact filters for targeted campaigns
          </p>
        </div>
        {isAdmin && (
          <Link href="/dashboard/segments/new"
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            <PlusIcon className="h-4 w-4" /> New segment
          </Link>
        )}
      </div>

      {/* Quick guide */}
      <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-1">How segments work</p>
        <p>Segments are dynamic filters — create rules like "has tag buyer AND opened email in last 30 days" and the segment automatically resolves to matching contacts when you send a campaign.</p>
      </div>

      {segments.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 py-20 text-center">
          <p className="text-sm font-medium text-foreground">No segments yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Create your first segment to target specific subscribers</p>
          {isAdmin && (
            <Link href="/dashboard/segments/new"
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
              <PlusIcon className="h-4 w-4" /> Create segment
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Segment</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Contacts</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Last evaluated</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {segments.map((seg) => (
                <SegmentRow
                  key={seg.id}
                  segment={{
                    id: seg.id,
                    name: seg.name,
                    description: seg.description,
                    contactCount: seg.contactCount,
                    lastEvaluatedAt: seg.lastEvaluatedAt?.toISOString() ?? null,
                  }}
                  isAdmin={isAdmin}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
