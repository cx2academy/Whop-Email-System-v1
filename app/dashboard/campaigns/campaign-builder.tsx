'use client';

/**
 * app/dashboard/campaigns/campaign-builder.tsx
 * RevTray campaign builder — 3 steps, minimal friction
 *
 * Changes from original:
 * - Step 1: name auto-generated from subject. Only subject + inbox preview shown.
 * - Step 1: A/B test moved to Step 3 advanced options (progressive disclosure)
 * - Step 1: Channel selector — Email, Whop DMs, or both  ← NEW
 * - Step 2: editor toolbar simplified — visual is default, no mode toggle visible
 * - "Inbox preview" label instead of "Preview text"
 * - Step indicator is clean pill style, not noisy
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Tag } from '@prisma/client';
import { createCampaign, updateCampaign, sendCampaignNow } from '@/lib/campaigns/actions';
import { createUserTemplate } from '@/lib/templates/actions';
import { VisualEditor } from '@/components/email-editor/visual-editor';
import { AiPanel } from '@/components/email-editor/ai-panel';
import {
  ChevronLeftIcon, CheckIcon, SparklesIcon, ChevronDownIcon, PlusIcon,
  MailIcon, MessageCircleIcon,
} from 'lucide-react';

interface CampaignBuilderProps {
  tags: Tag[];
  segments?: { id: string; name: string; contactCount: number }[];
  fromName?: string;
  fromEmail?: string;
  audienceSize?: number;
  templateInitial?: { subject?: string; htmlBody?: string; previewText?: string; templateId?: string; userTemplateId?: string };
  initial?: { id: string; name: string; subject: string; previewText?: string | null; htmlBody: string; audienceTagIds: string[]; audienceSegmentIds?: string[]; isAbTest: boolean; abSubjectB?: string | null; sendViaEmail?: boolean; sendViaWhopDm?: boolean };
  startStep?: number;
  /** Whether the workspace has a Whop API key configured */
  hasWhopApiKey?: boolean;
}

const DEFAULT_HTML = `<h2>Hello {{firstName | fallback: 'there'}}!</h2>\n<p>Write your email content here. Keep it personal, valuable, and to the point.</p>\n<p>– {{senderName}}</p>`;

