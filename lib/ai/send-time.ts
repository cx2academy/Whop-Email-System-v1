import { db } from '@/lib/db/client';

export interface ContactEngagementWindow {
  contactId: string;
  peakHour: number;    // 0-23 UTC
  peakDay: number;     // 0-6
  confidence: 'high' | 'medium' | 'low';  // based on sample size
}

export async function analyzeContactEngagement(workspaceId: string, contactId: string): Promise<ContactEngagementWindow | null> {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const opens = await db.emailSend.findMany({
    where: {
      workspaceId,
      contactId,
      status: 'OPENED',
      openedAt: { not: null, gte: ninetyDaysAgo },
    },
    select: { openedAt: true },
  });

  if (opens.length < 5) {
    return null;
  }

  const hourCounts = new Array(24).fill(0);
  const dayCounts = new Array(7).fill(0);

  for (const open of opens) {
    if (open.openedAt) {
      hourCounts[open.openedAt.getUTCHours()]++;
      dayCounts[open.openedAt.getUTCDay()]++;
    }
  }

  let peakHour = 0;
  let maxHourCount = 0;
  for (let i = 0; i < 24; i++) {
    if (hourCounts[i] > maxHourCount) {
      maxHourCount = hourCounts[i];
      peakHour = i;
    }
  }

  let peakDay = 0;
  let maxDayCount = 0;
  for (let i = 0; i < 7; i++) {
    if (dayCounts[i] > maxDayCount) {
      maxDayCount = dayCounts[i];
      peakDay = i;
    }
  }

  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (opens.length >= 10) confidence = 'high';
  else if (opens.length >= 5) confidence = 'medium';

  await db.contact.update({
    where: { id: contactId },
    data: {
      peakEngagementHour: peakHour,
      peakEngagementDay: peakDay,
      engagementAnalyzedAt: new Date(),
    },
  });

  return {
    contactId,
    peakHour,
    peakDay,
    confidence,
  };
}

export async function getOptimalSendTime(workspaceId: string, contactId: string, baseDate: Date): Promise<Date> {
  const contact = await db.contact.findUnique({
    where: { id: contactId },
    select: { peakEngagementHour: true, peakEngagementDay: true },
  });

  if (!contact || contact.peakEngagementHour === null || contact.peakEngagementDay === null) {
    return baseDate;
  }

  const { peakEngagementHour, peakEngagementDay } = contact;
  const optimalDate = new Date(baseDate);
  
  // Set to peak hour
  optimalDate.setUTCHours(peakEngagementHour, 0, 0, 0);

  // Find the next occurrence of peakDay
  let currentDay = optimalDate.getUTCDay();
  let daysToAdd = (peakEngagementDay - currentDay + 7) % 7;
  
  // If it's the same day but the peak hour has already passed, schedule for next week
  if (daysToAdd === 0 && optimalDate < baseDate) {
    daysToAdd = 7;
  }

  optimalDate.setUTCDate(optimalDate.getUTCDate() + daysToAdd);

  // If the optimal time is more than 72 hours away, just use the peak hour on the base date (or next day if passed)
  const hoursDiff = (optimalDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60);
  if (hoursDiff > 72) {
    const fallbackDate = new Date(baseDate);
    fallbackDate.setUTCHours(peakEngagementHour, 0, 0, 0);
    if (fallbackDate < baseDate) {
      fallbackDate.setUTCDate(fallbackDate.getUTCDate() + 1);
    }
    return fallbackDate;
  }

  return optimalDate;
}

export async function analyzeCampaignAudience(workspaceId: string, campaignId: string): Promise<{ analyzed: number; insufficient: number }> {
  const campaign = await db.emailCampaign.findUnique({
    where: { id: campaignId },
    select: { audienceTagIds: true, audienceSegmentIds: true },
  });

  if (!campaign) {
    throw new Error('Campaign not found');
  }

  const segmentIds: string[] = (campaign as any).audienceSegmentIds ?? [];
  let segmentContactIds: string[] = [];
  if (segmentIds.length > 0) {
    const { resolveSegmentContacts } = await import('@/lib/segmentation/segment-engine');
    segmentContactIds = await resolveSegmentContacts(workspaceId, segmentIds);
  }

  const hasTagFilter     = campaign.audienceTagIds.length > 0;
  const hasSegmentFilter = segmentContactIds.length > 0;

  let where: any = { workspaceId, status: 'SUBSCRIBED', email: { not: '' } };

  if (hasTagFilter && hasSegmentFilter) {
    where.OR = [
      { tags: { some: { tagId: { in: campaign.audienceTagIds } } } },
      { id: { in: segmentContactIds } },
    ];
  } else if (hasTagFilter) {
    where.tags = { some: { tagId: { in: campaign.audienceTagIds } } };
  } else if (hasSegmentFilter) {
    where.id = { in: segmentContactIds };
  }

  const contacts = await db.contact.findMany({
    where,
    select: { id: true, engagementAnalyzedAt: true },
  });

  let analyzed = 0;
  let insufficient = 0;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  for (const contact of contacts) {
    // Only re-analyze if it hasn't been analyzed in the last 30 days
    if (!contact.engagementAnalyzedAt || contact.engagementAnalyzedAt < thirtyDaysAgo) {
      const result = await analyzeContactEngagement(workspaceId, contact.id);
      if (result) {
        analyzed++;
      } else {
        insufficient++;
      }
    }
  }

  return { analyzed, insufficient };
}
