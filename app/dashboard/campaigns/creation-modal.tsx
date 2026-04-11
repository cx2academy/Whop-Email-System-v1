'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { PlusIcon, SparklesIcon, FileTextIcon, CalendarIcon, ListOrderedIcon, MailIcon, LayoutTemplateIcon, XIcon } from 'lucide-react';

import { Portal } from '@/components/ui/portal';

export function CreationModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90"
        style={{ background: 'var(--brand)', boxShadow: '0 2px 8px rgba(34,197,94,0.25)' }}
      >
        <PlusIcon className="h-4 w-4" />
        New campaign
      </button>

      <AnimatePresence>
        {isOpen && (
          <Portal>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOpen(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-4xl overflow-hidden rounded-2xl bg-background shadow-2xl"
              >
                <div className="flex h-[600px] max-h-[90vh] flex-col md:flex-row overflow-y-auto md:overflow-hidden">
                  
                  {/* Close Button */}
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="absolute right-4 top-4 z-10 rounded-full p-2 text-muted-foreground hover:bg-muted/50 transition-colors"
                  >
                    <XIcon className="h-5 w-5" />
                  </button>

                  {/* Left Side: The Artisan (Manual) */}
                  <div className="flex-1 p-10 flex flex-col justify-center bg-background">
                    <div className="mb-8">
                      <h2 className="text-2xl font-bold text-foreground mb-2" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
                        The Artisan
                      </h2>
                      <p className="text-muted-foreground text-sm">
                        Craft your message from scratch or start with a proven structure. Total control over every detail.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <Link 
                        href="/dashboard/campaigns/new"
                        className="group flex items-start gap-4 rounded-xl border border-border bg-card p-5 transition-all hover:border-foreground/20 hover:shadow-md"
                      >
                        <div className="rounded-lg bg-muted p-2.5 text-foreground group-hover:bg-foreground group-hover:text-background transition-colors">
                          <FileTextIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground mb-1">Start from Scratch</h3>
                          <p className="text-xs text-muted-foreground">Open a blank canvas and write your campaign manually.</p>
                        </div>
                      </Link>

                      <Link 
                        href="/dashboard/templates"
                        className="group flex items-start gap-4 rounded-xl border border-border bg-card p-5 transition-all hover:border-foreground/20 hover:shadow-md"
                      >
                        <div className="rounded-lg bg-muted p-2.5 text-foreground group-hover:bg-foreground group-hover:text-background transition-colors">
                          <LayoutTemplateIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground mb-1">Use a Template</h3>
                          <p className="text-xs text-muted-foreground">Choose from our library of high-converting email templates.</p>
                        </div>
                      </Link>
                    </div>
                  </div>

                  {/* Right Side: The Architect (AI) */}
                  <div className="flex-1 p-10 flex flex-col justify-center relative overflow-hidden"
                       style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.05) 0%, rgba(34,197,94,0.15) 100%)' }}>
                    
                    {/* Subtle background glow */}
                    <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-brand/20 blur-[80px]" />
                    <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-brand/20 blur-[80px]" />

                    <div className="relative z-10 mb-8">
                      <div className="flex items-center gap-2 mb-2">
                        <SparklesIcon className="h-5 w-5 text-brand" />
                        <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
                          The Architect
                        </h2>
                      </div>
                      <p className="text-muted-foreground text-sm">
                        Let our AI build your strategy. Generate high-converting copy tailored to your audience and goals.
                      </p>
                    </div>

                    <div className="relative z-10 space-y-4">
                      <Link 
                        href="/dashboard/campaigns/calendar/new"
                        className="group flex items-start gap-4 rounded-xl border border-brand/20 bg-background/60 backdrop-blur-sm p-5 transition-all hover:border-brand/50 hover:shadow-lg hover:shadow-brand/5"
                      >
                        <div className="rounded-lg bg-brand/10 p-2.5 text-brand group-hover:bg-brand group-hover:text-white transition-colors">
                          <CalendarIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground mb-1">Content Calendar</h3>
                          <p className="text-xs text-muted-foreground">Generate 30 days of strategic content based on your goals.</p>
                        </div>
                      </Link>

                      <Link 
                        href="/dashboard/campaigns/sequence"
                        className="group flex items-start gap-4 rounded-xl border border-brand/20 bg-background/60 backdrop-blur-sm p-5 transition-all hover:border-brand/50 hover:shadow-lg hover:shadow-brand/5"
                      >
                        <div className="rounded-lg bg-brand/10 p-2.5 text-brand group-hover:bg-brand group-hover:text-white transition-colors">
                          <ListOrderedIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground mb-1">Email Sequence</h3>
                          <p className="text-xs text-muted-foreground">Build a 5-part automated sequence to nurture or sell.</p>
                        </div>
                      </Link>

                      <Link 
                        href="/dashboard/campaigns/generate"
                        className="group flex items-start gap-4 rounded-xl border border-brand/20 bg-background/60 backdrop-blur-sm p-5 transition-all hover:border-brand/50 hover:shadow-lg hover:shadow-brand/5"
                      >
                        <div className="rounded-lg bg-brand/10 p-2.5 text-brand group-hover:bg-brand group-hover:text-white transition-colors">
                          <MailIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground mb-1">Single Email</h3>
                          <p className="text-xs text-muted-foreground">Write one perfect, conversion-optimized email instantly.</p>
                        </div>
                      </Link>
                    </div>
                  </div>

                </div>
              </motion.div>
            </div>
          </Portal>
        )}
      </AnimatePresence>
    </>
  );
}
