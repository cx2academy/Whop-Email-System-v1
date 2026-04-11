import { prisma } from '@/lib/prisma';
import { groq } from '@/lib/ai/actions';

export async function analyzeCampaignPerformance(campaignId: string): Promise<void> {
  try {
    // 1. Fetch the campaign with its stats
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        workspaceId: true,
        subject: true,
        htmlBody: true,
        totalSent: true,
        totalOpened: true,
        totalClicked: true,
        totalUnsubscribed: true,
      },
    });

    if (!campaign || campaign.totalSent === 0) return;

    // 2. Fetch workspace's average stats across last 10 completed campaigns
    const recentCampaigns = await prisma.emailCampaign.findMany({
      where: {
        workspaceId: campaign.workspaceId,
        status: 'COMPLETED',
        id: { not: campaignId },
        totalSent: { gt: 0 },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        totalSent: true,
        totalOpened: true,
        totalClicked: true,
        totalUnsubscribed: true,
      },
    });

    // 3. Calculate metrics
    const openRate = campaign.totalOpened / campaign.totalSent;
    const clickRate = campaign.totalClicked / campaign.totalSent;
    const unsubscribeRate = campaign.totalUnsubscribed / campaign.totalSent;

    let avgOpenRate = 0;
    let avgUnsubscribeRate = 0;

    if (recentCampaigns.length > 0) {
      const totalRecentSent = recentCampaigns.reduce((sum, c) => sum + c.totalSent, 0);
      const totalRecentOpened = recentCampaigns.reduce((sum, c) => sum + c.totalOpened, 0);
      const totalRecentUnsubscribed = recentCampaigns.reduce((sum, c) => sum + c.totalUnsubscribed, 0);

      if (totalRecentSent > 0) {
        avgOpenRate = totalRecentOpened / totalRecentSent;
        avgUnsubscribeRate = totalRecentUnsubscribed / totalRecentSent;
      }
    }

    // 4. Determine if this campaign is notable
    let insightType: 'unsubscribe_risk' | 'low_engagement' | 'strong_performer' | null = null;

    if (avgUnsubscribeRate > 0 && unsubscribeRate > 2 * avgUnsubscribeRate) {
      insightType = 'unsubscribe_risk';
    } else if (avgOpenRate > 0 && openRate > 1.5 * avgOpenRate) {
      insightType = 'strong_performer';
    } else if (avgOpenRate > 0 && openRate < 0.5 * avgOpenRate) {
      insightType = 'low_engagement';
    }

    if (!insightType) return; // Not notable enough

    // Strip HTML to get plain text (first 2000 chars)
    const plainTextBody = campaign.htmlBody
      .replace(/<[^>]*>?/gm, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 2000);

    // 5. Call Groq
    const prompt = `ROLE: "You are an email marketing performance analyst. You review email campaign results and identify the specific content elements that caused unusual performance — either unusually high unsubscribes, exceptionally strong opens, or poor engagement."

RULES:
  - Be SPECIFIC — don't say "subject line could be better", say "the subject 'Weekly Update' is too vague and lacks a clear benefit or hook"
  - Identify 2-3 specific risk factors or success factors
  - Reference actual phrases from the email when citing problems
  - If unsubscribe rate is high, focus on: frequency fatigue, irrelevant content, misleading subject, hard-to-read formatting
  - If performance is strong, identify: what made the subject compelling, what CTA worked
  - Keep insight to 2-3 sentences

OUTPUT JSON FORMAT:
{
  "type": "${insightType}",
  "headline": "<8 words max summary>",
  "insight": "<2-3 sentence analysis>",
  "riskFactors": ["<specific factor 1>", "<specific factor 2>"],
  "confidence": "<high|medium|low>"
}

Analyze this campaign:
Subject: ${campaign.subject}
Body: ${plainTextBody}

Metrics:
- Sent: ${campaign.totalSent}
- Open Rate: ${(openRate * 100).toFixed(2)}% (Workspace Avg: ${(avgOpenRate * 100).toFixed(2)}%)
- Click Rate: ${(clickRate * 100).toFixed(2)}%
- Unsubscribe Rate: ${(unsubscribeRate * 100).toFixed(2)}% (Workspace Avg: ${(avgUnsubscribeRate * 100).toFixed(2)}%)

This campaign was flagged as: ${insightType}.
Generate the analysis.`;

    const text = await groq(prompt, { jsonSchema: true });
    const object = JSON.parse(text);

    // 6. Save result to CampaignInsight table
    await prisma.campaignInsight.upsert({
      where: { campaignId: campaign.id },
      update: {
        type: object.type,
        headline: object.headline,
        insight: object.insight,
        riskFactors: JSON.stringify(object.riskFactors),
        confidence: object.confidence,
      },
      create: {
        workspaceId: campaign.workspaceId,
        campaignId: campaign.id,
        type: object.type,
        headline: object.headline,
        insight: object.insight,
        riskFactors: JSON.stringify(object.riskFactors),
        confidence: object.confidence,
      },
    });
  } catch (error) {
    // 7. Catch own errors
    console.error('[CampaignAnalysis] Failed to analyze campaign:', error);
  }
}
