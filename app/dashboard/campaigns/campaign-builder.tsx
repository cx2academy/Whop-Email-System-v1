"use client";

/**
 * app/dashboard/campaigns/campaign-builder.tsx
 *
 * Full campaign builder — 3-step form:
 *   Step 1: Details (name, subject, A/B test toggle)
 *   Step 2: Content (HTML body editor with preview)
 *   Step 3: Audience + review + send
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Tag } from "@prisma/client";
import { createCampaign, updateCampaign, sendCampaignNow } from "@/lib/campaigns/actions";
import { createUserTemplate } from "@/lib/templates/actions";

interface CampaignBuilderProps {
  tags: Tag[];
  /** If pre-filling from a template */
  templateInitial?: {
    subject?: string;
    htmlBody?: string;
    previewText?: string;
    templateId?: string;
    userTemplateId?: string;
  };
  /** If provided, editing an existing draft */
  initial?: {
    id: string;
    name: string;
    subject: string;
    previewText?: string | null;
    htmlBody: string;
    audienceTagIds: string[];
    isAbTest: boolean;
    abSubjectB?: string | null;
  };
}

const DEFAULT_HTML = `<h2>Hello {{firstName | fallback: 'there'}}!</h2>
<p>Write your email content here.</p>
<p>Keep it personal, valuable, and to the point.</p>
`;

