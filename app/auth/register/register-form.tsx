"use client";

/**
 * app/auth/register/register-form.tsx
 *
 * Registration form. Calls registerUser server action, then redirects to login.
 */

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { registerUser } from "@/lib/workspace/actions";

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 field states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");

  // Step 2 field states for validation and "Other" logic
  const [persona, setPersona] = useState("");
  const [heardAboutUs, setHeardAboutUs] = useState("");

  // Extract UTM parameters silently
  const utmSource = searchParams.get('utm_source') || '';
  const utmMedium = searchParams.get('utm_medium') || '';
  const utmCampaign = searchParams.get('utm_campaign') || '';

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const result = await registerUser(formData);

      if (!result.success) {
        setError(result.error);
        return;
      }

      // Instead of immediate login and redirect, we show the verification step
      setStep(3);
    } catch (err) {
      console.error("Registration error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  const inputClasses = "flex h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white ring-offset-[#090A0C] transition-all placeholder:text-gray-700 focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-[#22C55E]/50 focus:border-[#22C55E]/50 disabled:cursor-not-allowed disabled:opacity-50";
  const labelClasses = "mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500";

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#22C55E] text-[10px] font-bold text-white shadow-[0_0_15px_rgba(34,197,94,0.3)]">1</div>
                <h2 className="text-sm font-bold tracking-tight text-white uppercase tracking-widest text-[11px]">Account Information</h2>
              </div>

              <div className="grid gap-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className={labelClasses}>First name</label>
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      disabled={isLoading}
                      placeholder="Jane"
                      className={inputClasses}
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className={labelClasses}>Last name</label>
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      disabled={isLoading}
                      placeholder="Smith"
                      className={inputClasses}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className={labelClasses}>Email address</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    placeholder="you@example.com"
                    className={inputClasses}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="dob" className={labelClasses}>Date of Birth</label>
                    <input
                      id="dob"
                      name="dob"
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      disabled={isLoading}
                      className={inputClasses}
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                  <div>
                    <label htmlFor="phoneNumber" className={labelClasses}>Phone Number</label>
                    <input
                      id="phoneNumber"
                      name="phoneNumber"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      disabled={isLoading}
                      placeholder="+1 (555) 000-0000"
                      className={inputClasses}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className={labelClasses}>Password</label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    placeholder="••••••••"
                    className={inputClasses}
                  />
                  <p className="mt-2 text-[10px] text-gray-500 leading-normal">
                    Must be at least 8 characters and include uppercase, lowercase, a number, and a special character.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 h-12 text-sm font-bold text-white transition-all active:scale-[0.98]"
              >
                Continue to Business Profile
              </button>
            </motion.div>
          ) : step === 2 ? (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#22C55E] text-[10px] font-bold text-white shadow-[0_0_15px_rgba(34,197,94,0.3)]">2</div>
                <h2 className="text-sm font-bold tracking-tight text-white uppercase tracking-widest text-[11px]">Business Profile</h2>
              </div>

              {/* Step 1 data preservation */}
              <input type="hidden" name="firstName" value={firstName} />
              <input type="hidden" name="lastName" value={lastName} />
              <input type="hidden" name="email" value={email} />
              <input type="hidden" name="dob" value={dob} />
              <input type="hidden" name="phoneNumber" value={phoneNumber} />
              <input type="hidden" name="password" value={password} />

              <div className="grid gap-5">
                <div>
                  <label htmlFor="workspaceName" className={labelClasses}>Workspace name</label>
                  <input
                    id="workspaceName"
                    name="workspaceName"
                    type="text"
                    required
                    disabled={isLoading}
                    placeholder="My Creator Brand"
                    className={inputClasses}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="persona" className={labelClasses}>Category</label>
                    <select
                      id="persona"
                      name="persona"
                      value={persona}
                      onChange={(e) => setPersona(e.target.value)}
                      disabled={isLoading}
                      className={inputClasses}
                    >
                      <option value="" className="bg-[#0D0F12]">Select</option>
                      <option value="creator" className="bg-[#0D0F12]">Creator</option>
                      <option value="agency" className="bg-[#0D0F12]">Agency</option>
                      <option value="ecommerce" className="bg-[#0D0F12]">E-com</option>
                      <option value="saas" className="bg-[#0D0F12]">SaaS</option>
                      <option value="other" className="bg-[#0D0F12]">Other</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="heardAboutUs" className={labelClasses}>Source</label>
                    <select
                      id="heardAboutUs"
                      name="heardAboutUs"
                      value={heardAboutUs}
                      onChange={(e) => setHeardAboutUs(e.target.value)}
                      disabled={isLoading}
                      className={inputClasses}
                    >
                      <option value="" className="bg-[#0D0F12]">Select</option>
                      <option value="twitter" className="bg-[#0D0F12]">X</option>
                      <option value="tiktok" className="bg-[#0D0F12]">TikTok</option>
                      <option value="google" className="bg-[#0D0F12]">Search</option>
                      <option value="whop" className="bg-[#0D0F12]">Whop</option>
                      <option value="other" className="bg-[#0D0F12]">Other</option>
                    </select>
                  </div>
                </div>

                <AnimatePresence>
                  {(persona === "other" || heardAboutUs === "other") && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="grid gap-3"
                    >
                      {persona === "other" && (
                        <input
                          type="text"
                          name="personaOther"
                          required
                          placeholder="Specifiy Category"
                          disabled={isLoading}
                          className="flex h-10 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-xs text-white placeholder:text-gray-700"
                        />
                      )}
                      {heardAboutUs === "other" && (
                        <input
                          type="text"
                          name="heardAboutUsOther"
                          required
                          placeholder="Specify Source"
                          disabled={isLoading}
                          className="flex h-10 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-xs text-white placeholder:text-gray-700"
                        />
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="space-y-3 pt-4 border-t border-white/5 text-[11px]">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input type="checkbox" name="termsAccepted" required disabled={isLoading} className="mt-1 h-3.5 w-3.5 rounded border-white/10 bg-white/5 text-[#22C55E] focus:ring-[#22C55E] focus:ring-offset-[#0D0F12]" />
                  <span className="text-gray-500 group-hover:text-gray-300">I agree to the <Link href="/terms" className="text-white hover:underline transition-colors uppercase font-bold text-[10px]">Terms</Link> and <Link href="/privacy" className="text-white hover:underline transition-colors uppercase font-bold text-[10px]">Privacy</Link>. *</span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input type="checkbox" name="marketingConsent" disabled={isLoading} className="mt-1 h-3.5 w-3.5 rounded border-white/10 bg-white/5 text-[#22C55E] focus:ring-[#22C55E] focus:ring-offset-[#0D0F12]" />
                  <span className="text-gray-600 group-hover:text-gray-400">Receive product updates and promotional offers.</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-xl border border-white/10 bg-white/5 py-3.5 text-xs font-bold text-gray-500 hover:text-white transition-colors"
                >
                  Go Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="rounded-xl py-3.5 text-xs font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                  style={{ background: '#22C55E' }}
                >
                  {isLoading ? "Creating..." : "Confirm Account"}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="space-y-6 text-center py-8"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#22C55E]/10 text-[#22C55E] mb-2">
                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-white">Verify your account</h2>
                <p className="text-sm text-gray-400 leading-relaxed px-4">
                  We've sent a verification link to your email. Please check your inbox and click the link to activate your workspace and prevent duplicate accounts.
                </p>
              </div>

              <div className="pt-4 px-8">
                <Link 
                  href="/auth/login"
                  className="flex w-full items-center justify-center rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 h-11 text-sm font-bold text-white transition-all active:scale-[0.98]"
                >
                  Back to Log In
                </Link>
              </div>
              
              <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold">
                Check your spam folder if you don't see it.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <input type="hidden" name="utmSource" value={utmSource} />
        <input type="hidden" name="utmMedium" value={utmMedium} />
        <input type="hidden" name="utmCampaign" value={utmCampaign} />

        <AnimatePresence>
          {error && step !== 3 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 font-medium"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </div>
  );
}