export function CampaignBuilder({
  tags, segments = [], fromName = 'Your Name', fromEmail = 'you@example.com',
  audienceSize = 0, initial, templateInitial, startStep = 1, hasWhopApiKey = false,
}: CampaignBuilderProps) {
  const router = useRouter();
  const [step, setStep] = useState(startStep);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedCampaignId, setSavedCampaignId] = useState<string | null>(initial?.id ?? null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Step 1 — subject only (name auto-generated)
  const [subject, setSubject] = useState(initial?.subject ?? templateInitial?.subject ?? '');
  const [previewText, setPreviewText] = useState(initial?.previewText ?? templateInitial?.previewText ?? '');
  const [isAbTest, setIsAbTest] = useState(initial?.isAbTest ?? false);
  const [abSubjectB, setAbSubjectB] = useState(initial?.abSubjectB ?? '');

  // ── Channel flags ─────────────────────────────────────────────────────────
  const [sendViaEmail, setSendViaEmail] = useState(initial?.sendViaEmail ?? true);
  const [sendViaWhopDm, setSendViaWhopDm] = useState(initial?.sendViaWhopDm ?? false);

  // Step 2 — content
  const [htmlBody, setHtmlBody] = useState(initial?.htmlBody ?? templateInitial?.htmlBody ?? DEFAULT_HTML);
  const [showAi, setShowAi] = useState(false);

  // Step 3 — audience + send
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(initial?.audienceTagIds ?? []);
  const [selectedSegmentIds, setSelectedSegmentIds] = useState<string[]>(initial?.audienceSegmentIds ?? []);
  const [sendResult, setSendResult] = useState<{ type: 'success' | 'partial' | 'error'; totalSent?: number; totalFailed?: number; message: string } | null>(null);

  function toggleTag(id: string) { setSelectedTagIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]); }
  function toggleSegment(id: string) { setSelectedSegmentIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]); }

  // Auto-generate name from subject
  function getAutoName() {
    if (!subject) return 'Untitled campaign';
    const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${subject} · ${date}`;
  }

  async function handleNext() {
    if (step === 1) {
      if (!subject.trim()) { setError('Please enter a subject line.'); return; }
      if (!sendViaEmail && !sendViaWhopDm) { setError('Please select at least one delivery channel.'); return; }
      setError(null);
      setStep(2);
      return;
    }
    if (step === 2) {
      setError(null);
      setIsLoading(true);
      try {
        const payload = {
          name: initial?.name ?? getAutoName(),
          subject,
          previewText: previewText || undefined,
          htmlBody,
          audienceTagIds: selectedTagIds,
          audienceSegmentIds: selectedSegmentIds,
          isAbTest,
          abSubjectB: isAbTest ? abSubjectB : undefined,
          sendViaEmail,
          sendViaWhopDm,
        };
        const result = initial?.id
          ? await updateCampaign(initial.id, payload)
          : await createCampaign(payload);
        if (!result.success) { setError((result as any).error ?? (result as any).message ?? 'You have reached your plan limit. Please upgrade to create more campaigns.'); return; }
        if ('data' in result && ((result as any).data?.id || (result as any).data?.campaignId)) setSavedCampaignId((result as any).data?.id ?? (result as any).data?.campaignId);
        setStep(3);
      } catch { setError('An unexpected error occurred.'); }
      finally { setIsLoading(false); }
    }
  }

  async function handleSend() {
    const id = savedCampaignId;
    if (!id) return;
    setIsLoading(true);
    try {
      const result = await sendCampaignNow(id);
      if (result.success && result.data) {
        setSendResult({ type: result.data.totalFailed > 0 ? 'partial' : 'success', totalSent: result.data.totalSent, totalFailed: result.data.totalFailed, message: `Sent to ${result.data.totalSent} contacts${result.data.totalFailed > 0 ? `, ${result.data.totalFailed} failed` : ''}` });
      } else {
        setSendResult({ type: 'error', message: (!result.success && ((result as any).error || (result as any).message)) ? ((result as any).error ?? (result as any).message) : 'Send failed.' });
      }
    } catch { setSendResult({ type: 'error', message: 'An unexpected error occurred.' }); }
    finally { setIsLoading(false); }
  }

  // ── Success screen ─────────────────────────────────────────────────────

  if (sendResult?.type === 'success' || sendResult?.type === 'partial') {
    return (
      <div className="flex items-center justify-center min-h-[55vh]">
        <div className="text-center space-y-4 max-w-sm">
          <div
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
            style={{ background: 'var(--brand-tint)' }}
          >
            <CheckIcon className="h-8 w-8" style={{ color: 'var(--brand)' }} />
          </div>
          <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            Campaign sent
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{sendResult.message}</p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => router.push(`/dashboard/campaigns/${savedCampaignId}`)}
              className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white"
              style={{ background: 'var(--brand)' }}
            >
              View analytics
            </button>
            <button
              onClick={() => router.push('/dashboard/campaigns')}
              className="rounded-lg px-5 py-2.5 text-sm font-medium transition-colors hover:bg-[#F3F4F6]"
              style={{ border: '1px solid var(--sidebar-border)', color: 'var(--text-secondary)' }}
            >
              All campaigns
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step indicator ─────────────────────────────────────────────────────

  const STEPS = [
    { n: 1, label: 'Subject' },
    { n: 2, label: 'Content' },
    { n: 3, label: 'Send' },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back + Step indicator */}
      <div className="flex items-center justify-between mb-8">
        <Link
          href="/dashboard/campaigns"
          className="flex items-center gap-1.5 text-sm transition-colors hover:opacity-70"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ChevronLeftIcon className="h-4 w-4" />
          Campaigns
        </Link>

        <div className="flex items-center gap-1.5">
          {STEPS.map((s, i) => (
            <div key={s.n} className="flex items-center gap-1.5">
              <button
                onClick={() => s.n < step && setStep(s.n)}
                disabled={s.n > step}
                className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all"
                style={
                  s.n === step
                    ? { background: 'var(--brand)', color: '#fff' }
                    : s.n < step
                    ? { background: 'var(--brand-tint)', color: '#16A34A' }
                    : { background: 'var(--surface-app)', color: 'var(--text-tertiary)' }
                }
              >
                {s.n < step ? <CheckIcon className="h-3 w-3" /> : <span>{s.n}</span>}
                {s.label}
              </button>
              {i < STEPS.length - 1 && (
                <div className="w-4 h-px" style={{ background: 'var(--sidebar-border)' }} />
              )}
            </div>
          ))}
        </div>

        <div className="w-20" />
      </div>

      {/* Card */}
      <div
        className="rounded-2xl shadow-card-md"
        style={{ background: 'var(--surface-card)', border: '1px solid var(--sidebar-border)' }}
      >

        {/* ── Step 1: Subject ─────────────────────────────────────────── */}
        {step === 1 && (
          <div className="p-8">
            <h2 className="text-xl font-bold mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
              What's this email about?
            </h2>
            <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
              Write a subject line that makes subscribers want to open it.
            </p>

            <div className="space-y-5">
              {/* Subject */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Subject line
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Your most compelling one-liner"
                  autoFocus
                  className="w-full rounded-lg px-3.5 py-2.5 text-sm focus:outline-none transition-all"
                  style={{
                    border: '1.5px solid var(--sidebar-border)',
                    background: 'var(--surface-card)',
                    color: 'var(--text-primary)',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--brand)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--sidebar-border)')}
                />
              </div>

              {/* ── Delivery channels ── */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Send via
                </label>
                <div className="flex gap-3">
                  {/* Email toggle */}
                  <button
                    type="button"
                    onClick={() => setSendViaEmail((v) => !v)}
                    className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-all flex-1 justify-center"
                    style={
                      sendViaEmail
                        ? {
                            background: 'var(--brand-tint)',
                            border: '1.5px solid var(--brand)',
                            color: '#16A34A',
                          }
                        : {
                            background: 'var(--surface-app)',
                            border: '1.5px solid var(--sidebar-border)',
                            color: 'var(--text-secondary)',
                          }
                    }
                  >
                    <MailIcon className="h-4 w-4" />
                    Email
                    {sendViaEmail && <CheckIcon className="h-3.5 w-3.5 ml-auto" />}
                  </button>

                  {/* Whop DM toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!hasWhopApiKey && !sendViaWhopDm) return; // silently block — tooltip handles UX
                      setSendViaWhopDm((v) => !v);
                    }}
                    title={!hasWhopApiKey ? 'Add your Whop API key in Settings to enable DMs' : undefined}
                    className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-all flex-1 justify-center"
                    style={
                      sendViaWhopDm
                        ? {
                            background: 'var(--brand-tint)',
                            border: '1.5px solid var(--brand)',
                            color: '#16A34A',
                          }
                        : !hasWhopApiKey
                        ? {
                            background: 'var(--surface-app)',
                            border: '1.5px solid var(--sidebar-border)',
                            color: 'var(--text-tertiary)',
                            opacity: 0.55,
                            cursor: 'not-allowed',
                          }
                        : {
                            background: 'var(--surface-app)',
                            border: '1.5px solid var(--sidebar-border)',
                            color: 'var(--text-secondary)',
                          }
                    }
                  >
                    <MessageCircleIcon className="h-4 w-4" />
                    Whop DMs
                    {sendViaWhopDm && <CheckIcon className="h-3.5 w-3.5 ml-auto" />}
                    {!hasWhopApiKey && (
                      <span
                        className="ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                        style={{ background: 'var(--sidebar-border)', color: 'var(--text-tertiary)' }}
                      >
                        Setup required
                      </span>
                    )}
                  </button>
                </div>

                {/* Contextual hint */}
                {sendViaWhopDm && (
                  <p className="mt-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    Only members with a linked Whop account will receive DMs. The message will use your email body as plain text.
                  </p>
                )}
                {!hasWhopApiKey && (
                  <p className="mt-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    <Link href="/dashboard/settings" style={{ color: 'var(--brand)' }}>Add your Whop API key</Link> in Settings to enable Whop DM delivery.
                  </p>
                )}
              </div>

              {/* Inbox preview — only shown when email is selected */}
              {sendViaEmail && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      Inbox preview
                    </label>
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Optional</span>
                  </div>
                  <input
                    type="text"
                    value={previewText}
                    onChange={(e) => setPreviewText(e.target.value)}
                    placeholder="The sentence subscribers see before opening"
                    className="w-full rounded-lg px-3.5 py-2.5 text-sm focus:outline-none transition-all"
                    style={{
                      border: '1.5px solid var(--sidebar-border)',
                      background: 'var(--surface-card)',
                      color: 'var(--text-primary)',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--brand)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--sidebar-border)')}
                  />
                  {/* Inbox mockup hint */}
                  {(subject || previewText) && (
                    <div
                      className="mt-2.5 rounded-lg px-3.5 py-2.5"
                      style={{ background: 'var(--surface-app)', border: '1px solid var(--sidebar-border)' }}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
                        Inbox preview
                      </p>
                      <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {subject || 'Your subject line'}
                      </p>
                      <p className="text-[12px] truncate" style={{ color: 'var(--text-secondary)' }}>
                        {previewText || 'The start of your email content...'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Sender */}
              {sendViaEmail && (
                <div
                  className="rounded-lg px-3.5 py-3"
                  style={{ background: 'var(--surface-app)', border: '1px solid var(--sidebar-border)' }}
                >
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    Sending from <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{fromName} &lt;{fromEmail}&gt;</span>
                    {' ·'} <Link href="/dashboard/settings" className="transition-opacity hover:opacity-70" style={{ color: 'var(--brand)' }}>Change</Link>
                  </p>
                </div>
              )}
            </div>

            {error && <p className="mt-4 text-sm" style={{ color: '#DC2626' }}>{error}</p>}

            <div className="flex justify-end mt-8">
              <button
                onClick={handleNext}
                disabled={!subject.trim()}
                className="flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40"
                style={{ background: 'var(--brand)' }}
              >
                Continue to content →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Content ─────────────────────────────────────────── */}
        {step === 2 && (
          <div>
            {/* Toolbar — minimal */}
            <div
              className="flex items-center justify-between px-6 py-3"
              style={{ borderBottom: '1px solid var(--sidebar-border)' }}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {subject}
                </span>
                {/* Channel badge */}
                <span
                  className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ background: 'var(--surface-app)', border: '1px solid var(--sidebar-border)', color: 'var(--text-tertiary)' }}
                >
                  {sendViaEmail && <MailIcon className="h-2.5 w-2.5" />}
                  {sendViaWhopDm && <MessageCircleIcon className="h-2.5 w-2.5" />}
                  {sendViaEmail && sendViaWhopDm ? 'Email + DM' : sendViaWhopDm ? 'Whop DM only' : 'Email only'}
                </span>
              </div>
              <button
                onClick={() => setShowAi(!showAi)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
                style={
                  showAi
                    ? { background: 'var(--brand-tint)', color: '#16A34A' }
                    : { background: 'var(--surface-app)', color: 'var(--text-secondary)', border: '1px solid var(--sidebar-border)' }
                }
              >
                <SparklesIcon className="h-3.5 w-3.5" />
                AI assist
              </button>
            </div>

            <div className="flex">
              {/* Editor */}
              <div className="flex-1 min-w-0">
                <VisualEditor value={htmlBody} onChange={setHtmlBody} />
              </div>
              {/* AI panel — slide in */}
              {showAi && (
                <div
                  className="w-72 flex-shrink-0"
                  style={{ borderLeft: '1px solid var(--sidebar-border)' }}
                >
                  <AiPanel
                    subject={subject}
                    htmlBody={htmlBody}
                    onApply={(html) => { setHtmlBody(html); setShowAi(false); }}
                  />
                </div>
              )}
            </div>

            {error && <p className="px-6 pb-3 text-sm" style={{ color: '#DC2626' }}>{error}</p>}

            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderTop: '1px solid var(--sidebar-border)' }}
            >
              <button
                onClick={() => setStep(1)}
                className="text-sm transition-opacity hover:opacity-70"
                style={{ color: 'var(--text-secondary)' }}
              >
                ← Back
              </button>
              <button
                onClick={handleNext}
                disabled={isLoading || !htmlBody.trim()}
                className="flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40"
                style={{ background: 'var(--brand)' }}
              >
                {isLoading ? 'Saving...' : 'Review & send →'}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Review & Send ───────────────────────────────────── */}
        {step === 3 && (
          <div className="p-8">
            <h2 className="text-xl font-bold mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
              Review & send
            </h2>
            <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
              Check your audience and send when ready.
            </p>

            {/* Summary */}
            <div
              className="rounded-xl p-5 mb-6"
              style={{ background: 'var(--surface-app)', border: '1px solid var(--sidebar-border)' }}
            >
              <div className="space-y-3">
                <SummaryRow label="Subject" value={subject} />
                {previewText && sendViaEmail && <SummaryRow label="Inbox preview" value={previewText} />}
                {sendViaEmail && <SummaryRow label="Sender" value={`${fromName} <${fromEmail}>`} />}
                <SummaryRow
                  label="Channels"
                  value={
                    sendViaEmail && sendViaWhopDm
                      ? '📧 Email  +  💬 Whop DMs'
                      : sendViaWhopDm
                      ? '💬 Whop DMs only'
                      : '📧 Email only'
                  }
                />
              </div>
            </div>

            {/* Audience */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                Audience
              </h3>

              {tags.length === 0 && segments.length === 0 ? (
                <div
                  className="rounded-xl p-4"
                  style={{ background: 'var(--surface-app)', border: '1px solid var(--sidebar-border)' }}
                >
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Sending to all <strong>{audienceSize.toLocaleString()}</strong> active subscribers.
                    {sendViaWhopDm && (
                      <span style={{ color: 'var(--text-tertiary)' }}>
                        {' '}Whop DMs will only reach members with a linked Whop account.
                      </span>
                    )}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {segments.length > 0 && (
                    <div>
                      <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-tertiary)' }}>Segments</p>
                      <div className="flex flex-wrap gap-2">
                        {segments.map((seg) => (
                          <button
                            key={seg.id}
                            onClick={() => toggleSegment(seg.id)}
                            className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all"
                            style={
                              selectedSegmentIds.includes(seg.id)
                                ? { background: 'var(--brand)', color: '#fff' }
                                : { background: 'var(--surface-app)', color: 'var(--text-secondary)', border: '1px solid var(--sidebar-border)' }
                            }
                          >
                            {seg.name}
                            <span className="opacity-60">({seg.contactCount})</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {tags.length > 0 && (
                    <div>
                      <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-tertiary)' }}>Tags</p>
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag) => (
                          <button
                            key={tag.id}
                            onClick={() => toggleTag(tag.id)}
                            className="rounded-full px-3 py-1 text-xs font-medium transition-all"
                            style={
                              selectedTagIds.includes(tag.id)
                                ? { background: 'var(--brand)', color: '#fff' }
                                : { background: 'var(--surface-app)', color: 'var(--text-secondary)', border: '1px solid var(--sidebar-border)' }
                            }
                          >
                            {tag.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedTagIds.length === 0 && selectedSegmentIds.length === 0 && (
                    <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                      No filter selected — sending to all {audienceSize.toLocaleString()} subscribers.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Advanced options (A/B test) — hidden by default */}
            <div className="mb-6">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <ChevronDownIcon
                  className="h-3.5 w-3.5 transition-transform"
                  style={{ transform: showAdvanced ? 'rotate(180deg)' : 'none' }}
                />
                Advanced options
              </button>

              {showAdvanced && (
                <div
                  className="mt-3 rounded-xl p-4 space-y-3"
                  style={{ background: 'var(--surface-app)', border: '1px solid var(--sidebar-border)' }}
                >
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAbTest}
                      onChange={(e) => setIsAbTest(e.target.checked)}
                      className="h-4 w-4 rounded accent-[#22C55E]"
                    />
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>A/B test subject lines</p>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Send two versions and see which performs better</p>
                    </div>
                  </label>
                  {isAbTest && (
                    <input
                      type="text"
                      value={abSubjectB}
                      onChange={(e) => setAbSubjectB(e.target.value)}
                      placeholder="Subject line B"
                      className="w-full rounded-lg px-3.5 py-2.5 text-sm focus:outline-none"
                      style={{ border: '1.5px solid var(--sidebar-border)', background: 'var(--surface-card)', color: 'var(--text-primary)' }}
                    />
                  )}
                </div>
              )}
            </div>

            {error && <p className="mb-4 text-sm" style={{ color: '#DC2626' }}>{error}</p>}

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setStep(2)}
                className="text-sm transition-opacity hover:opacity-70"
                style={{ color: 'var(--text-secondary)' }}
              >
                ← Back
              </button>
              <button
                onClick={handleSend}
                disabled={isLoading || !savedCampaignId}
                className="flex items-center gap-2 rounded-lg px-8 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40"
                style={{ background: 'var(--brand)', boxShadow: '0 2px 8px rgba(34,197,94,0.3)' }}
              >
                {isLoading ? 'Sending...' : 'Send campaign'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-28 flex-shrink-0 text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}
