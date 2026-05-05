import { NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/auth/session';
import { generateEmailVariants, VariantSpec } from '@/lib/ai/variant-generator';
import type { CampaignBrief } from '@/lib/ai/actions';

export async function POST(request: Request) {
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    const body = await request.json();
    const { brief, segments } = body as { brief: CampaignBrief; segments: VariantSpec[] };

    if (!brief || !segments || !Array.isArray(segments)) {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }

    if (segments.length < 2 || segments.length > 3) {
      return NextResponse.json({ success: false, error: 'Must provide 2 or 3 segments' }, { status: 400 });
    }

    const result = await generateEmailVariants(brief, segments, workspaceId);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error('[generate-variants] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
