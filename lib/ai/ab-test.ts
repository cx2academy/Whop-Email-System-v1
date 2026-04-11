import { groq } from '@/lib/ai/actions';
import { checkCredits, deductCredits } from '@/lib/ai/credits';
import { db } from '@/lib/db/client';
import { sendCampaign } from '@/lib/campaigns/send-engine';

export async function generateAbVariants(
  subject: string,
  htmlBody: string,
  productContext: string,
  workspaceId: string
): Promise<{ success: true; data: { variantA: string; variantB: string; strategy: string } } | { success: false; error: string }> {
  try {
    const _check = await checkCredits(workspaceId, 'generateAbVariants');
    if (!_check.allowed) {
      return { success: false, error: `Not enough AI credits. Need 2, have ${_check.currentBalance}.` };
    }

    const plainText = htmlBody.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 1500);

    const prompt = `ROLE: "You are a direct response email marketer who specializes in A/B testing subject lines. You have run thousands of tests and know exactly which psychological mechanisms produce measurably different open rates."

TASK: Generate 2 subject line variants for an A/B test that test DIFFERENT psychological mechanisms. They should be genuinely different, not just paraphrased versions of each other.

RULES:
  - Variant A and B must test DIFFERENT approaches: e.g. A = curiosity gap, B = direct benefit statement
  - Never test the same approach with different wording (that's not a real A/B test)
  - Each variant must be under 60 characters
  - Neither variant should be worse than the original — both should be improvements
  - The strategy field explains WHAT is being tested (e.g. "Testing curiosity gap vs. specific outcome")
  - Do NOT use spam trigger words in either variant

PSYCHOLOGICAL MECHANISMS TO CHOOSE FROM (pick 2 different ones):
  - Curiosity gap: implies something interesting without revealing it
  - Specific outcome: states a concrete result ("How I 3x'd my revenue in 30 days")
  - Social proof: references others' success or community
  - Urgency/scarcity: genuine time or availability constraint
  - Personal relevance: directly addresses the subscriber's situation
  - Contrarian: challenges a common assumption

OUTPUT JSON:
{
  "variantA": "<subject line>",
  "variantAMechanism": "<psychological mechanism used>",
  "variantB": "<subject line>",  
  "variantBMechanism": "<psychological mechanism used>",
  "strategy": "<what is being tested>"
}

Context:
Product/Brand: ${productContext}
Original Subject: ${subject}
Email Body:
${plainText}
`;

    const text = await groq(prompt, { maxTokens: 1000, jsonSchema: true });
    const parsed = JSON.parse(text);

    await deductCredits(workspaceId, 'generateAbVariants');

    return {
      success: true,
      data: {
        variantA: parsed.variantA,
        variantB: parsed.variantB,
        strategy: parsed.strategy,
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'AI request failed' };
  }
}

export async function pickAbWinner(campaignId: string): Promise<void> {
  try {
    const campaign = await db.emailCampaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        workspaceId: true,
        abTestVariantA: true,
        abTestVariantB: true,
        abTestSentACount: true,
        abTestSentBCount: true,
        abTestOpenedACount: true,
        abTestOpenedBCount: true,
        abTestStatus: true,
      },
    });

    if (!campaign) return;
    if (campaign.abTestStatus !== 'running') return;

    const sentA = campaign.abTestSentACount;
    const sentB = campaign.abTestSentBCount;
    const openedA = campaign.abTestOpenedACount;
    const openedB = campaign.abTestOpenedBCount;

    if (Math.min(sentA, sentB) < 30) {
      console.warn(`[pickAbWinner] Small list size for campaign ${campaignId}. Picking winner anyway.`);
    }

    const openRateA = sentA > 0 ? openedA / sentA : 0;
    const openRateB = sentB > 0 ? openedB / sentB : 0;

    let winnerSubject = campaign.abTestVariantA;
    let winnerVariant = "A";
    if (openRateB > openRateA + 0.005) { // B wins if it beats A by more than 0.5%
      winnerSubject = campaign.abTestVariantB;
      winnerVariant = "B";
    }

    await db.emailCampaign.update({
      where: { id: campaignId },
      data: {
        abTestWinnerSubject: winnerSubject,
        abWinnerVariant: winnerVariant,
        abTestWinnerPicked: true,
        abTestWinnerPickedAt: new Date(),
        abTestStatus: 'winner_picked',
        subject: winnerSubject || campaign.abTestVariantA || 'Winner', // update the main subject to the winner
      },
    });

    // Send to the remaining audience
    await sendCampaign({
      campaignId: campaign.id,
      workspaceId: campaign.workspaceId,
      isAbTestRemainder: true,
    });
  } catch (error) {
    console.error('[pickAbWinner] Error picking A/B test winner:', error);
  }
}
