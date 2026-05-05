'use client';

import { SanitizedHtml } from '@/components/ui/sanitized-html';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SparklesIcon, ChevronLeftIcon, PlusIcon, TrashIcon } from 'lucide-react';
import Link from 'next/link';
import type { CampaignBrief } from '@/lib/ai/actions';
import { DEFAULT_VARIANT_SPECS, type VariantSpec, type GeneratedVariant } from '@/lib/ai/variant-generator';
import { createCampaign } from '@/lib/campaigns/actions';

interface Props {
  tags: { id: string; name: string }[];
  segments: { id: string; name: string }[];
}

export function VariantBuilder({ tags, segments }: Props) {
  const router = useRouter();
  
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Brief
  const [brief, setBrief] = useState<CampaignBrief>({
    product: '',
    audience: '',
    tone: '',
    goal: '',
    keyPoints: '',
  });

  // Step 2: Segments
  const [variantSpecs, setVariantSpecs] = useState<VariantSpec[]>(DEFAULT_VARIANT_SPECS);

  // Step 3: Generated Variants
  const [variants, setVariants] = useState<GeneratedVariant[]>([]);

  const handleGenerate = async () => {
    if (variantSpecs.length < 2 || variantSpecs.length > 3) {
      setError('You must provide 2 or 3 segments.');
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const res = await fetch('/api/ai/generate-variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief, segments: variantSpecs }),
      });
      
      const data = await res.json();
      if (data.success) {
        setVariants(data.data);
        setStep(3);
      } else {
        setError(data.error || 'Failed to generate variants');
      }
    } catch (err) {
      setError('Failed to generate variants');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    setError(null);
    
    try {
      // We create a campaign for each variant
      for (let i = 0; i < variants.length; i++) {
        const variant = variants[i];
        const spec = variantSpecs[i]; // assuming order is preserved
        
        const audienceTagIds = spec.audienceTagId ? [spec.audienceTagId] : [];
        const audienceSegmentIds = spec.audienceSegmentId ? [spec.audienceSegmentId] : [];
        
        const res = await createCampaign({
          name: `Variant: ${variant.segmentName}`,
          subject: variant.subject,
          htmlBody: variant.htmlBody,
          type: 'BROADCAST',
          audienceTagIds,
          audienceSegmentIds,
        });
        
        if (!res.success) {
          throw new Error(`Failed to save variant ${variant.segmentName}: ${res.error}`);
        }
      }
      
      router.push('/dashboard/campaigns');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save campaigns');
      setIsSaving(false);
    }
  };

  const updateSpec = (index: number, field: keyof VariantSpec, value: string) => {
    const newSpecs = [...variantSpecs];
    newSpecs[index] = { ...newSpecs[index], [field]: value };
    setVariantSpecs(newSpecs);
  };

  const removeSpec = (index: number) => {
    setVariantSpecs(variantSpecs.filter((_, i) => i !== index));
  };

  const addSpec = () => {
    if (variantSpecs.length >= 3) return;
    setVariantSpecs([...variantSpecs, { segmentName: '', segmentDescription: '', tone: '', emphasize: '' }]);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-20">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard/campaigns" className="flex items-center gap-1 hover:text-foreground">
          <ChevronLeftIcon className="h-4 w-4" />
          Campaigns
        </Link>
        <span>/</span>
        <span className="text-foreground">Create Variants</span>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Personalized Email Variants</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className={step >= 1 ? 'text-foreground font-medium' : ''}>1. Brief</span>
          <span>→</span>
          <span className={step >= 2 ? 'text-foreground font-medium' : ''}>2. Segments</span>
          <span>→</span>
          <span className={step >= 3 ? 'text-foreground font-medium' : ''}>3. Review</span>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 border border-red-200">
          {error}
        </div>
      )}

      {step === 1 && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-6">
          <h2 className="text-lg font-semibold text-foreground">Campaign Brief</h2>
          <p className="text-sm text-muted-foreground">What is the core message of this campaign?</p>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Product or Offer</label>
              <input
                type="text"
                value={brief.product}
                onChange={(e) => setBrief({ ...brief, product: e.target.value })}
                placeholder="e.g. The Ultimate Next.js Course"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Overall Audience</label>
              <input
                type="text"
                value={brief.audience}
                onChange={(e) => setBrief({ ...brief, audience: e.target.value })}
                placeholder="e.g. Web developers looking to level up"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Goal</label>
              <input
                type="text"
                value={brief.goal}
                onChange={(e) => setBrief({ ...brief, goal: e.target.value })}
                placeholder="e.g. Get them to buy the course with a 20% discount"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Base Tone</label>
              <input
                type="text"
                value={brief.tone}
                onChange={(e) => setBrief({ ...brief, tone: e.target.value })}
                placeholder="e.g. Professional but approachable"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Key Points (Optional)</label>
              <textarea
                value={brief.keyPoints}
                onChange={(e) => setBrief({ ...brief, keyPoints: e.target.value })}
                placeholder="Any specific details to include..."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm min-h-[80px]"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setStep(2)}
              disabled={!brief.product || !brief.audience || !brief.goal || !brief.tone}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              Next: Define Segments
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Audience Segments</h2>
                <p className="text-sm text-muted-foreground">Define 2-3 segments to generate variants for.</p>
              </div>
              <div className="text-sm font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                Cost: {variantSpecs.length * 5} credits
              </div>
            </div>

            <div className="space-y-6">
              {variantSpecs.map((spec, index) => (
                <div key={index} className="rounded-lg border border-border p-4 space-y-4 bg-background">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-foreground">Variant {index + 1}</h3>
                    {variantSpecs.length > 2 && (
                      <button onClick={() => removeSpec(index)} className="text-red-500 hover:text-red-600 p-1">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Segment Name</label>
                      <input
                        type="text"
                        value={spec.segmentName}
                        onChange={(e) => updateSpec(index, 'segmentName', e.target.value)}
                        className="w-full rounded-md border border-border bg-card px-3 py-1.5 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Target Audience (DB)</label>
                      <select
                        value={spec.audienceSegmentId || spec.audienceTagId || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val.startsWith('seg_')) {
                            updateSpec(index, 'audienceSegmentId', val.replace('seg_', ''));
                            updateSpec(index, 'audienceTagId', '');
                          } else if (val.startsWith('tag_')) {
                            updateSpec(index, 'audienceTagId', val.replace('tag_', ''));
                            updateSpec(index, 'audienceSegmentId', '');
                          } else {
                            updateSpec(index, 'audienceSegmentId', '');
                            updateSpec(index, 'audienceTagId', '');
                          }
                        }}
                        className="w-full rounded-md border border-border bg-card px-3 py-1.5 text-sm"
                      >
                        <option value="">Select segment or tag...</option>
                        <optgroup label="Segments">
                          {segments.map(s => <option key={s.id} value={`seg_${s.id}`}>{s.name}</option>)}
                        </optgroup>
                        <optgroup label="Tags">
                          {tags.map(t => <option key={t.id} value={`tag_${t.id}`}>{t.name}</option>)}
                        </optgroup>
                      </select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-medium text-muted-foreground">Description</label>
                      <input
                        type="text"
                        value={spec.segmentDescription}
                        onChange={(e) => updateSpec(index, 'segmentDescription', e.target.value)}
                        className="w-full rounded-md border border-border bg-card px-3 py-1.5 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Tone</label>
                      <input
                        type="text"
                        value={spec.tone}
                        onChange={(e) => updateSpec(index, 'tone', e.target.value)}
                        className="w-full rounded-md border border-border bg-card px-3 py-1.5 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Emphasize</label>
                      <input
                        type="text"
                        value={spec.emphasize}
                        onChange={(e) => updateSpec(index, 'emphasize', e.target.value)}
                        className="w-full rounded-md border border-border bg-card px-3 py-1.5 text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {variantSpecs.length < 3 && (
              <button
                onClick={addSpec}
                className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                <PlusIcon className="h-4 w-4" />
                Add another segment
              </button>
            )}
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Back
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || variantSpecs.some(s => !s.segmentName || !s.segmentDescription)}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {isGenerating ? (
                'Generating...'
              ) : (
                <>
                  <SparklesIcon className="h-4 w-4" />
                  Generate Variants
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {variants.map((variant, index) => (
              <div key={index} className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
                <div className="p-4 border-b border-border bg-muted/30">
                  <h3 className="font-semibold text-foreground">{variant.segmentName}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{variant.keyDifference}</p>
                </div>
                <div className="p-4 flex-1 space-y-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Subject</p>
                    <p className="text-sm font-medium text-foreground">{variant.subject}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Preview</p>
                    <SanitizedHtml html={variant.htmlBody} className="text-sm text-muted-foreground line-clamp-4 prose prose-sm" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Back
            </button>
            <button
              onClick={handleSaveAll}
              disabled={isSaving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save All as Drafts'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
