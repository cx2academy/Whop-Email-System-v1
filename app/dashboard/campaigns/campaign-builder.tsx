'use client';

/**
 * app/dashboard/campaigns/campaign-builder.tsx
 *
 * Campaign builder — 3-step form.
 *   Step 1: Details (name, subject, A/B test)
 *   Step 2: Content — visual editor + live inbox preview side-by-side
 *   Step 3: Audience + review + send
 *
 * Backend logic (createCampaign, updateCampaign, sendCampaignNow) is unchanged.
 */

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Tag } from '@prisma/client';
import { createCampaign, updateCampaign, sendCampaignNow } from '@/lib/campaigns/actions';
import { createUserTemplate } from '@/lib/templates/actions';
import { VisualEditor } from '@/components/email-editor/visual-editor';
import { EmailPreview } from '@/components/email-editor/email-preview';
import { AiPanel } from '@/components/email-editor/ai-panel';
import {
  CodeIcon, EyeIcon, LayoutTemplateIcon, SparklesIcon,
  CheckIcon, ChevronLeftIcon, PlusIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CampaignBuilderProps {
  tags: Tag[];
  segments?: { id: string; name: string; contactCount: number }[];
  fromName?: string;
  fromEmail?: string;
  audienceSize?: number;
  templateInitial?: {
    subject?: string;
    htmlBody?: string;
    previewText?: string;
    templateId?: string;
    userTemplateId?: string;
  };
  initial?: {
    id: string;
    name: string;
    subject: string;
    previewText?: string | null;
    htmlBody: string;
    audienceTagIds: string[];
    audienceSegmentIds?: string[];
    isAbTest: boolean;
    abSubjectB?: string | null;
  };
  startStep?: number;
}

const DEFAULT_HTML = `<h2>Hello {{firstName | fallback: 'there'}}!</h2>
<p>Write your email content here. Keep it personal, valuable, and to the point.</p>
<p>– {{senderName}}</p>`;

type EditorMode = 'visual' | 'html';

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CampaignBuilder({
  tags,
  segments = [],
  fromName = 'Your Name',
  fromEmail = 'you@example.com',
  audienceSize = 0,
  initial,
  templateInitial,
  startStep = 1,
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

  // Step 1
  const [name, setName] = useState(initial?.name ?? '');
  const [subject, setSubject] = useState(initial?.subject ?? templateInitial?.subject ?? '');
  const [previewText, setPreviewText] = useState(initial?.previewText ?? templateInitial?.previewText ?? '');
  const [isAbTest, setIsAbTest] = useState(initial?.isAbTest ?? false);
  const [abSubjectB, setAbSubjectB] = useState(initial?.abSubjectB ?? '');

  // Step 2
  const [htmlBody, setHtmlBody] = useState(
    initial?.htmlBody ?? templateInitial?.htmlBody ?? DEFAULT_HTML
  );

  // Step 3
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(initial?.audienceTagIds ?? []);
  const [selectedSegmentIds, setSelectedSegmentIds] = useState<string[]>(initial?.audienceSegmentIds ?? []);
  const [sendResult, setSendResult] = useState<{
    type: 'success' | 'partial' | 'error';
    totalSent?: number;
    totalFailed?: number;
    message: string;
  } | null>(null);

  function toggleTag(id: string) {
    setSelectedTagIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  }
  function toggleSegment(id: string) {
    setSelectedSegmentIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  }

  // ---------------------------------------------------------------------------
  // Save draft (Step 2 → Step 3 gate)
  // ---------------------------------------------------------------------------

  async function handleSaveAndContinue() {
    setError(null);
    setIsLoading(true);
    try {
      const payload = {
        name, subject,
        previewText: previewText || undefined,
        htmlBody,
        audienceTagIds: selectedTagIds,
        audienceSegmentIds: selectedSegmentIds,
        isAbTest,
        abSubjectB: isAbTest ? abSubjectB : undefined,
      };
      const result = initial?.id
        ? await updateCampaign(initial.id, payload)
        : await createCampaign(payload);

      if (!result.success) { setError(result.error ?? 'Failed to save'); return; }
      if ('data' in result && result.data?.id) setSavedCampaignId(result.data.id);
      setStep(3);
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Send
  // ---------------------------------------------------------------------------

  async function handleSend() {
    if (!savedCampaignId) { await handleSaveAndContinue(); return; }
    setIsLoading(true);
    try {
      const result = await sendCampaignNow(savedCampaignId);
      if (result.success && result.data) {
        setSendResult({
          type: result.data.totalFailed > 0 ? 'partial' : 'success',
          totalSent: result.data.totalSent,
          totalFailed: result.data.totalFailed,
          message: `Sent to ${result.data.totalSent} contacts${result.data.totalFailed > 0 ? `, ${result.data.totalFailed} failed` : ''}`,
        });
      } else {
        setSendResult({ type: 'error', message: (!result.success && result.error) ? result.error : 'Send failed.' });
      }
    } catch {
      setSendResult({ type: 'error', message: 'An unexpected error occurred.' });
    } finally {
      setIsLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Post-send success
  // ---------------------------------------------------------------------------

  if (sendResult?.type === 'success' || sendResult?.type === 'partial') {
    return (
      <div className="rounded-xl border border-border bg-card p-12 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <CheckIcon className="h-7 w-7 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="mb-1 text-xl font-semibold text-foreground">
          {sendResult.type === 'success' ? 'Campaign sent!' : 'Campaign partially sent'}
        </h2>
        <p className="mb-6 text-sm text-muted-foreground">{sendResult.message}</p>
        <div className="flex justify-center gap-3">
          <button onClick={() => router.push(`/dashboard/campaigns/${savedCampaignId}`)}
            className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
            View analytics
          </button>
          <button onClick={() => router.push('/dashboard/campaigns')}
            className="rounded-md border border-border px-5 py-2 text-sm font-medium text-foreground hover:bg-muted">
            All campaigns
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Step indicator
  // ---------------------------------------------------------------------------

  const steps = [
    { n: 1, label: 'Details' },
    { n: 2, label: 'Content' },
    { n: 3, label: 'Review & Send' },
  ];

  return (
    <div className="space-y-5">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        {steps.map(({ n, label }, idx) => (
          <div key={n} className="flex items-center gap-2">
            {idx > 0 && <div className="h-px w-6 bg-border" />}
            <div className="flex items-center gap-1.5">
              <div className={cn(
                'flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold transition-colors',
                step === n ? 'bg-primary text-primary-foreground'
                  : step > n ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground'
              )}>
                {step > n ? <CheckIcon className="h-3 w-3" /> : n}
              </div>
              <span className={cn('text-xs', step === n ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                {label}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Step 1: Details ─────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-5">
          <h2 className="font-semibold text-foreground">Campaign details</h2>

          <Field label="Campaign name" required>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. January newsletter" className={inputCls} />
          </Field>

          <Field label="Subject line" required>
            <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
              placeholder="What's this email about?" className={inputCls} />
            <p className="mt-1 text-xs text-muted-foreground">{subject.length}/255 characters</p>
          </Field>

          <Field label="Preview text">
            <input type="text" value={previewText} onChange={(e) => setPreviewText(e.target.value)}
              placeholder="Short summary shown in inbox (optional)" className={inputCls} />
          </Field>

          {/* A/B test */}
          <div className="rounded-lg border border-border p-4 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={isAbTest} onChange={(e) => setIsAbTest(e.target.checked)}
                className="h-4 w-4 rounded border-border" />
              <div>
                <p className="text-sm font-medium text-foreground">A/B subject test</p>
                <p className="text-xs text-muted-foreground">Send two subject lines to split your audience</p>
              </div>
            </label>
            {isAbTest && (
              <Field label="Subject B">
                <input type="text" value={abSubjectB} onChange={(e) => setAbSubjectB(e.target.value)}
                  placeholder="Alternate subject for 50% of recipients" className={inputCls} />
              </Field>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end">
            <button
              onClick={() => {
                if (!name.trim()) { setError('Campaign name is required'); return; }
                if (!subject.trim()) { setError('Subject line is required'); return; }
                if (isAbTest && !abSubjectB.trim()) { setError('Subject B is required'); return; }
                setError(null); setStep(2);
              }}
              className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Next: Content →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Editor + Preview ────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4">

          {/* Top bar — subject display + mode toggle + secondary links */}
          <div className="flex items-center justify-between gap-4">
            {/* Subject pill */}
            <button onClick={() => setStep(1)}
              className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-1.5 text-sm text-foreground hover:bg-muted transition-colors max-w-sm truncate">
              <span className="text-muted-foreground text-xs">Subject:</span>
              <span className="truncate font-medium">{subject || 'No subject'}</span>
              <span className="text-xs text-primary shrink-0">Edit</span>
            </button>

            {/* Right controls */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Secondary links — no borders, just text */}
              <Link href={`/dashboard/templates`}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <LayoutTemplateIcon className="h-3 w-3" /> Templates
              </Link>
              <Link href="/dashboard/templates/generate"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <SparklesIcon className="h-3 w-3" /> Generate
              </Link>
              {/* Mode toggle */}
              <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/50 p-0.5">
                <button onClick={() => setEditorMode('visual')}
                  className={cn('rounded px-2.5 py-1 text-xs font-medium transition-all',
                    editorMode === 'visual' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                  <EyeIcon className="inline h-3 w-3 mr-1" />Visual
                </button>
                <button onClick={() => setEditorMode('html')}
                  className={cn('rounded px-2.5 py-1 text-xs font-medium transition-all',
                    editorMode === 'html' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                  <CodeIcon className="inline h-3 w-3 mr-1" />HTML
                </button>
              </div>
            </div>
          </div>

          {/* Main workspace — editor 70% / preview 30% */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]" style={{ minHeight: 560 }}>

            {/* Editor — clean white card, no heavy border */}
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm" style={{ minHeight: 540 }}>
              {editorMode === 'visual' ? (
                <VisualEditor value={htmlBody} onChange={setHtmlBody} />
              ) : (
                <div className="flex flex-col h-full">
                  <div className="border-b border-border/60 px-4 py-2">
                    <span className="text-xs text-muted-foreground font-mono">HTML</span>
                  </div>
                  <textarea value={htmlBody} onChange={(e) => setHtmlBody(e.target.value)}
                    spellCheck={false}
                    className="flex-1 resize-none bg-background px-5 py-4 font-mono text-xs leading-relaxed text-foreground focus:outline-none"
                    style={{ minHeight: 500 }}
                    placeholder="Enter HTML here…" />
                </div>
              )}
              {/* AI Panel — collapsible drawer at bottom of editor */}
              <AiPanel
                subject={subject}
                htmlBody={htmlBody}
                audienceSize={audienceSize}
                onApplySubject={(s) => { setSubject(s); setStep(1); setTimeout(() => setStep(2), 50); }}
              />
            </div>

            {/* Preview — no border, no bg box, just the preview itself */}
            <div style={{ minHeight: 540 }}>
              <EmailPreview subject={subject} fromName={fromName} fromEmail={fromEmail} htmlBody={htmlBody} />
            </div>
          </div>

          {!htmlBody.trim() && <p className="text-sm text-destructive">Email body is required</p>}

          {/* Bottom actions — one primary, one quiet secondary */}
          <div className="flex items-center justify-between pt-1">
            <button onClick={() => setStep(1)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeftIcon className="h-4 w-4" /> Back
            </button>
            <div className="flex items-center gap-4">
              <button
                onClick={async () => {
                  if (!subject.trim() || !htmlBody.trim()) return;
                  const n = prompt('Template name:');
                  if (!n) return;
                  const r = await createUserTemplate({ name: n, category: 'custom', subject, htmlBody, previewText: previewText || undefined });
                  if (r.success) alert('Template saved!');
                }}
                disabled={!htmlBody.trim() || !subject.trim()}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
              >
                Save as template
              </button>
              <button onClick={() => { if (!htmlBody.trim()) return; setStep(3); }}
                disabled={!htmlBody.trim()}
                className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed">
                Next: Review →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 3: Audience + Review + Send ────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-4">
          {/* Audience */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div>
              <h2 className="font-semibold text-foreground">Audience</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {selectedTagIds.length === 0 && selectedSegmentIds.length === 0
                  ? 'Sending to all subscribed contacts'
                  : [
                      selectedTagIds.length > 0 && `Tags: ${selectedTagIds.map((id) => tags.find((t) => t.id === id)?.name).filter(Boolean).join(', ')}`,
                      selectedSegmentIds.length > 0 && `Segments: ${selectedSegmentIds.map((id) => segments.find((s) => s.id === id)?.name).filter(Boolean).join(', ')}`,
                    ].filter(Boolean).join(' · ')}
              </p>
            </div>

            {tags.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Filter by tag</p>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <button key={tag.id} onClick={() => toggleTag(tag.id)}
                      className={cn(
                        'rounded-full px-3 py-1 text-xs font-medium transition-all',
                        selectedTagIds.includes(tag.id)
                          ? 'text-white ring-2 ring-offset-1 ring-primary'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      )}
                      style={selectedTagIds.includes(tag.id) ? { backgroundColor: tag.color } : {}}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {segments.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Filter by segment</p>
                <div className="flex flex-wrap gap-2">
                  {segments.map((seg) => (
                    <button key={seg.id} onClick={() => toggleSegment(seg.id)}
                      className={cn(
                        'rounded-full px-3 py-1 text-xs font-medium transition-all',
                        selectedSegmentIds.includes(seg.id)
                          ? 'bg-primary text-primary-foreground ring-2 ring-offset-1 ring-primary'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      )}
                    >
                      {seg.name}
                      {seg.contactCount > 0 && <span className="ml-1 opacity-60">({seg.contactCount})</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Review */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <h2 className="font-semibold text-foreground">Review</h2>
            <ReviewRow label="Campaign" value={name} />
            <ReviewRow label="Subject A" value={subject} />
            {isAbTest && <ReviewRow label="Subject B" value={abSubjectB} />}
            {isAbTest && <ReviewRow label="Test type" value="50/50 A/B split" />}
            <ReviewRow
              label="Audience"
              value={
                selectedTagIds.length === 0 && selectedSegmentIds.length === 0
                  ? 'All subscribed contacts'
                  : [`${selectedTagIds.length} tag(s)`, selectedSegmentIds.length > 0 && `${selectedSegmentIds.length} segment(s)`].filter(Boolean).join(' + ')
              }
            />
          </div>

          {sendResult?.type === 'error' && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {sendResult.message}
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex items-center justify-between">
            <button onClick={() => setStep(2)} disabled={isLoading}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
              <ChevronLeftIcon className="h-4 w-4" /> Back
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => { setTemplateName(name || subject); setShowSaveTemplate(true); }}
                disabled={isLoading || !subject || !htmlBody}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
              >
                Save as template
              </button>
              {!savedCampaignId && (
                <button
                  onClick={async () => {
                    setIsLoading(true);
                    const r = await createCampaign({ name, subject, previewText: previewText || undefined, htmlBody, audienceTagIds: selectedTagIds, isAbTest, abSubjectB: isAbTest ? abSubjectB : undefined });
                    setIsLoading(false);
                    if (r.success) router.push('/dashboard/campaigns');
                    else setError(r.error ?? 'Failed to save');
                  }}
                  disabled={isLoading}
                  className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
                >
                  Save draft
                </button>
              )}
              <button
                onClick={savedCampaignId ? handleSend : handleSaveAndContinue}
                disabled={isLoading}
                className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? 'Sending…' : savedCampaignId ? 'Send campaign' : 'Save & send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save as Template Modal */}
      {showSaveTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
            <h2 className="mb-4 text-base font-semibold text-foreground">Save as Template</h2>
            {templateSaved ? (
              <div className="space-y-3">
                <p className="text-sm text-green-600">✓ Template saved to your library!</p>
                <button onClick={() => { setShowSaveTemplate(false); setTemplateSaved(false); }}
                  className="w-full rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
                  Close
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <input value={templateName} onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Template name"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      const r = await createUserTemplate({ name: templateName || subject, category: 'custom', subject, htmlBody, previewText: previewText || undefined });
                      if (r.success) setTemplateSaved(true);
                    }}
                    className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                  >
                    Save
                  </button>
                  <button onClick={() => { setShowSaveTemplate(false); setTemplateSaved(false); }}
                    className="flex-1 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-foreground">
        {label}{required && <span className="ml-1 text-destructive">*</span>}
      </label>
      {children}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-xs truncate text-right font-medium text-foreground">{value}</span>
    </div>
  );
}

const inputCls =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
