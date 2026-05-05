'use server';

import { db } from '@/lib/db/client';
import { requireWorkspaceAccessOrThrow } from '@/lib/auth/session';

export async function submitBetaFeedback(data: { feature: string; rating: number; feedback: string }) {
  const { workspaceId, userId } = await requireWorkspaceAccessOrThrow();

  await db.betaFeedback.create({
    data: {
      workspaceId,
      userId,
      feature: data.feature,
      rating: data.rating,
      feedback: data.feedback || null,
    }
  });

  // Mark the specific quest as true now that it's submitted, so it doesn't pop up again
  // Wait, if it's already true, it will be skipped.
  // Actually, the best way to handle this is:
  // Layout detects completed but NOT submitted?
  // Let's use a "Submitted" flag in db.workspace.
  // questDomainSetupSubmitted
  
  // Wait, we can just check if a BetaFeedback exists for this feature in this workspace!
  // That's much cleaner than adding 4 more boolean flags.

  return { success: true };
}
