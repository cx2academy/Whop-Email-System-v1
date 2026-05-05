'use server';

/**
 * lib/segmentation/actions.ts
 * Server actions for segment CRUD, preview, and dashboard data.
 */

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { requireAdminAccess, requireWorkspaceAccess } from '@/lib/auth/session';
import { evaluateSegment, resolveSegmentContacts } from './segment-engine';
import type { SegmentRules } from './segment-engine';

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function createSegment(data: {
  name: string;
  description?: string;
  rules: SegmentRules;
}) {
  const { workspaceId } = await requireAdminAccess();

  const segment = await db.segment.create({
    data: {
      workspaceId,
      name: data.name,
      description: data.description,
      rules: JSON.stringify(data.rules),
    },
  });

  revalidatePath('/dashboard/segments');
  return { success: true as const, data: { segmentId: segment.id } };
}

export async function updateSegment(
  segmentId: string,
  data: { name?: string; description?: string; rules?: SegmentRules }
) {
  const { workspaceId } = await requireAdminAccess();

  await db.segment.updateMany({
    where: { id: segmentId, workspaceId },
    data: {
      ...(data.name        !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.rules       !== undefined && { rules: JSON.stringify(data.rules) }),
    },
  });

  revalidatePath('/dashboard/segments');
  return { success: true as const };
}

export async function deleteSegment(segmentId: string) {
  const { workspaceId } = await requireAdminAccess();
  await db.segment.deleteMany({ where: { id: segmentId, workspaceId } });
  revalidatePath('/dashboard/segments');
  return { success: true as const };
}

// ---------------------------------------------------------------------------
// Preview — evaluate rules and return count + sample contacts
// ---------------------------------------------------------------------------

export async function previewSegment(rules: SegmentRules) {
  const { workspaceId } = await requireWorkspaceAccess();

  const contactIds = await evaluateSegment(workspaceId, rules);

  // Fetch sample of 5 contacts
  const sample = await db.contact.findMany({
    where: { id: { in: contactIds.slice(0, 5) } },
    select: { email: true, firstName: true, lastName: true },
  });

  return {
    success: true as const,
    data: { count: contactIds.length, sample },
  };
}

export async function previewSavedSegment(segmentId: string) {
  const { workspaceId } = await requireWorkspaceAccess();

  const segment = await db.segment.findFirst({
    where: { id: segmentId, workspaceId },
  });
  if (!segment) return { success: false as const, error: 'Segment not found' };

  let rules: SegmentRules;
  try {
    rules = JSON.parse(segment.rules) as SegmentRules;
  } catch {
    return { success: false as const, error: 'Invalid rules' };
  }

  const contactIds = await evaluateSegment(workspaceId, rules);

  // Update cache
  await db.segment.update({
    where: { id: segmentId },
    data: { contactCount: contactIds.length, lastEvaluatedAt: new Date() },
  });

  const sample = await db.contact.findMany({
    where: { id: { in: contactIds.slice(0, 10) } },
    select: { email: true, firstName: true, lastName: true, status: true },
  });

  return {
    success: true as const,
    data: { count: contactIds.length, sample },
  };
}

// ---------------------------------------------------------------------------
// Dashboard data
// ---------------------------------------------------------------------------

export async function getSegments() {
  const { workspaceId } = await requireWorkspaceAccess();

  return db.segment.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getSegment(segmentId: string) {
  const { workspaceId } = await requireWorkspaceAccess();

  return db.segment.findFirst({
    where: { id: segmentId, workspaceId },
  });
}

export async function getSegmentsForCampaign() {
  const { workspaceId } = await requireWorkspaceAccess();

  return db.segment.findMany({
    where: { workspaceId },
    select: { id: true, name: true, contactCount: true, lastEvaluatedAt: true },
    orderBy: { name: 'asc' },
  });
}
