import { db } from '@/lib/db/client';
import { groq } from '@/lib/ai/actions';

export interface VoiceProfile {
  tone: string;
  vocabulary: string;
  avgSentenceLength: 'short' | 'medium' | 'long';
  ctaStyle: string;
  greetingStyle: string;
  signoffStyle: string;
  examplePhrases: string[];
}

export async function buildVoiceProfile(workspaceId: string): Promise<{ success: boolean; profile?: VoiceProfile }> {
  try {
    // 1. Find the last 5 COMPLETED campaigns for the workspace
    const campaigns = await db.emailCampaign.findMany({
      where: {
        workspaceId,
        status: 'COMPLETED',
      },
      orderBy: {
        sentAt: 'desc',
      },
      take: 5,
      select: {
        htmlBody: true,
      },
    });

    if (campaigns.length < 2) {
      return { success: false }; // Not enough data
    }

    // 2. Strip HTML tags to get plain text
    const samples = campaigns.map(c => 
      c.htmlBody.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    ).filter(text => text.length > 50); // Filter out empty or very short emails

    if (samples.length < 2) {
      return { success: false };
    }

    // 4. Build Groq prompt
    const prompt = `
Role: You are a writing style analyst who reads email copywriting samples and extracts the author's unique voice fingerprint.
Task: Analyze these email samples and extract a voice profile.

Rules:
- Focus on PATTERNS across multiple samples, not single occurrences.
- Vocabulary level should be simple/casual/professional/technical.
- Tone words should be specific (e.g. "conversational and direct" not just "friendly").
- Extract real example phrases verbatim from the text.
- If samples are too short or too generic, set fields to null.

Output: exact VoiceProfile JSON schema.

Email Samples:
${samples.map((s, i) => `--- Sample ${i + 1} ---\n${s}`).join('\n\n')}
`;

    const schema = {
      type: 'object',
      properties: {
        tone: { type: 'string', description: 'e.g. "direct and energetic, uses short punchy sentences"' },
        vocabulary: { type: 'string', description: 'e.g. "business-casual, avoids jargon, uses \'you\' heavily"' },
        avgSentenceLength: { type: 'string', enum: ['short', 'medium', 'long'] },
        ctaStyle: { type: 'string', description: 'e.g. "action verbs, creates urgency, e.g. \'Grab your spot now\'"' },
        greetingStyle: { type: 'string', description: 'e.g. "Hey {firstName},"' },
        signoffStyle: { type: 'string', description: 'e.g. "Talk soon, — {senderName}"' },
        examplePhrases: { type: 'array', items: { type: 'string' }, description: '3-5 actual phrases extracted from their emails' },
      },
      required: ['tone', 'vocabulary', 'avgSentenceLength', 'ctaStyle', 'greetingStyle', 'signoffStyle', 'examplePhrases'],
    };

    const result = await groq(prompt, {
      model: 'llama-3.3-70b-versatile',
      jsonSchema: schema,
      temperature: 0.2,
    });

    const profile = JSON.parse(result) as VoiceProfile;

    // 5. Parse result and save to workspace
    await db.workspace.update({
      where: { id: workspaceId },
      data: {
        voiceProfile: JSON.stringify(profile),
        voiceProfileBuiltAt: new Date(),
      },
    });

    // 6. Return success
    return { success: true, profile };
  } catch (error) {
    console.error('[buildVoiceProfile] Error:', error);
    return { success: false };
  }
}

export function injectVoiceProfile(basePrompt: string, profile: VoiceProfile | null): string {
  if (!profile) {
    return basePrompt;
  }

  return `${basePrompt}

CRITICAL VOICE REQUIREMENTS — The creator's emails have a distinct voice. Match it exactly:
- Tone: ${profile.tone}
- Vocabulary: ${profile.vocabulary}
- Sentence length: ${profile.avgSentenceLength}
- CTA style: ${profile.ctaStyle}
- Greeting: always use '${profile.greetingStyle}'
- Signoff: always use '${profile.signoffStyle}'
- Example phrases that fit this voice: ${profile.examplePhrases.join(' | ')}

Do NOT use generic marketing language. Write as if you ARE this creator.`;
}
