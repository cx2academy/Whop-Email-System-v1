import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/auth/session';
import { checkCredits, deductCredits } from '@/lib/ai/credits';
import { subjectLinePrompt, copyImproverPrompt, engagementPredictorPrompt } from '@/lib/ai/prompts';

export type AiFeatureKey = 'optimizeSubjectLine' | 'improveEmailCopy' | 'predictEngagement';

function getPromptForFeature(feature: AiFeatureKey, payload: Record<string, any>): string {
  switch (feature) {
    case 'optimizeSubjectLine':
      return subjectLinePrompt(payload.subject, payload.productContext || '');
    case 'improveEmailCopy':
      return copyImproverPrompt(payload.subject, payload.htmlBody);
    case 'predictEngagement':
      return engagementPredictorPrompt(payload.subject, payload.htmlBody, payload.audienceSize || 0);
    default:
      throw new Error(`Unknown feature: ${feature}`);
  }
}

export async function POST(req: NextRequest) {
  let workspaceId: string;
  try {
    const session = await requireWorkspaceAccess();
    workspaceId = session.workspaceId;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { feature, payload } = body as { feature: AiFeatureKey; payload: Record<string, any> };

  if (!feature || !payload) {
    return NextResponse.json({ error: 'Missing feature or payload' }, { status: 400 });
  }

  const creditCheck = await checkCredits(workspaceId, feature as any);
  if (!creditCheck.allowed) {
    return NextResponse.json({ error: `Not enough AI credits.` }, { status: 402 });
  }

  let prompt: string;
  try {
    prompt = getPromptForFeature(feature, payload);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Invalid feature' }, { status: 400 });
  }

  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return NextResponse.json({ error: 'GROQ_API_KEY is not set' }, { status: 500 });
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1500,
      temperature: 0.7,
      stream: true,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    return NextResponse.json({ error: 'Groq API error' }, { status: response.status });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const reader = response.body?.getReader();
      if (!reader) {
        controller.close();
        return;
      }

      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(line => line.trim() !== '');
          for (const line of lines) {
            if (line === 'data: [DONE]') {
              continue;
            }
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                const content = data.choices[0]?.delta?.content;
                if (content) {
                  controller.enqueue(new TextEncoder().encode(content));
                }
              } catch (e) {
                // Ignore parse errors for incomplete chunks
              }
            }
          }
        }
      }
      controller.close();

      // Fire and forget credit deduction
      deductCredits(workspaceId, feature as any).catch(err => {
        console.error('Failed to deduct credits after stream:', err);
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  });
}
