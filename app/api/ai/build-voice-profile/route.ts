import { NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/auth/session';
import { buildVoiceProfile } from '@/lib/ai/voice-profile';

// Rate limiting map (in-memory, resets on server restart)
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export async function POST(req: Request) {
  try {
    const { workspaceId } = await requireWorkspaceAccess();

    // Check rate limit
    const lastBuiltAt = rateLimitMap.get(workspaceId);
    if (lastBuiltAt && Date.now() - lastBuiltAt < RATE_LIMIT_WINDOW_MS) {
      return NextResponse.json(
        { error: 'Voice profile can only be built once per hour.' },
        { status: 429 }
      );
    }

    const result = await buildVoiceProfile(workspaceId);

    if (result.success) {
      rateLimitMap.set(workspaceId, Date.now());
      return NextResponse.json({ success: true, profile: result.profile });
    } else {
      return NextResponse.json(
        { error: 'Not enough data to build voice profile. Send more campaigns first.' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[buildVoiceProfile API error]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
