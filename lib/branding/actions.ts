'use server';

/**
 * lib/branding/actions.ts
 *
 * Server actions for workspace branding.
 *
 * Branding controls:
 *   - logoUrl    — workspace logo, shown in sidebar and email footer
 *   - brandColor — hex color for email CTA buttons (defaults to #22C55E)
 *   - fromName   — display name in "From" field (shared with workspace settings)
 *
 * Usage:
 *   import { saveBranding, getBranding } from '@/lib/branding/actions'
 */

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { requireWorkspaceAccess } from '@/lib/auth/session';
import type { ApiResponse } from '@/types';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const brandingSchema = z.object({
  logoUrl: z
    .string()
    .url('Logo URL must be a valid URL')
    .optional()
    .nullable(),
  brandColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Brand color must be a valid hex color (e.g. #22C55E)')
    .optional()
    .nullable(),
  fromName: z
    .string()
    .max(64, 'Display name must be under 64 characters')
    .optional()
    .nullable(),
  whopCompanyName: z
    .string()
    .max(128)
    .optional()
    .nullable(),
});

export type BrandingInput = z.infer<typeof brandingSchema>;

export interface WorkspaceBranding {
  logoUrl:         string | null;
  brandColor:      string;
  fromName:        string | null;
  whopCompanyName: string | null;
}

// ---------------------------------------------------------------------------
// saveBranding — update one or more branding fields
// ---------------------------------------------------------------------------

export async function saveBranding(
  rawData: BrandingInput
): Promise<ApiResponse<WorkspaceBranding>> {
  const { workspaceId } = await requireWorkspaceAccess();

  const parsed = brandingSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid branding data',
    };
  }

  // Only update fields that were explicitly passed (partial update)
  const updateData: Record<string, unknown> = {};
  if (parsed.data.logoUrl     !== undefined) updateData.logoUrl     = parsed.data.logoUrl;
  if (parsed.data.brandColor  !== undefined) updateData.brandColor  = parsed.data.brandColor;
  if (parsed.data.fromName    !== undefined) updateData.fromName    = parsed.data.fromName;
  if (parsed.data.whopCompanyName !== undefined) updateData.whopCompanyName = parsed.data.whopCompanyName;

  const updated = await db.workspace.update({
    where: { id: workspaceId },
    data: updateData,
    select: {
      logoUrl:         true,
      brandColor:      true,
      fromName:        true,
      whopCompanyName: true,
    },
  });

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/settings');

  return {
    success: true,
    data: {
      logoUrl:         updated.logoUrl,
      brandColor:      updated.brandColor ?? '#22C55E',
      fromName:        updated.fromName,
      whopCompanyName: updated.whopCompanyName,
    },
  };
}

// ---------------------------------------------------------------------------
// getBranding — fetch current branding for the workspace
// ---------------------------------------------------------------------------

export async function getBranding(): Promise<WorkspaceBranding> {
  const { workspaceId } = await requireWorkspaceAccess();

  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      logoUrl:         true,
      brandColor:      true,
      fromName:        true,
      whopCompanyName: true,
    },
  });

  return {
    logoUrl:         workspace?.logoUrl         ?? null,
    brandColor:      workspace?.brandColor      ?? '#22C55E',
    fromName:        workspace?.fromName        ?? null,
    whopCompanyName: workspace?.whopCompanyName ?? null,
  };
}

// ---------------------------------------------------------------------------
// resetBrandColor — reset to RevTray default green
// ---------------------------------------------------------------------------

export async function resetBrandColor(): Promise<ApiResponse<void>> {
  const { workspaceId } = await requireWorkspaceAccess();

  await db.workspace.update({
    where: { id: workspaceId },
    data: { brandColor: '#22C55E' },
  });

  revalidatePath('/dashboard/settings');
  return { success: true, data: undefined };
}
