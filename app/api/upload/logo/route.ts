/**
 * app/api/upload/logo/route.ts
 *
 * Accepts a multipart form upload of a logo image, validates it,
 * converts it to a base64 data URL, and saves it to the workspace.
 *
 * No external storage needed — logos are small enough to store as
 * data URLs directly in the DB logoUrl field.
 *
 * Limits:
 *   - Max file size: 512KB
 *   - Allowed types: image/png, image/jpeg, image/webp, image/svg+xml
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/auth/session';
import { db } from '@/lib/db/client';
import { revalidatePath } from 'next/cache';

const MAX_BYTES = 512 * 1024; // 512KB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

export async function POST(req: NextRequest) {
  try {
    const { workspaceId } = await requireWorkspaceAccess();

    const formData = await req.formData();
    const file = formData.get('logo') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Use PNG, JPG, WebP, or SVG.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 512KB.' },
        { status: 400 }
      );
    }

    // Convert to base64 data URL
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    // Save to workspace
    await db.workspace.update({
      where: { id: workspaceId },
      data: { logoUrl: dataUrl },
    });

    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard');

    return NextResponse.json({ success: true, logoUrl: dataUrl });
  } catch (err: any) {
    console.error('[upload/logo]', err);
    return NextResponse.json(
      { error: err?.message ?? 'Upload failed.' },
      { status: 500 }
    );
  }
}
