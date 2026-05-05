'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronRight, Loader2, Rocket, ShieldCheck, Zap, Palette, Globe, Search, ExternalLink, AlertCircle } from 'lucide-react';
import { saveOnboardingData, validateWhopKey, validateResendKey, completeOnboarding, checkDomainAvailability, consumeInviteCode } from './actions';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Logo } from '@/components/ui/logo';

interface OnboardingWizardProps {
  initialData: {
    name: string;
    slug: string;
    brandColor: string;
    companyName: string;
  };
  inviteCode?: string;
}

export function OnboardingWizard({ initialData, inviteCode }: OnboardingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  // State
  const [name, setName] = useState(initialData.name);
  const [slug, setSlug] = useState(initialData.slug);
  const [niche, setNiche] = useState('');
  const [brandColor, setBrandColor] = useState(initialData.brandColor);
  const [whopApiKey, setWhopApiKey] = useState('');
  const [whopCompanyName, setWhopCompanyName] = useState(initialData.companyName);
  const [isValidating, setIsValidating] = useState(false);
  const [isKeyValid, setIsKeyValid] = useState(false);

  // Domain State
  const [domainSearch, setDomainSearch] = useState('');
  const [domainStatus, setDomainStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [domainPrice, setDomainPrice] = useState<string | null>(null);

  // BYOK State
  const [resendApiKey, setResendApiKey] = useState('');
  const [resendCompanyInfo, setResendCompanyInfo] = useState<{name?: string, email?: string}|null>(null);
  const [isResendingValidating, setIsResendValidating] = useState(false);
  const [isResendKeyValid, setIsResendKeyValid] = useState(false);

  const totalSteps = 6;

  const nextStep = () => setStep((s) => Math.min(s + 1, totalSteps));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  async function handleIdentitySubmit() {
    if (!name || !slug) return toast.error('Please fill in all fields');
    setIsLoading(true);
    try {
      const result = await saveOnboardingData({ name, slug, niche });
      if (!result.success) {
        toast.error(result.error || 'Failed to save data');
        setIsLoading(false);
        return;
      }
      nextStep();
    } catch (error) {
      toast.error('Failed to save data. The URL might be taken.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleBrandingSubmit() {
    setIsLoading(true);
    try {
      await saveOnboardingData({ name, slug, niche, brandColor });
      nextStep();
    } catch (error) {
      toast.error('Failed to save branding');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleWhopValidation() {
    if (!whopApiKey) return;
    setIsValidating(true);
    try {
      const result = await validateWhopKey(whopApiKey);
      if (result.valid) {
        setIsKeyValid(true);
        setWhopCompanyName(result.companyName || '');
        toast.success('Whop API Key validated!');
      } else {
        setIsKeyValid(false);
        toast.error('Invalid API Key');
      }
    } catch (error) {
      toast.error('Validation failed');
    } finally {
      setIsValidating(false);
    }
  }

  async function handleDomainCheck() {
    if (!domainSearch) return;
    setDomainStatus('checking');
    try {
      const res = await checkDomainAvailability(domainSearch);
      if (res.available) {
        setDomainStatus('available');
        setDomainPrice(res.price || '$13.95/yr');
      } else {
        setDomainStatus('taken');
      }
    } catch {
      toast.error('Failed to check domain.');
      setDomainStatus('idle');
    }
  }

  async function handleWhopSubmit() {
    if (!isKeyValid) return toast.error('Please validate your API key first');
    setIsLoading(true);
    try {
      await saveOnboardingData({ name, slug, niche, brandColor, whopApiKey, whopCompanyName });
      nextStep();
    } catch (error) {
      toast.error('Failed to save connection');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResendValidation() {
    if (!resendApiKey) return;
    setIsResendValidating(true);
    try {
      const result = await validateResendKey(resendApiKey);
      if (result.valid) {
        setIsResendKeyValid(true);
        toast.success('Resend API Key validated!');
      } else {
        setIsResendKeyValid(false);
        toast.error('Invalid API Key');
      }
    } catch (error) {
      toast.error('Validation failed');
    } finally {
      setIsResendValidating(false);
    }
  }

  async function handleBYOKSubmit() {
    if (!isResendKeyValid) return toast.error('Please validate your Resend key first');
    setIsLoading(true);
    try {
      await saveOnboardingData({ name, slug, niche, brandColor, whopApiKey, whopCompanyName, resendApiKey });
      nextStep();
    } catch (error) {
      toast.error('Failed to save BYOK connection');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleFinish() {
    setIsLoading(true);
    try {
      if (inviteCode) {
        await consumeInviteCode(inviteCode);
      }
      await completeOnboarding();
      toast.success('Welcome to RevTray!');
      router.push('/dashboard');
    } catch (error) {
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#090A0C] text-white flex flex-col items-center justify-center p-6 sm:p-12">
      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#22C55E]/5 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-[500px] relative z-10">
        {/* Progress Header */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Logo size={32} />
              <span className="text-lg font-bold tracking-tight font-display">RevTray</span>
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
              Step {step} of {totalSteps}
            </span>
          </div>
          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-[#22C55E]"
              initial={{ width: 0 }}
              animate={{ width: `${(step / totalSteps) * 100}%` }}
              transition={{ duration: 0.5, ease: 'circOut' }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div>
                <h1 className="text-3xl font-bold font-display mb-3">Tell us about your brand</h1>
                <p className="text-gray-500">Let&apos;s set up your workspace identity.</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-2">
                    <Globe className="h-3 w-3" /> Brand Name
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alpha Trading"
                    className="w-full rounded-xl px-4 py-3.5 text-sm bg-white/5 border border-white/10 text-white placeholder:text-gray-700 focus:outline-none focus:border-[#22C55E]/50 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                    Workspace URL
                  </label>
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3.5">
                    <span className="text-gray-600 text-sm">revtray.com/</span>
                    <input
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="alpha-trading"
                      className="flex-1 bg-transparent text-sm text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                    Niche / Category
                  </label>
                  <select
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                    className="w-full rounded-xl px-4 py-3.5 text-sm bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#22C55E]/50 transition-all appearance-none"
                  >
                    <option value="" disabled className="text-gray-500 bg-[#0D0F12]">Select a niche</option>
                    {[
                      "Fitness", "Real estate", "Business", "Health & wellness", "Dating",
                      "Agencies", "Personal development", "Sales", "Social media",
                      "Personal finance", "AI", "Ecommerce", "Public speaking",
                      "Trading", "Amazon FBA", "Reselling", "Spirituality", "Careers",
                      "Home services", "Travel", "Software", "Kindle book publishing",
                      "Video games", "Clipping", "Sports betting", "VAs", "Other"
                    ].map(n => (
                       <option key={n} value={n.toLowerCase().replace(/ /g, '-')} className="text-white bg-[#0D0F12] p-2">{n}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={handleIdentitySubmit}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-4 text-sm font-bold bg-[#22C55E] text-white hover:bg-[#16A34A] transition-all disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Continue'}
                {!isLoading && <ChevronRight className="h-4 w-4" />}
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div>
                <h1 className="text-3xl font-bold font-display mb-3">Make it yours</h1>
                <p className="text-gray-500">Define your brand&apos;s visual identity.</p>
              </div>

              <div className="space-y-8">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
                    <Palette className="h-3 w-3" /> Brand Color
                  </label>
                  <div className="grid grid-cols-5 gap-4">
                    {['#22C55E', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'].map((color) => (
                      <button
                        key={color}
                        onClick={() => setBrandColor(color)}
                        className={`h-12 w-full rounded-xl transition-all ${brandColor === color ? 'ring-2 ring-white ring-offset-4 ring-offset-[#090A0C] scale-90' : 'opacity-50 hover:opacity-100'}`}
                        style={{ background: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                  <div className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-4">Preview</div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-[#0D0F12] border border-white/5">
                    <div className="h-8 w-8 rounded-lg" style={{ background: brandColor }} />
                    <div className="space-y-1 flex-1">
                      <div className="h-2 w-24 bg-white/10 rounded" />
                      <div className="h-1.5 w-16 bg-white/5 rounded" />
                    </div>
                    <div className="h-6 w-12 rounded-md" style={{ background: `${brandColor}20`, border: `1px solid ${brandColor}40` }} />
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={prevStep}
                  className="flex-1 rounded-xl py-4 text-sm font-bold bg-white/5 text-gray-400 hover:bg-white/10 transition-all"
                >
                  Back
                </button>
                <button
                  onClick={handleBrandingSubmit}
                  disabled={isLoading}
                  className="flex-[2] flex items-center justify-center gap-2 rounded-xl py-4 text-sm font-bold bg-[#22C55E] text-white hover:bg-[#16A34A] transition-all disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Continue'}
                  {!isLoading && <ChevronRight className="h-4 w-4" />}
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div>
                <h1 className="text-3xl font-bold font-display mb-3">Connect to Whop</h1>
                <p className="text-gray-500">We need your API key to sync your audience and revenue.</p>
              </div>

              <div className="space-y-6">
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex gap-3">
                  <ShieldCheck className="h-5 w-5 text-blue-400 shrink-0" />
                  <p className="text-xs text-blue-200/70 leading-relaxed">
                    Your API key is encrypted and stored securely. We only use it to read your membership and revenue data.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                    Whop API Key
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={whopApiKey}
                      onChange={(e) => {
                        setWhopApiKey(e.target.value);
                        setIsKeyValid(false);
                      }}
                      placeholder="whop_..."
                      className="w-full rounded-xl px-4 py-3.5 text-sm bg-white/5 border border-white/10 text-white placeholder:text-gray-700 focus:outline-none focus:border-[#22C55E]/50 transition-all pr-24"
                    />
                    <button
                      onClick={handleWhopValidation}
                      disabled={isValidating || !whopApiKey || isKeyValid}
                      className="absolute right-2 top-2 bottom-2 px-3 rounded-lg bg-white/10 text-xs font-bold hover:bg-white/20 transition-all disabled:opacity-50"
                    >
                      {isValidating ? <Loader2 className="h-3 w-3 animate-spin" /> : isKeyValid ? <Check className="h-3 w-3 text-[#22C55E]" /> : 'Validate'}
                    </button>
                  </div>
                  <p className="mt-2 text-[10px] text-gray-600">
                    Find this in your Whop Dashboard under Settings &gt; Developer.
                  </p>
                </div>

                {isKeyValid && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-4 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/20"
                  >
                    <div className="h-8 w-8 rounded-full bg-[#22C55E]/20 flex items-center justify-center">
                      <Zap className="h-4 w-4 text-[#22C55E]" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Connected to {whopCompanyName}</div>
                      <div className="text-[10px] text-[#22C55E]">API Key is valid</div>
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={prevStep}
                  className="flex-1 rounded-xl py-4 text-sm font-bold bg-white/5 text-gray-400 hover:bg-white/10 transition-all"
                >
                  Back
                </button>
                <button
                  onClick={handleWhopSubmit}
                  disabled={isLoading || !isKeyValid}
                  className="flex-[2] flex items-center justify-center gap-2 rounded-xl py-4 text-sm font-bold bg-[#22C55E] text-white hover:bg-[#16A34A] transition-all disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Continue'}
                  {!isLoading && <ChevronRight className="h-4 w-4" />}
                </button>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step3_5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-bold uppercase tracking-widest mb-4">
                  <ShieldCheck className="h-3 w-3" /> Private Beta
                </div>
                <h1 className="text-3xl font-bold font-display mb-3">Bring Your Own Key</h1>
                <p className="text-gray-500 text-sm leading-relaxed">
                  During our private beta, emails are sent through your own Resend account. We don't mark up email sending costs.
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                    Resend API Key
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={resendApiKey}
                      onChange={(e) => {
                         setResendApiKey(e.target.value);
                         setIsResendKeyValid(false);
                      }}
                      placeholder="re_..."
                      className="w-full rounded-xl px-4 py-3.5 text-sm bg-white/5 border border-white/10 text-white placeholder:text-gray-700 focus:outline-none focus:border-[#22C55E]/50 transition-all pr-24"
                    />
                    <button
                      onClick={handleResendValidation}
                      disabled={isResendingValidating || !resendApiKey || isResendKeyValid}
                      className="absolute right-2 top-2 bottom-2 px-3 rounded-lg bg-white/10 text-xs font-bold hover:bg-white/20 transition-all disabled:opacity-50"
                    >
                      {isResendingValidating ? <Loader2 className="h-3 w-3 animate-spin" /> : isResendKeyValid ? <Check className="h-3 w-3 text-[#22C55E]" /> : 'Validate'}
                    </button>
                  </div>
                  <p className="mt-3 text-[10px] text-gray-400 font-medium">
                    1. Create a free account at <a href="https://resend.com" target="_blank" className="text-[#22C55E] hover:underline">resend.com</a><br/>
                    2. Go to API Keys &rarr; Create Key<br/>
                    3. Ensure it has "Full access" permissions to manage your domains.
                  </p>
                </div>

                {isResendKeyValid && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-4 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/20"
                  >
                    <div className="h-8 w-8 rounded-full bg-[#22C55E]/20 flex items-center justify-center">
                      <Zap className="h-4 w-4 text-[#22C55E]" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Connected to Resend</div>
                      <div className="text-[10px] text-[#22C55E]">API Key is valid</div>
                    </div>
                  </motion.div>
                 )}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={prevStep}
                  className="flex-1 rounded-xl py-4 text-sm font-bold bg-white/5 text-gray-400 hover:bg-white/10 transition-all"
                >
                  Back
                </button>
                <button
                  onClick={handleBYOKSubmit}
                  disabled={isLoading || !isResendKeyValid}
                  className="flex-[2] flex items-center justify-center gap-2 rounded-xl py-4 text-sm font-bold bg-[#22C55E] text-white hover:bg-[#16A34A] transition-all disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Continue'}
                  {!isLoading && <ChevronRight className="h-4 w-4" />}
                </button>
              </div>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-widest mb-4">
                  <ShieldCheck className="h-3 w-3" /> Deliverability
                </div>
                <h1 className="text-3xl font-bold font-display mb-3">Secure your Deliverability</h1>
                <p className="text-gray-500 text-sm leading-relaxed">
                  To hit the primary inbox and avoid spam filters, you must send from your own domain.
                  For example, if you buy <strong className="text-white">mybrand.com</strong>, your emails will be sent from <strong className="text-[#22C55E]">contact@mybrand.com</strong>.
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                    Search for a sending domain
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={domainSearch}
                      onChange={(e) => {
                        setDomainSearch(e.target.value.toLowerCase().replace(/[^a-z0-9-.]/g, ''));
                        setDomainStatus('idle');
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleDomainCheck()}
                      placeholder="e.g., mailmybrand.com or newsmybrand.com"
                      className="w-full rounded-xl px-4 py-3.5 pl-10 text-sm bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#22C55E]/50 transition-all pr-24"
                    />
                    <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <button
                      onClick={handleDomainCheck}
                      disabled={domainStatus === 'checking' || !domainSearch}
                      className="absolute right-2 top-2 bottom-2 px-3 flex items-center justify-center rounded-lg bg-blue-500/20 text-blue-400 text-xs font-bold hover:bg-blue-500/30 transition-all disabled:opacity-50"
                    >
                      {domainStatus === 'checking' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Check'}
                    </button>
                  </div>
                </div>

                {domainStatus === 'taken' && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" /> That domain is taken. Try another!
                  </motion.div>
                )}

                {domainStatus === 'available' && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                    <div className="p-4 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/20">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-[#22C55E]/20 flex items-center justify-center">
                          <Check className="h-4 w-4 text-[#22C55E]" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white">{domainSearch} is available!</div>
                          <div className="text-xs text-[#22C55E]">~{domainPrice}</div>
                        </div>
                      </div>
                    </div>
                    
                    <a
                      href={`https://www.namesilo.com/domain/search-domains?query=${domainSearch}&rid=9b15194xx`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => nextStep()}
                      className="w-full flex items-center justify-center gap-2 rounded-xl py-4 text-sm font-bold bg-white text-black hover:bg-gray-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                    >
                      Buy on NameSilo <ExternalLink className="h-4 w-4" />
                    </a>
                    <p className="text-[10px] text-gray-500 text-center leading-relaxed">
                      Clicking this will pop open a new window to buy your domain. Once you're done checkout, come back here to finish setting up RevTray.
                    </p>
                  </motion.div>
                )}
              </div>

              <div className="flex gap-4 pt-4 border-t border-white/5">
                <button
                  onClick={prevStep}
                  className="px-6 rounded-xl py-4 text-sm font-bold bg-white/5 text-gray-400 hover:bg-white/10 transition-all"
                >
                  Back
                </button>
                <div className="flex-1" />
                <button
                  onClick={nextStep}
                  className="px-6 rounded-xl py-4 text-sm font-medium text-gray-400 hover:text-white transition-all underline decoration-white/20 underline-offset-4"
                >
                  I already have one (Skip)
                </button>
              </div>
            </motion.div>
          )}

          {step === 6 && (
            <motion.div
              key="step6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-8"
            >
              <div className="flex justify-center">
                <div className="h-24 w-24 rounded-full bg-[#22C55E]/10 flex items-center justify-center relative">
                  <motion.div 
                    className="absolute inset-0 rounded-full border-2 border-[#22C55E]/20"
                    animate={{ scale: [1, 1.2, 1], opacity: [1, 0, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <Rocket className="h-10 w-10 text-[#22C55E]" />
                </div>
              </div>

              <div>
                <h1 className="text-3xl font-bold font-display mb-3">You&apos;re ready to launch</h1>
                <p className="text-gray-500 max-w-xs mx-auto">
                  We&apos;ve set up your workspace. Click below to start syncing your audience and see the revenue.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-left space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-[#22C55E]/20 flex items-center justify-center">
                    <Check className="h-3 w-3 text-[#22C55E]" />
                  </div>
                  <span className="text-sm text-gray-300">Workspace created: <span className="text-white font-medium">{name}</span></span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-[#22C55E]/20 flex items-center justify-center">
                    <Check className="h-3 w-3 text-[#22C55E]" />
                  </div>
                  <span className="text-sm text-gray-300">Whop connected: <span className="text-white font-medium">{whopCompanyName}</span></span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-[#22C55E]/20 flex items-center justify-center">
                    <Check className="h-3 w-3 text-[#22C55E]" />
                  </div>
                  <span className="text-sm text-gray-300">Welcome email sent</span>
                </div>
              </div>

              <button
                onClick={handleFinish}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-4 text-sm font-bold bg-[#22C55E] text-white hover:bg-[#16A34A] transition-all disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Go to Dashboard'}
                {!isLoading && <ChevronRight className="h-4 w-4" />}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
