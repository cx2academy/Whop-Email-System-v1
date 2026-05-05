"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Loader2, Sparkles } from "lucide-react";
import { joinWaitlist } from "./actions";
import toast from "react-hot-toast";

export function WaitlistDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [isVipMode, setIsVipMode] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    inviteCode: "",
    whopHandle: "",
    revenueRange: "",
    reason: "",
    acceptedPledge: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.acceptedPledge) {
      toast.error("Please accept the Beta Pledge to continue.");
      return;
    }

    setIsSubmitting(true);
    try {
      await joinWaitlist(formData);
      setIsSuccess(true);
      toast.success("Application submitted!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to join waitlist.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white border border-zinc-200 rounded-3xl shadow-[0_30px_100px_rgba(0,0,0,0.15)] overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#D9F99D]" />

            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 text-zinc-400 hover:text-zinc-900 transition-colors z-20"
            >
              <X size={20} />
            </button>

            {isSuccess ? (
              <div className="p-12 text-center space-y-6">
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="h-24 w-24 rounded-full bg-green-50 flex items-center justify-center text-green-600 relative z-10 border border-green-100">
                      <Check size={48} />
                    </div>
                    <motion.div
                      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="absolute inset-0 bg-green-200 rounded-full blur-xl -z-10"
                    />
                  </div>
                </div>
                <div>
                  <h2 className="text-3xl font-extrabold text-zinc-900 mb-2 tracking-tight">
                    You&apos;re on the list!
                  </h2>
                  <div className="inline-block px-5 py-2 bg-green-50 border border-green-100 rounded-full text-green-700 font-mono text-lg mb-6">
                    You are #452 in line
                  </div>

                  <div className="p-8 bg-zinc-50 border border-zinc-100 rounded-3xl text-left space-y-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles size={16} className="text-green-600" />
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                        The Referral Loop
                      </span>
                    </div>
                    <p className="text-sm text-zinc-600 leading-relaxed">
                      Want to skip the line? Refer one creator to RevTray and{" "}
                      <span className="text-zinc-900 font-bold">skip 100 spots</span> instantly.
                    </p>
                    <div className="flex gap-2 p-2 bg-white border border-zinc-200 rounded-2xl shadow-sm">
                      <input
                        readOnly
                        value={`revtray.com/waitlist?ref=${formData.email.split("@")[0]}`}
                        className="bg-transparent text-[11px] text-zinc-400 font-medium flex-1 px-3 focus:outline-none"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `revtray.com/waitlist?ref=${formData.email.split("@")[0]}`
                          );
                          toast.success("Link copied!");
                        }}
                        className="bg-zinc-900 text-white px-4 py-2 rounded-xl text-[10px] font-bold hover:bg-zinc-800 transition-colors shadow-sm"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-full text-zinc-400 hover:text-zinc-900 font-bold text-xs uppercase tracking-widest transition-colors py-2"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="p-10 md:p-12">
                <div className="mb-10 text-center">
                  <div className="flex items-center gap-3 mb-8 max-w-[200px] mx-auto">
                    <div
                      className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= 1 ? "bg-green-500" : "bg-zinc-100"}`}
                    />
                    <div
                      className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= 2 ? "bg-green-500" : "bg-zinc-100"}`}
                    />
                  </div>
                  <h2 className="text-3xl font-extrabold text-zinc-900 tracking-tight mb-3">
                    {step === 1 ? "Join the waitlist" : "Business details"}
                  </h2>
                  <p className="text-zinc-500 text-sm leading-relaxed max-w-xs mx-auto">
                    {step === 1
                      ? "Join 400+ top creators waiting to optimize their ROI."
                      : "We only admit genuine Whop businesses to the early beta phase."}
                  </p>
                </div>

                {step === 1 ? (
                  <form onSubmit={handleNext} className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">
                          Full Name
                        </label>
                        <input
                          required
                          value={formData.name}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, name: e.target.value }))
                          }
                          placeholder="John Doe"
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-5 py-4 text-sm text-zinc-900 focus:outline-none focus:border-green-500/50 focus:ring-4 focus:ring-green-500/5 transition-all font-medium placeholder:text-zinc-300"
                        />
                      </div>
                      {isVipMode ? (
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1 flex items-center justify-between">
                            Invite Code
                            <span className="bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded text-[8px]">VIP ACCESS</span>
                          </label>
                          <input
                            required
                            value={formData.inviteCode}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, inviteCode: e.target.value.toUpperCase() }))
                            }
                            placeholder="REV-XXXX-XXXX"
                            className="w-full bg-slate-900 border-2 border-indigo-500/30 rounded-2xl px-5 py-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all font-mono tracking-widest uppercase"
                          />
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">
                            Email Address
                          </label>
                          <input
                            required
                            type="email"
                            value={formData.email}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, email: e.target.value }))
                            }
                            placeholder="john@example.com"
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-5 py-4 text-sm text-zinc-900 focus:outline-none focus:border-green-500/50 focus:ring-4 focus:ring-green-500/5 transition-all font-medium placeholder:text-zinc-300"
                          />
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-zinc-900 text-white font-bold py-5 rounded-2xl hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 group shadow-lg"
                    >
                      {isVipMode ? "Claim VIP Spot" : "Next Step"}{" "}
                      <ArrowRight
                        size={18}
                        className="group-hover:translate-x-1 transition-transform"
                      />
                    </button>

                    <div className="text-center mt-6 space-y-4">
                      <button
                        type="button"
                        onClick={() => setIsVipMode(!isVipMode)}
                        className="text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-400 transition-colors"
                      >
                        {isVipMode ? "Wait, I don't have a code" : "Already have an invite code?"}
                      </button>
                      <p className="text-xs text-zinc-500 font-medium">
                        Already accepted?{" "}
                        <a href="/auth/login" className="text-zinc-900 font-bold hover:underline">
                          Sign in
                        </a>
                      </p>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">
                          Whop Store Handle
                        </label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-5 flex items-center text-zinc-300 group-focus-within:text-zinc-900 font-medium transition-colors">
                            whop.com/
                          </div>
                          <input
                            required
                            value={formData.whopHandle}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, whopHandle: e.target.value }))
                            }
                            placeholder="your-store"
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl pl-[96px] pr-5 py-4 text-sm text-zinc-900 focus:outline-none focus:border-green-500/50 focus:ring-4 focus:ring-green-500/5 transition-all font-medium placeholder:text-zinc-300"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">
                          Current Monthly Revenue
                        </label>
                        <select
                          required
                          value={formData.revenueRange}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, revenueRange: e.target.value }))
                          }
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-5 py-4 text-sm text-zinc-900 focus:outline-none focus:border-green-500/50 focus:ring-4 focus:ring-green-500/5 transition-all font-medium appearance-none"
                        >
                          <option value="" className="bg-white">
                            Select range...
                          </option>
                          <option value="0-1k" className="bg-white">
                            $0 - $1k
                          </option>
                          <option value="1-5k" className="bg-white">
                            $1k - $5k
                          </option>
                          <option value="5-20k" className="bg-white">
                            $5k - $20k
                          </option>
                          <option value="20k+" className="bg-white">
                            $20k+
                          </option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-start gap-3 px-1">
                        <input
                          type="checkbox"
                          required
                          checked={formData.acceptedPledge}
                          onChange={(e) =>
                            setFormData((p) => ({ ...p, acceptedPledge: e.target.checked }))
                          }
                          className="mt-1 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 cursor-pointer"
                        />
                        <div className="space-y-1">
                          <div className="text-[13px] font-bold text-zinc-800">
                            Agree to the Beta Terms
                          </div>
                          <p className="text-[11px] text-zinc-500 leading-relaxed">
                            I understand that RevTray is currently in private beta and I commit to
                            providing constructive feedback.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 px-1">
                        <input
                          type="checkbox"
                          required
                          className="mt-1 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 cursor-pointer"
                        />
                        <p className="text-[11px] text-zinc-500 leading-relaxed pt-0.5">
                          I agree to the{" "}
                          <a href="/privacy" className="text-zinc-900 font-bold hover:underline">
                            Privacy Policy
                          </a>{" "}
                          and{" "}
                          <a href="/terms" className="text-zinc-900 font-bold hover:underline">
                            Terms of Service
                          </a>
                          . I also consent to receive transactional and marketing updates from
                          RevTray.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="flex-1 bg-zinc-100 text-zinc-600 font-bold py-5 rounded-2xl hover:bg-zinc-200 transition-colors"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-[2] bg-[#D9F99D] text-zinc-900 font-bold py-5 rounded-2xl hover:bg-[#bef264] transition-all flex items-center justify-center gap-2 shadow-lg"
                      >
                        {isSubmitting ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          "Apply Now"
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

const ArrowRight = ({ size, className }: { size: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M5 12h14m-7-7 7 7-7 7" />
  </svg>
);
