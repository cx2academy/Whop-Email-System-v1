export function subjectLinePrompt(subject: string, productContext: string): string {
  return `You are an expert email marketer who has studied thousands of high-performing campaigns.

Analyze this email subject line and suggest 3 better alternatives.

Subject line: "${subject}"
Product/context: "${productContext}"

Rules:
1. Focus on curiosity gap, clear benefit, specificity, and urgency.
2. Use action verbs and avoid spam triggers.
3. Provide exactly 3 suggestions.
4. Keep subjects under 60 characters.
5. Do not use emojis unless highly relevant.

Respond ONLY with a JSON object, no markdown:
{
  "score": <1-10 integer rating of the original>,
  "weakness": "<one sentence: the main weakness of the original>",
  "suggestions": [
    { "subject": "<subject line>", "angle": "<curiosity|benefit|urgency|proof|story>", "why": "<one sentence explaining why this works>" }
  ]
}

Example of good output:
{
  "score": 4,
  "weakness": "Too generic and doesn't create a curiosity gap.",
  "suggestions": [
    { "subject": "The 3-step framework for closing deals", "angle": "benefit", "why": "Promises a specific, actionable framework." },
    { "subject": "Why your emails are being ignored", "angle": "curiosity", "why": "Piques interest by pointing out a common pain point." },
    { "subject": "Last chance to join the masterclass", "angle": "urgency", "why": "Creates a sense of urgency to drive immediate action." }
  ]
}`;
}

export function copyImproverPrompt(subject: string, plainText: string): string {
  return `You are a conversion copywriter who helps email marketers improve their campaigns.

Analyze this email for copywriting issues. Focus on: benefit-driven messaging (not feature-listing), strong CTAs, paragraph length, opening hook, and clarity.

Subject: "${subject}"
Body text: "${plainText}"

Rules:
1. Identify 2-4 specific issues in the copy.
2. Focus on real problems, not minor style preferences.
3. Ensure suggested rewrites are concise and punchy.
4. Evaluate the CTA strength and suggest an improvement if it's weak or moderate.
5. Keep paragraph suggestions under 80 characters for the 'before' snippet.

Return ONLY a JSON object (no markdown):
{
  "overallScore": <1-10>,
  "summary": "<one sentence overall assessment>",
  "ctaStrength": "<weak|moderate|strong>",
  "ctaSuggestion": "<improved CTA text if ctaStrength is weak or moderate, otherwise null>",
  "issues": [
    {
      "paragraph": <1-indexed number>,
      "type": "<benefit|cta|clarity|length|opening>",
      "issue": "<what is wrong, one sentence>",
      "before": "<original snippet max 80 chars>",
      "after": "<improved version>"
    }
  ]
}

Example of good output:
{
  "overallScore": 6,
  "summary": "Good value, but the opening is slow and paragraphs are too dense.",
  "ctaStrength": "weak",
  "ctaSuggestion": "Get your free template now",
  "issues": [
    {
      "paragraph": 1,
      "type": "opening",
      "issue": "The opening is too generic and doesn't hook the reader.",
      "before": "I hope this email finds you well. I wanted to talk about...",
      "after": "Ever wonder why your emails aren't converting?"
    }
  ]
}`;
}

export function engagementPredictorPrompt(subject: string, plainText: string, audienceSize: number): string {
  return `You are an email marketing analyst with deep knowledge of industry benchmarks.

Predict the likely performance of this email campaign based on the subject line and copy quality.

Industry benchmarks: creator/course emails average 25-35% open rate, 2-5% click rate.

Subject: "${subject}"
Body preview: "${plainText}"
List size: ${audienceSize} subscribers

Rules:
1. Provide realistic low and high estimates for open and click rates.
2. Identify the single biggest risk factor.
3. Identify the single biggest strength.
4. Provide one specific, actionable quick win to improve performance before sending.
5. Ensure the verdict reflects the predicted metrics.

Respond ONLY with JSON (no markdown):
{
  "openRate":   { "low": <number>, "high": <number>, "benchmark": 28 },
  "clickRate":  { "low": <number>, "high": <number>, "benchmark": 3 },
  "conversion": { "low": <number>, "high": <number> },
  "verdict":    "<strong|average|needs-work>",
  "topRisk":    "<biggest single risk factor, one sentence>",
  "topStrength":"<biggest strength, one sentence>",
  "quickWin":   "<one specific actionable thing to improve before sending, one sentence>"
}

Example of good output:
{
  "openRate": { "low": 20, "high": 25, "benchmark": 28 },
  "clickRate": { "low": 1.5, "high": 2.5, "benchmark": 3 },
  "conversion": { "low": 0.5, "high": 1.0 },
  "verdict": "needs-work",
  "topRisk": "The subject line is too long and might get cut off on mobile.",
  "topStrength": "The CTA is very clear and action-oriented.",
  "quickWin": "Shorten the subject line to under 50 characters to improve mobile open rates."
}`;
}
