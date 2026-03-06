'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeftIcon } from 'lucide-react';
import { createUserTemplate } from '@/lib/templates/actions';

const CATEGORIES = [
  'course_launch', 'announcement', 'promotion', 'scarcity',
  'webinar', 'community', 'reengagement', 'upsell', 'custom',
];

export default function NewTemplatePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('custom');
  const [subject, setSubject] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [htmlBody, setHtmlBody] = useState('<p>Hi {{first_name}},</p>\n<p>Write your email here.</p>');
  const [error, setError] = useState('');

  function handleSave() {
    if (!name.trim() || !subject.trim() || !htmlBody.trim()) {
      setError('Name, subject, and body are required');
      return;
    }
    setError('');
    startTransition(async () => {
      const r = await createUserTemplate({ name, category, subject, htmlBody, previewText: previewText || undefined });
      if (r.success) router.push('/dashboard/templates');
      else setError(r.error ?? 'Failed');
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard/templates" className="flex items-center gap-1 hover:text-foreground">
          <ChevronLeftIcon className="h-4 w-4" /> Templates
        </Link>
        <span>/</span>
        <span className="text-foreground">New template</span>
      </div>
      <h1 className="text-2xl font-bold text-foreground">New Template</h1>

      <div className="space-y-4 rounded-lg border border-border bg-card p-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. My launch email"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Subject line</label>
          <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Use {{first_name}}, {{product_name}} etc."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Preview text <span className="font-normal text-muted-foreground">(optional)</span></label>
          <input value={previewText} onChange={e => setPreviewText(e.target.value)} placeholder="Short preview shown in inbox"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">HTML body</label>
          <textarea value={htmlBody} onChange={e => setHtmlBody(e.target.value)} rows={10}
            className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm" />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <button onClick={handleSave} disabled={isPending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
          {isPending ? 'Saving…' : 'Save template'}
        </button>
        <Link href="/dashboard/templates"
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
          Cancel
        </Link>
      </div>
    </div>
  );
}
