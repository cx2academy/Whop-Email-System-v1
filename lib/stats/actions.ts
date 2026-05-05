'use server';

import { db } from '@/lib/db/client';
import { unstable_cache } from 'next/cache';

/**
 * Fetches aggregate platform-wide stats for the landing page.
 * Cached for 1 hour to prevent DB load.
 */
export const getPublicPlatformStats = unstable_cache(
  async () => {
    try {
      // Sum all revenue from all attributions across the platform
      const revenueResult = await db.revenueAttribution.aggregate({
        _sum: {
          revenue: true,
        },
      });

      // Count total users/creators
      const creatorCount = await db.workspace.count();

      // Count total emails sent
      const emailsSentResult = await db.emailCampaign.aggregate({
        _sum: {
          totalSent: true
        }
      });

      return {
        totalRevenue: revenueResult._sum.revenue || 0,
        creatorCount: creatorCount || 0,
        emailsSent: emailsSentResult._sum.totalSent || 0,
      };
    } catch (error) {
      console.error('Error fetching public stats:', error);
      return {
        totalRevenue: 0,
        creatorCount: 0,
        emailsSent: 0,
      };
    }
  },
  ['public-platform-stats'],
  { revalidate: 3600, tags: ['platform-stats'] }
);
