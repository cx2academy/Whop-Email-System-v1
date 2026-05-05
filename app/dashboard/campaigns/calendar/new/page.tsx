'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SparklesIcon, ChevronLeftIcon, CalendarIcon, UploadIcon, FileTextIcon, Loader2Icon, CheckCircle2Icon, LightbulbIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import type { CalendarInput, ContentCalendar } from '@/lib/ai/content-calendar';

const REVTRAY_TIPS = [
  "Use curiosity-driven subject lines to boost open rates by up to 20%.",
  "Segment your audience based on behavior for more personalized campaigns.",
  "Always include a P.S. — it's often the most-read part of an email!",
  "A/B testing your CTAs can help you find the highest-converting language.",
  "Keep your paragraphs short (1-3 sentences) for better readability on mobile.",
  "Use the 'Preview Text' to give a sneak peek of the value inside.",
  "Personalize with {{firstName}} to build an immediate connection.",
  "Story-driven emails often have 3x higher engagement than pure sales pitches.",
  "The best time to send is usually between 9 AM and 11 AM in your audience's timezone.",
  "Clean your list regularly to maintain high deliverability and avoid spam folders."
];

import { Portal } from '@/components/ui/portal';

export default function CalendarBuilderPage() {
  const router = useRouter();
  
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generateDrafts, setGenerateDrafts] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Input State
  const [input, setInput] = useState<CalendarInput>({
    product: '',
    audience: '',
    goal: 'Launch a product',
    keyDates: '',
    emailFrequency: '3x_week',
    startDate: new Date(),
    transformation: '',
    painPoints: '',
    objections: '',
    uniqueMechanism: '',
    tone: 'Professional and engaging',
    rawContext: '',
  });

  // Step 3: Generated Calendar
  const [calendar, setCalendar] = useState<ContentCalendar | null>(null);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [estimatedSeconds, setEstimatedSeconds] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSaving) {
      interval = setInterval(() => {
        setCurrentTipIndex(prev => (prev + 1) % REVTRAY_TIPS.length);
      }, 6000);
    }
    return () => clearInterval(interval);
  }, [isSaving]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isSaving && estimatedSeconds > 0) {
      timer = setInterval(() => {
        setEstimatedSeconds(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isSaving, estimatedSeconds]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === 'text/plain' || file.type === 'text/markdown' || file.type === 'text/csv' || file.name.endsWith('.md') || file.name.endsWith('.txt') || file.name.endsWith('.csv')) {
      const text = await file.text();
      const currentContext = input.rawContext || '';
      const newContext = currentContext ? `${currentContext}\n\n${text}` : text;
      setInput({ ...input, rawContext: newContext.slice(0, 3000) });
    } else {
      setError('Currently only .txt, .md, and .csv files are supported for automatic extraction.');
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGenerate = async () => {
    if (!input.product || !input.audience || !input.goal) {
      setError('Please fill out all required fields.');
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const res = await fetch('/api/ai/generate-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      
      const data = await res.json();
      if (data.success) {
        setCalendar(data.data);
        setStep(3);
      } else {
        setError(data.error || 'Failed to generate calendar');
      }
    } catch (err) {
      setError('Failed to generate calendar');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveAll = async () => {
    if (!calendar) return;
    
    setIsSaving(true);
    setError(null);
    // Estimate: 8 seconds per email + 5s base
    setEstimatedSeconds(calendar.entries.length * 8 + 5);
    
    try {
      const res = await fetch('/api/ai/materialize-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calendar, input, generateDrafts }),
      });
      
      const data = await res.json();
      if (data.success) {
        router.push('/dashboard/campaigns');
        router.refresh();
      } else {
        setError(data.error || 'Failed to save campaigns');
        setIsSaving(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save campaigns');
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-20">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard/campaigns" className="flex items-center gap-1 hover:text-foreground">
          <ChevronLeftIcon className="h-4 w-4" />
          Campaigns
        </Link>
        <span>/</span>
        <span className="text-foreground">Create Content Calendar</span>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">AI Content Calendar</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className={step >= 1 ? 'text-foreground font-medium' : ''}>1. Basic Info</span>
          <span>→</span>
          <span className={step >= 2 ? 'text-foreground font-medium' : ''}>2. Deep Context</span>
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
        <div className="rounded-xl border border-border bg-card p-6 space-y-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Step 1: Basic Info</h2>
              <p className="text-sm text-muted-foreground">Tell us what you're promoting and when.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Product or Offer *</label>
              <input
                type="text"
                value={input.product}
                onChange={(e) => setInput({ ...input, product: e.target.value })}
                placeholder="e.g. The Ultimate Next.js Course"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Target Audience *</label>
              <input
                type="text"
                value={input.audience}
                onChange={(e) => setInput({ ...input, audience: e.target.value })}
                placeholder="e.g. Web developers looking to level up"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Main Goal *</label>
              <select
                value={input.goal}
                onChange={(e) => setInput({ ...input, goal: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="Launch a product">Launch a product</option>
                <option value="Grow membership">Grow membership</option>
                <option value="Nurture existing list">Nurture existing list</option>
                <option value="Promote an event">Promote an event</option>
                <option value="Custom...">Custom...</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email Frequency *</label>
              <select
                value={input.emailFrequency}
                onChange={(e) => setInput({ ...input, emailFrequency: e.target.value as any })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="daily">Daily (~30 emails)</option>
                <option value="3x_week">3x / Week (~13 emails)</option>
                <option value="2x_week">2x / Week (~9 emails)</option>
                <option value="weekly">Weekly (~5 emails)</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-foreground">Key Dates (Optional)</label>
              <textarea
                value={input.keyDates}
                onChange={(e) => setInput({ ...input, keyDates: e.target.value })}
                placeholder="e.g. Launch: April 15, Early bird ends: April 10"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm min-h-[80px]"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-foreground">CTA Link (URL) *</label>
              <input
                type="url"
                value={input.ctaUrl || ''}
                onChange={(e) => setInput({ ...input, ctaUrl: e.target.value })}
                placeholder="e.g. https://yourwebsite.com/checkout"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <p className="text-xs text-muted-foreground">This link will be automatically added to the buttons in your generated emails.</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Start Date *</label>
              <input
                type="date"
                value={input.startDate.toISOString().split('T')[0]}
                onChange={(e) => setInput({ ...input, startDate: new Date(e.target.value) })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-border">
            <button
              onClick={() => setStep(2)}
              disabled={!input.product || !input.audience || !input.goal}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Next: Deep Context →
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Step 2: Deep Context</h2>
              <p className="text-sm text-muted-foreground">Give the AI the psychological triggers it needs to write high-converting copy.</p>
            </div>
            <div className="text-sm font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-200">
              Cost: 10 credits
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">The Transformation</label>
              <textarea
                value={input.transformation}
                onChange={(e) => setInput({ ...input, transformation: e.target.value })}
                placeholder="Where is your customer right now (Point A), and where will this product take them (Point B)?"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Pain Points</label>
              <textarea
                value={input.painPoints}
                onChange={(e) => setInput({ ...input, painPoints: e.target.value })}
                placeholder="What is the biggest frustration your audience is facing right now?"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Objections</label>
              <textarea
                value={input.objections}
                onChange={(e) => setInput({ ...input, objections: e.target.value })}
                placeholder="Why would someone hesitate to buy this? (e.g. Too expensive, no time)"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Unique Mechanism / Hook</label>
              <textarea
                value={input.uniqueMechanism}
                onChange={(e) => setInput({ ...input, uniqueMechanism: e.target.value })}
                placeholder="What makes your product different from everything else out there?"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm min-h-[80px]"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-foreground">Brand Voice / Tone</label>
              <select
                value={input.tone}
                onChange={(e) => setInput({ ...input, tone: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="Professional and engaging">Professional and engaging</option>
                <option value="Casual and friendly">Casual and friendly</option>
                <option value="Authoritative and direct">Authoritative and direct</option>
                <option value="Humorous and witty">Humorous and witty</option>
                <option value="Story-driven and empathetic">Story-driven and empathetic</option>
              </select>
            </div>

            <div className="space-y-2 md:col-span-2 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Raw Context (Knowledge Drop)</label>
                <span className={`text-xs font-medium ${(input.rawContext?.length || 0) > 3000 ? 'text-red-500' : 'text-muted-foreground'}`}>
                  {input.rawContext?.length || 0} / 3000
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Paste your sales page copy, syllabus, or upload a text file. Keep it concise so the AI focuses on the best parts.
              </p>
              
              <div className="flex gap-2 mb-2">
                <input
                  type="file"
                  accept=".txt,.md,.csv"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                >
                  <UploadIcon className="h-3 w-3" />
                  Upload .txt / .md
                </button>
              </div>

              <textarea
                value={input.rawContext}
                onChange={(e) => setInput({ ...input, rawContext: e.target.value.slice(0, 3000) })}
                placeholder="Paste raw context here..."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm min-h-[120px]"
              />
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-border">
            <button
              onClick={() => setStep(1)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              ← Back
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {isGenerating ? (
                'Generating...'
              ) : (
                <>
                  <SparklesIcon className="h-4 w-4" />
                  Generate Calendar Plan
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {step === 3 && calendar && (
        <div className="space-y-6">
          <AnimatePresence>
            {isSaving && (
              <Portal>
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md p-6"
                >
                  <div className="w-full max-w-md space-y-8 text-center">
                    <div className="relative mx-auto w-24 h-24">
                      <motion.div 
                        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute inset-0 rounded-full bg-brand/20"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2Icon className="h-12 w-12 text-brand animate-spin" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h2 className="text-2xl font-bold text-foreground">Materializing Your Calendar</h2>
                      <p className="text-muted-foreground">
                        AI is drafting {calendar.entries.length} high-converting emails...
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: "0%" }}
                          animate={{ width: "100%" }}
                          transition={{ duration: calendar.entries.length * 8 + 5, ease: "linear" }}
                          className="h-full bg-brand"
                        />
                      </div>
                      <div className="flex justify-between text-xs font-medium text-muted-foreground">
                        <span>Starting...</span>
                        <span>
                          {estimatedSeconds > 0 
                            ? `Estimated time: ~${Math.ceil(estimatedSeconds / 60)} min ${estimatedSeconds % 60}s` 
                            : "Almost there..."}
                        </span>
                      </div>
                    </div>

                    <motion.div 
                      key={currentTipIndex}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="rounded-2xl border border-border bg-card p-6 shadow-sm text-left relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 w-1 h-full bg-brand/40" />
                      <div className="flex gap-4">
                        <div className="rounded-lg bg-brand/10 p-2 h-fit text-brand">
                          <LightbulbIcon className="h-5 w-5" />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-brand">RevTray Pro Tip</span>
                          <p className="text-sm text-foreground leading-relaxed font-medium">
                            {REVTRAY_TIPS[currentTipIndex]}
                          </p>
                        </div>
                      </div>
                    </motion.div>

                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold opacity-50">
                      Do not close this window
                    </p>
                  </div>
                </motion.div>
              </Portal>
            )}
          </AnimatePresence>

          <div className="rounded-xl border border-border bg-card p-6 space-y-4 shadow-sm">
            <h2 className="text-xl font-bold text-foreground">{calendar.calendarName}</h2>
            <p className="text-sm text-muted-foreground">{calendar.strategy}</p>
            
            <div className="flex flex-wrap gap-2 pt-2">
              {calendar.phases.map((phase, i) => (
                <span key={i} className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
                  {phase}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Schedule ({calendar.totalEmails} emails)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {calendar.entries.map((entry, index) => (
                <div key={index} className="rounded-lg border border-border bg-card p-4 space-y-3 flex flex-col shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Day {entry.day} • {entry.sendTime}</span>
                    <span className="text-xs font-medium px-2 py-1 rounded-md bg-primary/10 text-primary">{entry.phase}</span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">{entry.type}</p>
                    <p className="text-sm font-semibold text-foreground line-clamp-2">{entry.subject}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground line-clamp-2">{entry.purpose}</p>
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                    {entry.keyPoints.slice(0, 2).map((pt, i) => (
                      <li key={i} className="line-clamp-1">{pt}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 space-y-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Generation Options</h3>
                <p className="text-sm text-muted-foreground">Choose how you want to create these campaigns.</p>
              </div>
              <div className="text-sm font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                Total Cost: {generateDrafts ? 10 + (calendar.entries.length * 5) : 10} credits
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className={`relative flex cursor-pointer rounded-lg border p-4 shadow-sm focus:outline-none ${!generateDrafts ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <input type="radio" name="generation_type" className="sr-only" checked={!generateDrafts} onChange={() => setGenerateDrafts(false)} />
                <span className="flex flex-1">
                  <span className="flex flex-col">
                    <span className="block text-sm font-medium text-foreground">Subjects & Outlines Only</span>
                    <span className="mt-1 flex items-center text-sm text-muted-foreground">Creates draft campaigns with bullet points. You write the emails later.</span>
                  </span>
                </span>
              </label>
              
              <label className={`relative flex cursor-pointer rounded-lg border p-4 shadow-sm focus:outline-none ${generateDrafts ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <input type="radio" name="generation_type" className="sr-only" checked={generateDrafts} onChange={() => setGenerateDrafts(true)} />
                <span className="flex flex-1">
                  <span className="flex flex-col">
                    <span className="block text-sm font-medium text-foreground">Full HTML Drafts</span>
                    <span className="mt-1 flex items-center text-sm text-muted-foreground">AI writes the complete email body for every campaign in the sequence.</span>
                  </span>
                </span>
              </label>
            </div>

            <div className="flex justify-between pt-4 border-t border-border">
              <button
                onClick={() => setStep(2)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                ← Back
              </button>
              <button
                onClick={handleSaveAll}
                disabled={isSaving}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isSaving ? 'Scheduling...' : 'Create & Schedule Drafts'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
