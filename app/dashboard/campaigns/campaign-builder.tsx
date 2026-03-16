'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Tag } from '@prisma/client';
import { createCampaign, updateCampaign, sendCampaignNow } from '@/lib/campaigns/actions';
import { createUserTemplate } from '@/lib/templates/actions';
import { VisualEditor } from '@/components/email-editor/visual-editor';
import { EmailPreview } from '@/components/email-editor/email-preview';
import { AiPanel } from '@/components/email-editor/ai-panel';
import { MonitorIcon, SmartphoneIcon, CodeIcon, EyeIcon, LayoutTemplateIcon, SparklesIcon, CheckIcon, ChevronLeftIcon, PlusIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface CampaignBuilderProps {
  tags: Tag[];
  segments?: { id: string; name: string; contactCount: number }[];
  fromName?: string;
  fromEmail?: string;
  audienceSize?: number;
  templateInitial?: { subject?: string; htmlBody?: string; previewText?: string; templateId?: string; userTemplateId?: string; };
  initial?: { id: string; name: string; subject: string; previewText?: string | null; htmlBody: string; audienceTagIds: string[]; audienceSegmentIds?: string[]; isAbTest: boolean; abSubjectB?: string | null; };
  startStep?: number;
}

const DEFAULT_HTML = `<h2>Hello {{firstName | fallback: 'there'}}!</h2>\n<p>Write your email content here. Keep it personal, valuable, and to the point.</p>\n<p>– {{senderName}}</p>`;
type EditorMode = 'visual' | 'html';
type Device = 'desktop' | 'mobile';

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function CampaignBuilder({
  tags, segments = [], fromName = 'Your Name', fromEmail = 'you@example.com',
  audienceSize = 0, initial, templateInitial, startStep = 1,
}: CampaignBuilderProps) {
  const router = useRouter();
  const [step, setStep] = useState(startStep);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateSaved, setTemplateSaved] = useState(false);
  const [savedCampaignId, setSavedCampaignId] = useState<string | null>(initial?.id ?? null);
  const [editorMode, setEditorMode] = useState<EditorMode>('visual');
  const [device, setDevice] = useState<Device>('desktop');

  // Step 1 state
  const [name, setName] = useState(initial?.name ?? '');
  const [subject, setSubject] = useState(initial?.subject ?? templateInitial?.subject ?? '');
  const [previewText, setPreviewText] = useState(initial?.previewText ?? templateInitial?.previewText ?? '');
  const [isAbTest, setIsAbTest] = useState(initial?.isAbTest ?? false);
  const [abSubjectB, setAbSubjectB] = useState(initial?.abSubjectB ?? '');

  // Step 2 state
  const [htmlBody, setHtmlBody] = useState(initial?.htmlBody ?? templateInitial?.htmlBody ?? DEFAULT_HTML);

  // Step 3 state
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(initial?.audienceTagIds ?? []);
  const [selectedSegmentIds, setSelectedSegmentIds] = useState<string[]>(initial?.audienceSegmentIds ?? []);
  const [sendResult, setSendResult] = useState<{ type: 'success' | 'partial' | 'error'; totalSent?: number; totalFailed?: number; message: string; } | null>(null);

  function toggleTag(id: string) { setSelectedTagIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]); }
  function toggleSegment(id: string) { setSelectedSegmentIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]); }

  async function handleSaveAndContinue() {
    setError(null); setIsLoading(true);
    try {
      const payload = { name, subject, previewText: previewText || undefined, htmlBody, audienceTagIds: selectedTagIds, audienceSegmentIds: selectedSegmentIds, isAbTest, abSubjectB: isAbTest ? abSubjectB : undefined };
      const result = initial?.id ? await updateCampaign(initial.id, payload) : await createCampaign(payload);
      if (!result.success) { setError(result.error ?? 'Failed to save'); return; }
      if ('data' in result && result.data?.id) setSavedCampaignId(result.data.id);
      setStep(3);
    } catch { setError('An unexpected error occurred.'); }
    finally { setIsLoading(false); }
  }

  async function handleSend() {
    if (!savedCampaignId) { await handleSaveAndContinue(); return; }
    setIsLoading(true);
    try {
      const result = await sendCampaignNow(savedCampaignId);
      if (result.success && result.data) {
        setSendResult({ type: result.data.totalFailed > 0 ? 'partial' : 'success', totalSent: result.data.totalSent, totalFailed: result.data.totalFailed, message: `Sent to ${result.data.totalSent} contacts${result.data.totalFailed > 0 ? `, ${result.data.totalFailed} failed` : ''}` });
      } else { setSendResult({ type: 'error', message: (!result.success && result.error) ? result.error : 'Send failed.' }); }
    } catch { setSendResult({ type: 'error', message: 'An unexpected error occurred.' }); }
    finally { setIsLoading(false); }
  }

  // ── Post-send success ──────────────────────────────────────────────────────

  if (sendResult?.type === 'success' || sendResult?.type === 'partial') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4 max-w-md">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full" style={{ background: 'rgba(34,197,94,0.12)' }}>
            <CheckIcon className="h-8 w-8 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white">{sendResult.type === 'success' ? 'Campaign sent!' : 'Campaign partially sent'}</h2>
          <p className="text-sm text-zinc-500">{sendResult.message}</p>
          <div className="flex justify-center gap-3 pt-2">
            <button onClick={() => router.push(`/dashboard/campaigns/${savedCampaignId}`)} className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white" style={{ background: '#22C55E' }}>View analytics</button>
            <button onClick={() => router.push('/dashboard/campaigns')} className="rounded-xl border border-zinc-800 px-5 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors">All campaigns</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step indicator (shared) ────────────────────────────────────────────────

  const STEPS = [{ n: 1, label: 'Details' }, { n: 2, label: 'Content' }, { n: 3, label: 'Review & Send' }];

  const StepIndicator = () => (
    <div className="flex items-center gap-2">
      {STEPS.map(({ n, label }, idx) => (
        <div key={n} className="flex items-center gap-2">
          {idx > 0 && <div className="h-px w-8" style={{ background: step > idx ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.08)' }} />}
          <div className="flex items-center gap-1.5">
            <div className={cn('flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold transition-all')}
              style={{
                background: step === n ? '#22C55E' : step > n ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)',
                color: step === n ? 'white' : step > n ? '#4ADE80' : '#4B5563',
              }}>
              {step > n ? <CheckIcon className="h-2.5 w-2.5" /> : n}
            </div>
            <span className="text-xs font-medium" style={{ color: step === n ? '#E2E8F0' : '#4B5563' }}>{label}</span>
          </div>
        </div>
      ))}
    </div>
  );

  // ── Step 1 ─────────────────────────────────────────────────────────────────

  if (step === 1) return (
    <div className="max-w-2xl mx-auto space-y-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}>
          {templateInitial ? 'Edit Campaign' : 'Create Campaign'}
        </h1>
        <StepIndicator />
      </div>

      <div className="rounded-2xl p-6 space-y-5" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
        <Field label="Campaign name" required>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. January newsletter" className={inputCls} />
        </Field>
        <Field label="Subject line" required>
          <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="What's this email about?" className={inputCls} />
          <p className="mt-1 text-xs text-zinc-600">{subject.length}/255 characters</p>
        </Field>
        <Field label="Preview text">
          <input type="text" value={previewText} onChange={e => setPreviewText(e.target.value)} placeholder="Short summary shown in inbox (optional)" className={inputCls} />
        </Field>

        <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={isAbTest} onChange={e => setIsAbTest(e.target.checked)} className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 accent-emerald-500" />
            <div>
              <p className="text-sm font-medium text-zinc-200">A/B subject test</p>
              <p className="text-xs text-zinc-600">Send two subject lines to split your audience</p>
            </div>
          </label>
          {isAbTest && (
            <Field label="Subject B">
              <input type="text" value={abSubjectB} onChange={e => setAbSubjectB(e.target.value)} placeholder="Alternate subject for 50% of recipients" className={inputCls} />
            </Field>
          )}
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex justify-end">
          <button onClick={() => {
            if (!name.trim()) { setError('Campaign name is required'); return; }
            if (!subject.trim()) { setError('Subject line is required'); return; }
            if (isAbTest && !abSubjectB.trim()) { setError('Subject B is required'); return; }
            setError(null); setStep(2);
          }} className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
            style={{ background: '#22C55E', boxShadow: '0 2px 12px rgba(34,197,94,0.3)' }}>
            Next: Content
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </div>
    </div>
  );

  // ── Step 2 — full-bleed writing workspace ─────────────────────────────────

  if (step === 2) return (
    <div className="flex flex-col -mx-6 -mt-6" style={{ height: 'calc(100vh - 56px)' }}>

      {/* ── Zone 1: Minimal header strip ── */}
      <div className="flex items-center justify-between px-6 py-2.5 flex-shrink-0"
        style={{ background: '#060C15', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-4">
          <button onClick={() => setStep(1)}
            className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-300 transition-colors">
            <ChevronLeftIcon className="h-3.5 w-3.5" /> Details
          </button>
          <div className="h-3 w-px bg-zinc-800" />
          <StepIndicator />
        </div>
        <div className="flex items-center gap-1">
          <Link href="/dashboard/templates"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-all">
            <LayoutTemplateIcon className="h-3 w-3" /> Templates
          </Link>
          <Link href="/dashboard/templates/generate"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-all">
            <SparklesIcon className="h-3 w-3" /> AI Write
          </Link>
          <div className="mx-1 h-3 w-px bg-zinc-800" />
          <div className="flex items-center rounded-lg overflow-hidden"
            style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
            {(['visual', 'html'] as const).map(mode => (
              <button key={mode} onClick={() => setEditorMode(mode)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium transition-all"
                style={{ color: editorMode === mode ? '#E2E8F0' : '#4B5563', background: editorMode === mode ? 'rgba(255,255,255,0.08)' : 'transparent' }}>
                {mode === 'visual' ? <EyeIcon className="h-3 w-3" /> : <CodeIcon className="h-3 w-3" />}
                {mode === 'visual' ? 'Visual' : 'HTML'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Zone 2: Writing workspace ── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* Editor column ~60% */}
        <div className="flex flex-col flex-[3] overflow-hidden min-w-0"
          style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>

          {/* Context strip — light bg matches writing surface */}
          <div className="flex items-center gap-4 px-5 py-2 flex-shrink-0 flex-wrap"
            style={{ background: '#F1F5F9', borderBottom: '1px solid #E2E8F0' }}>
            <button onClick={() => setStep(1)} className="flex items-center gap-1.5 group" title="Edit subject">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Subject</span>
              <span className="text-xs font-medium text-slate-600 group-hover:text-emerald-600 transition-colors truncate max-w-[220px]">
                {subject || <span className="text-slate-300">No subject — click to add</span>}
              </span>
            </button>
            {audienceSize > 0 && <>
              <span className="text-slate-300">·</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Audience</span>
                <span className="text-xs text-slate-500">{audienceSize.toLocaleString()} subscribers</span>
              </div>
            </>}
            {fromEmail && <>
              <span className="text-slate-300">·</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">From</span>
                <span className="text-xs text-slate-500 truncate max-w-[160px]">{fromEmail}</span>
              </div>
            </>}
          </div>

          {/* Writing surface */}
          <div className="flex-1 overflow-hidden">
            {editorMode === 'visual' ? (
              <VisualEditor value={htmlBody} onChange={setHtmlBody} />
            ) : (
              <div className="flex flex-col h-full">
                <div className="px-5 py-2 flex-shrink-0"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: '#0F1929' }}>
                  <span className="text-[10px] font-mono font-medium text-zinc-700">HTML Source</span>
                </div>
                <textarea value={htmlBody} onChange={e => setHtmlBody(e.target.value)}
                  spellCheck={false} className="flex-1 resize-none focus:outline-none"
                  style={{ background: '#080E1A', padding: '20px 28px', fontFamily: 'ui-monospace,monospace', fontSize: 12, lineHeight: 1.8, color: '#6EE7B7' }}
                  placeholder="Enter HTML here…" />
              </div>
            )}
          </div>

          {/* AI panel */}
          <div className="flex-shrink-0">
            <AiPanel subject={subject} htmlBody={htmlBody} audienceSize={audienceSize}
              onApplySubject={s => { setSubject(s); setStep(1); setTimeout(() => setStep(2), 50); }} />
          </div>

          {/* ── Zone 3: Bottom nav ── */}
          <div className="flex items-center justify-between px-6 py-3 flex-shrink-0"
            style={{ background: '#060C15', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button onClick={() => setStep(1)}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-200 transition-all active:scale-95"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              <ChevronLeftIcon className="h-4 w-4" /> Back
            </button>
            <button
              onClick={async () => {
                if (!subject.trim() || !htmlBody.trim()) return;
                const n = prompt('Template name:'); if (!n) return;
                const r = await createUserTemplate({ name: n, category: 'custom', subject, htmlBody, previewText: previewText || undefined });
                if (r.success) alert('Saved!');
              }}
              disabled={!htmlBody.trim() || !subject.trim()}
              className="text-sm font-medium text-zinc-700 hover:text-zinc-300 transition-colors disabled:opacity-30">
              Save as template
            </button>
            <button onClick={() => { if (!htmlBody.trim()) return; setStep(3); }}
              disabled={!htmlBody.trim()}
              className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40 active:scale-95"
              style={{ background: '#22C55E', boxShadow: '0 4px 16px rgba(34,197,94,0.35)' }}>
              Next: Review
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        </div>

        {/* Preview column ~40% */}
        <div className="flex-[2] overflow-hidden flex flex-col min-w-0">
          <EmailPreview subject={subject} fromName={fromName} fromEmail={fromEmail}
            htmlBody={htmlBody} device={device} onDeviceChange={setDevice} />
        </div>
      </div>
    </div>
  );

  // ── Step 3 ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto space-y-5 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}>Review & Send</h1>
        <StepIndicator />
      </div>

      {/* Audience */}
      <div className="rounded-2xl p-6 space-y-4" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h2 className="text-sm font-semibold text-zinc-200">Audience</h2>
        <p className="text-sm text-zinc-500">
          {selectedTagIds.length === 0 && selectedSegmentIds.length === 0
            ? 'Sending to all subscribed contacts'
            : [selectedTagIds.length > 0 && `Tags: ${selectedTagIds.map(id => tags.find(t => t.id === id)?.name).filter(Boolean).join(', ')}`,
               selectedSegmentIds.length > 0 && `Segments: ${selectedSegmentIds.map(id => segments.find(s => s.id === id)?.name).filter(Boolean).join(', ')}`
              ].filter(Boolean).join(' · ')}
        </p>
        {tags.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-zinc-600">Filter by tag</p>
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <button key={tag.id} onClick={() => toggleTag(tag.id)}
                  className={cn('rounded-full px-3 py-1 text-xs font-medium transition-all', selectedTagIds.includes(tag.id) ? 'text-white ring-2 ring-emerald-500/50' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700')}
                  style={selectedTagIds.includes(tag.id) ? { backgroundColor: tag.color } : {}}>
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        )}
        {segments.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-zinc-600">Filter by segment</p>
            <div className="flex flex-wrap gap-2">
              {segments.map(seg => (
                <button key={seg.id} onClick={() => toggleSegment(seg.id)}
                  className={cn('rounded-full px-3 py-1 text-xs font-medium transition-all', selectedSegmentIds.includes(seg.id) ? 'bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/30' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700')}>
                  {seg.name}{seg.contactCount > 0 && <span className="ml-1 opacity-50">({seg.contactCount})</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Review summary */}
      <div className="rounded-2xl p-6 space-y-3" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h2 className="text-sm font-semibold text-zinc-200">Review</h2>
        {[['Campaign', name], ['Subject A', subject], ...(isAbTest ? [['Subject B', abSubjectB], ['Test type', '50/50 A/B split']] : []),
          ['Audience', selectedTagIds.length === 0 && selectedSegmentIds.length === 0 ? 'All subscribed contacts' : `${selectedTagIds.length} tag(s)${selectedSegmentIds.length > 0 ? ` + ${selectedSegmentIds.length} segment(s)` : ''}`]
        ].map(([label, value]) => (
          <div key={label} className="flex items-center justify-between text-sm">
            <span className="text-zinc-600">{label}</span>
            <span className="text-zinc-300 font-medium max-w-xs truncate text-right">{value}</span>
          </div>
        ))}
      </div>

      {sendResult?.type === 'error' && (
        <div className="rounded-xl p-4 text-sm text-red-400" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>{sendResult.message}</div>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex items-center justify-between pt-1">
        <button onClick={() => setStep(2)} disabled={isLoading}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-200 transition-all"
          style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
          <ChevronLeftIcon className="h-4 w-4" /> Back
        </button>
        <div className="flex gap-2">
          <button onClick={() => { setTemplateName(name || subject); setShowSaveTemplate(true); }}
            disabled={isLoading || !subject || !htmlBody}
            className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-200 transition-colors disabled:opacity-30"
            style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
            Save as template
          </button>
          {!savedCampaignId && (
            <button onClick={async () => {
              setIsLoading(true);
              const r = await createCampaign({ name, subject, previewText: previewText || undefined, htmlBody, audienceTagIds: selectedTagIds, isAbTest, abSubjectB: isAbTest ? abSubjectB : undefined });
              setIsLoading(false);
              if (r.success) router.push('/dashboard/campaigns'); else setError(r.error ?? 'Failed');
            }} disabled={isLoading}
              className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-200 transition-colors disabled:opacity-30"
              style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
              Save draft
            </button>
          )}
          <button onClick={savedCampaignId ? handleSend : handleSaveAndContinue} disabled={isLoading}
            className="rounded-xl px-6 py-2 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40 active:scale-95"
            style={{ background: '#22C55E', boxShadow: '0 4px 16px rgba(34,197,94,0.3)' }}>
            {isLoading ? 'Sending…' : savedCampaignId ? 'Send campaign' : 'Save & send'}
          </button>
        </div>
      </div>

      {/* Save template modal */}
      {showSaveTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6 shadow-2xl" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 className="mb-4 text-base font-semibold text-white">Save as Template</h2>
            {templateSaved ? (
              <div className="space-y-3">
                <p className="text-sm text-emerald-400">✓ Saved to your template library!</p>
                <button onClick={() => { setShowSaveTemplate(false); setTemplateSaved(false); }} className="w-full rounded-xl border border-zinc-700 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800">Close</button>
              </div>
            ) : (
              <div className="space-y-3">
                <input value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="Template name"
                  className="w-full rounded-xl px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                <div className="flex gap-2">
                  <button onClick={async () => { const r = await createUserTemplate({ name: templateName || subject, category: 'custom', subject, htmlBody, previewText: previewText || undefined }); if (r.success) setTemplateSaved(true); }}
                    className="flex-1 rounded-xl py-2 text-sm font-semibold text-white" style={{ background: '#22C55E' }}>Save</button>
                  <button onClick={() => { setShowSaveTemplate(false); setTemplateSaved(false); }}
                    className="flex-1 rounded-xl border border-zinc-700 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800">Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-600">
        {label}{required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = 'flex h-10 w-full rounded-xl px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all bg-transparent';

// Trick: override the global inputCls with dark styles via a style prop workaround
// We apply inline bg/border on each input to match the dark theme
const _inputStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' };

// Patch — re-export Field with dark input support
// (inputs use className + explicit style via the parent component)
