'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeftIcon } from 'lucide-react';
import { generateTemplate, createUserTemplate } from '@/lib/templates/actions';

const GOALS = ['promote new course', 'announce new product', 'run a discount', 're-engage inactive members', 'invite to webinar', 'upsell existing customers', 'build community engagement'];
const TONES = ['friendly', 'professional', 'urgent', 'casual', 'inspiring', 'direct'];
const AUDIENCES = ['new subscribers', 'existing customers', 'inactive members', 'all subscribers'];

export default function GenerateTemplatePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [goal, setGoal] = useState('');
  const [productType, setProductType] = useState('');
  const [tone, setTone] = useState('friendly');
  const [audience, setAudience] = useState('all subscribers');
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ subject: string; previewText: string; htmlBody: string; readingTime: number } | null>(null);
  const [saving, setSaving] = useState(false);

  function handleGenerate() {
    if (!goal.trim() || !productType.trim()) { setError('Goal and product type are required'); return; }
    setError(''); setResult(null);
    startTransition(async () => {
      const r = await generateTemplate({ goal, productType, tone, audience });
      if (r.success) setResult(r.data);
      else setError(r.error ?? 'Generation failed');
    });
  }

  async function handleUse() {
    if (!result) return;
    router.push(`/dashboard/campaigns/new?generatedSubject=${encodeURIComponent(result.subject)}&generatedHtml=${encodeURIComponent(result.htmlBody)}`);
  }

  async function handleSave() {
    if (!result) return;
    setSaving(true);
    const r = await createUserTemplate({ name: `AI: ${goal}`, category: 'custom', subject: result.subject, htmlBody: result.htmlBody, previewText: result.previewText });
    setSaving(false);
    if (r.success) router.push('/dashboard/templates');
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard/templates" className="flex items-center gap-1 hover:text-foreground">
          <ChevronLeftIcon className="h-4 w-4" /> Templates
        </Link>
        <span>/</span>
        <span className="text-foreground">AI Generate</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">✨ AI Template Generator</h1>
        <p className="mt-1 text-sm text-muted-foreground">Describe your campaign and Claude will write a complete email template</p>
      </div>

      <div className="space-y-4 rounded-lg border border-border bg-card p-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Campaign goal</label>
          <input value={goal} onChange={e => setGoal(e.target.value)} placeholder="e.g. promote new trading course"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <div className="mt-1 flex flex-wrap gap-1">
            {GOALS.map(g => (
              <button key={g} onClick={() => setGoal(g)} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground">{g}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Product / community type</label>
          <input value={productType} onChange={e => setProductType(e.target.value)} placeholder="e.g. stock trading course, fitness coaching, Discord community"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Tone of voice</label>
            <select value={tone} onChange={e => setTone(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              {TONES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Target audience</label>
            <select value={audience} onChange={e => setAudience(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              {AUDIENCES.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button onClick={handleGenerate} disabled={isPending}
        className="w-full rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
        {isPending ? '✨ Generating…' : '✨ Generate Template'}
      </button>

      {result && (
        <div className="space-y-4 rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Generated Template</h2>
            <span className="text-xs text-muted-foreground">~{result.readingTime} min read</span>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Subject</p>
            <p className="rounded-md bg-muted/40 px-3 py-2 text-sm font-medium text-foreground">{result.subject}</p>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Preview text</p>
            <p className="text-sm text-muted-foreground">{result.previewText}</p>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Email body</p>
            <div className="overflow-hidden rounded-md border border-border bg-white p-4">
              <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(result.htmlBody) }} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={handleUse}
              className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
              Use in campaign →
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50">
              {saving ? 'Saving…' : 'Save to my templates'}
            </button>
            <button onClick={handleGenerate} disabled={isPending}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50">
              Regenerate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
