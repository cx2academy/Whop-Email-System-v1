'use client';
import { useTransition } from 'react';
import Link from 'next/link';
import { deleteSegment, previewSavedSegment } from '@/lib/segmentation/actions';
import { useState } from 'react';

interface SegmentRowProps {
  segment: {
    id: string;
    name: string;
    description: string | null;
    contactCount: number;
    lastEvaluatedAt: string | null;
  };
  isAdmin: boolean;
}

export function SegmentRow({ segment, isAdmin }: SegmentRowProps) {
  const [isPending, startTransition] = useTransition();
  const [count, setCount] = useState(segment.contactCount);

  function handlePreview() {
    startTransition(async () => {
      const r = await previewSavedSegment(segment.id);
      if (r.success) setCount(r.data.count);
    });
  }

  function handleDelete() {
    if (!confirm('Delete this segment?')) return;
    startTransition(async () => {
      await deleteSegment(segment.id);
    });
  }

  return (
    <tr className="hover:bg-muted/30">
      <td className="px-4 py-3">
        <Link href={`/dashboard/segments/${segment.id}`}
          className="font-medium text-foreground hover:text-primary">
          {segment.name}
        </Link>
        {segment.description && (
          <p className="text-xs text-muted-foreground truncate max-w-xs">{segment.description}</p>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <button onClick={handlePreview} disabled={isPending}
          className="text-sm font-medium text-foreground hover:text-primary disabled:opacity-50"
          title="Click to refresh count">
          {isPending ? '…' : count > 0 ? count.toLocaleString() : '—'}
        </button>
      </td>
      <td className="px-4 py-3 text-right text-xs text-muted-foreground">
        {segment.lastEvaluatedAt
          ? new Date(segment.lastEvaluatedAt).toLocaleDateString()
          : 'Never'}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-2">
          <Link href={`/dashboard/segments/${segment.id}`}
            className="rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground hover:bg-muted">
            Edit
          </Link>
          {isAdmin && (
            <button onClick={handleDelete} disabled={isPending}
              className="rounded-md border border-destructive/40 px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50">
              Delete
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