export function CampaignBuilder({ tags, initial, templateInitial }: CampaignBuilderProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateSaved, setTemplateSaved] = useState(false);
  const [savedCampaignId, setSavedCampaignId] = useState<string | null>(
    initial?.id ?? null
  );

  // Step 1: Details
  const [name, setName] = useState(initial?.name ?? "");
  const [subject, setSubject] = useState(initial?.subject ?? templateInitial?.subject ?? "");
  const [previewText, setPreviewText] = useState(initial?.previewText ?? templateInitial?.previewText ?? "");
  const [isAbTest, setIsAbTest] = useState(initial?.isAbTest ?? false);
  const [abSubjectB, setAbSubjectB] = useState(initial?.abSubjectB ?? "");

  // Step 2: Content
  const [htmlBody, setHtmlBody] = useState(initial?.htmlBody ?? templateInitial?.htmlBody ?? DEFAULT_HTML);
  const [showPreview, setShowPreview] = useState(false);

  // Step 3: Audience
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    initial?.audienceTagIds ?? []
  );

  // Step 3: Send result
  const [sendResult, setSendResult] = useState<{
    type: "success" | "partial" | "error";
    totalSent?: number;
    totalFailed?: number;
    message: string;
  } | null>(null);

  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  }

  async function handleSaveAndContinue() {
    setError(null);
    setIsLoading(true);

    try {
      const payload = {
        name,
        subject,
        previewText: previewText || undefined,
        htmlBody,
        audienceTagIds: selectedTagIds,
        isAbTest,
        abSubjectB: isAbTest ? abSubjectB : undefined,
      };
      const result = initial?.id
        ? await updateCampaign(initial.id, payload)
        : await createCampaign(payload);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setSavedCampaignId(result.data!.campaignId);
      setStep(3);
    } catch {
      setError("Failed to save campaign. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSend() {
    if (!savedCampaignId) return;
    setError(null);
    setIsLoading(true);

    try {
      const result = await sendCampaignNow(savedCampaignId);
      if (result.success && result.data) {
        setSendResult({
          type: result.data.totalFailed > 0 ? "partial" : "success",
          totalSent: result.data.totalSent,
          totalFailed: result.data.totalFailed,
          message: `Sent to ${result.data.totalSent} contacts${result.data.totalFailed > 0 ? `, ${result.data.totalFailed} failed` : ""}`,
        });
      } else {
        setSendResult({
          type: "error",
          message: (!result.success && result.error) ? result.error : "Send failed. Please try again.",
        });
      }
    } catch {
      setSendResult({ type: "error", message: "An unexpected error occurred." });
    } finally {
      setIsLoading(false);
    }
  }

  // -------------------------------------------------------------------------
  // Post-send success state
  // -------------------------------------------------------------------------
  if (sendResult?.type === "success" || sendResult?.type === "partial") {
    return (
      <div className="rounded-xl border border-border bg-card p-10 text-center">
        <div className="mb-4 text-5xl">
          {sendResult.type === "success" ? "🎉" : "⚠️"}
        </div>
        <h2 className="mb-2 text-xl font-bold text-foreground">
          {sendResult.type === "success" ? "Campaign sent!" : "Campaign partially sent"}
        </h2>
        <p className="mb-6 text-sm text-muted-foreground">{sendResult.message}</p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => router.push(`/dashboard/campaigns/${savedCampaignId}`)}
            className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            View analytics
          </button>
          <button
            onClick={() => router.push("/dashboard/campaigns")}
            className="rounded-md border border-border px-5 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            All campaigns
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        {[
          { n: 1, label: "Details" },
          { n: 2, label: "Content" },
          { n: 3, label: "Review & Send" },
        ].map(({ n, label }, idx) => (
          <div key={n} className="flex items-center gap-2">
            {idx > 0 && <div className="h-px w-8 bg-border" />}
            <div className="flex items-center gap-1.5">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  step === n
                    ? "bg-primary text-primary-foreground"
                    : step > n
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {n}
              </div>
              <span
                className={
                  step === n ? "font-medium text-foreground" : "text-muted-foreground"
                }
              >
                {label}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Step 1: Details */}
      {/* ------------------------------------------------------------------ */}
      {step === 1 && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-5">
          <h2 className="font-semibold text-foreground">Campaign details</h2>

          <Field label="Campaign name" required>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. January newsletter"
              className={inputCls}
            />
          </Field>

          <Field label="Subject line" required>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What's this email about?"
              className={inputCls}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {subject.length}/255 characters
            </p>
          </Field>

          <Field label="Preview text">
            <input
              type="text"
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              placeholder="Short summary shown in inbox (optional)"
              className={inputCls}
            />
          </Field>

          {/* A/B test toggle */}
          <div className="rounded-lg border border-border p-4 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isAbTest}
                onChange={(e) => setIsAbTest(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <div>
                <p className="text-sm font-medium text-foreground">A/B subject test</p>
                <p className="text-xs text-muted-foreground">
                  Send two subject lines to split your audience and find what works best
                </p>
              </div>
            </label>

            {isAbTest && (
              <Field label="Subject B">
                <input
                  type="text"
                  value={abSubjectB}
                  onChange={(e) => setAbSubjectB(e.target.value)}
                  placeholder="Alternate subject line for 50% of recipients"
                  className={inputCls}
                />
              </Field>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end">
            <button
              onClick={() => {
                if (!name.trim()) { setError("Campaign name is required"); return; }
                if (!subject.trim()) { setError("Subject line is required"); return; }
                if (isAbTest && !abSubjectB.trim()) { setError("Subject B is required for A/B test"); return; }
                setError(null);
                setStep(2);
              }}
              className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Next: Content →
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Step 2: Content editor */}
      {/* ------------------------------------------------------------------ */}
      {step === 2 && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Email content</h2>
            <button
              onClick={() => setShowPreview((p) => !p)}
              className="text-xs text-primary underline-offset-4 hover:underline"
            >
              {showPreview ? "Edit HTML" : "Preview"}
            </button>
          </div>

          {showPreview ? (
            <div className="rounded-lg border border-border bg-white overflow-auto min-h-[400px] p-6">
              <div
                className="prose max-w-none text-sm"
                dangerouslySetInnerHTML={{ __html: htmlBody }}
              />
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                HTML body
              </label>
              <textarea
                value={htmlBody}
                onChange={(e) => setHtmlBody(e.target.value)}
                rows={20}
                spellCheck={false}
                className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Write standard HTML. An unsubscribe link and tracking pixel will be added automatically.
              </p>
            </div>
          )}

          {!htmlBody.trim() && (
            <p className="text-sm text-destructive">Email body is required</p>
          )}

          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep(1)}
              className="rounded-md border border-border px-5 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              ← Back
            </button>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (!subject.trim() || !htmlBody.trim()) return;
                  const name_ = prompt('Template name:');
                  if (!name_) return;
                  const { createUserTemplate } = await import('@/lib/templates/actions');
                  const r = await createUserTemplate({ name: name_, category: 'custom', subject, htmlBody, previewText: previewText || undefined });
                  if (r.success) alert('Template saved!');
                }}
                disabled={!htmlBody.trim() || !subject.trim()}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
              >
                Save as template
              </button>
              <button
                onClick={() => {
                  if (!htmlBody.trim()) return;
                  setStep(3);
                }}
                disabled={!htmlBody.trim()}
                className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next: Review →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Step 3: Audience + review + send */}
      {/* ------------------------------------------------------------------ */}
      {step === 3 && (
        <div className="space-y-4">
          {/* Audience selector */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h2 className="font-semibold text-foreground">Audience</h2>
            <p className="text-sm text-muted-foreground">
              {selectedTagIds.length === 0
                ? "Sending to all subscribed contacts"
                : `Sending to contacts tagged: ${selectedTagIds
                    .map((id) => tags.find((t) => t.id === id)?.name)
                    .filter(Boolean)
                    .join(", ")}`}
            </p>

            {tags.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Filter by tag (optional — leave empty for everyone)
                </p>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                        selectedTagIds.includes(tag.id)
                          ? "text-white ring-2 ring-offset-1 ring-primary"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                      style={
                        selectedTagIds.includes(tag.id)
                          ? { backgroundColor: tag.color }
                          : {}
                      }
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Review summary */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <h2 className="font-semibold text-foreground">Review</h2>

            <ReviewRow label="Campaign" value={name} />
            <ReviewRow label="Subject A" value={subject} />
            {isAbTest && <ReviewRow label="Subject B" value={abSubjectB} />}
            {isAbTest && <ReviewRow label="Test type" value="50/50 A/B split" />}
            <ReviewRow
              label="Audience"
              value={
                selectedTagIds.length === 0
                  ? "All subscribed contacts"
                  : `${selectedTagIds.length} tag${selectedTagIds.length > 1 ? "s" : ""} selected`
              }
            />
          </div>

          {/* Send result error */}
          {sendResult?.type === "error" && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {sendResult.message}
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-between">
            <button
              onClick={() => setStep(2)}
              disabled={isLoading}
              className="rounded-md border border-border px-5 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
            >
              ← Back
            </button>
            <div className="flex gap-3">
              {/* Save as template */}
              <button
                onClick={() => { setTemplateName(name || subject); setShowSaveTemplate(true); }}
                disabled={isLoading || !subject || !htmlBody}
                className="rounded-md border border-border px-5 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
              >
                Save as template
              </button>
              {/* Save as draft */}
              {!savedCampaignId && (
                <button
                  onClick={async () => {
                    setIsLoading(true);
                    const result = await createCampaign({
                      name, subject, previewText: previewText || undefined,
                      htmlBody, audienceTagIds: selectedTagIds,
                      isAbTest, abSubjectB: isAbTest ? abSubjectB : undefined,
                    });
                    setIsLoading(false);
                    if (result.success) {
                      router.push("/dashboard/campaigns");
                    } else {
                      setError(result.error ?? "Failed to save");
                    }
                  }}
                  disabled={isLoading}
                  className="rounded-md border border-border px-5 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
                >
                  Save as draft
                </button>
              )}

              {/* Send now */}
              <button
                onClick={savedCampaignId ? handleSend : handleSaveAndContinue}
                disabled={isLoading}
                className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading
                  ? "Sending…"
                  : savedCampaignId
                    ? "Send campaign"
                    : "Save & send"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Save as Template Modal */}
      {showSaveTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-xl">
            <h2 className="mb-4 text-base font-semibold text-foreground">Save as Template</h2>
            {templateSaved ? (
              <div className="space-y-3">
                <p className="text-sm text-green-600">✓ Template saved to your library!</p>
                <button
                  onClick={() => { setShowSaveTemplate(false); setTemplateSaved(false); }}
                  className="w-full rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
                >Close</button>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  value={templateName}
                  onChange={e => setTemplateName(e.target.value)}
                  placeholder="Template name"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <div className="flex gap-3">
                  <button
                    onClick={async () => {
                      const r = await createUserTemplate({ name: templateName || subject, category: "custom", subject, htmlBody, previewText: previewText || undefined });
                      if (r.success) setTemplateSaved(true);
                    }}
                    className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                  >Save</button>
                  <button
                    onClick={() => { setShowSaveTemplate(false); setTemplateSaved(false); }}
                    className="flex-1 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
                  >Cancel</button>
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
// Helper components
// ---------------------------------------------------------------------------

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </label>
      {children}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-xs truncate text-right font-medium text-foreground">
        {value}
      </span>
    </div>
  );
}

const inputCls =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
