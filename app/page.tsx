"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BetaAccessModal } from "@/components/beta/beta-access-modal";
import { Logo } from "@/components/ui/logo";
import { getPublicPlatformStats } from "@/lib/stats/actions";
import { HeroOrchestrator } from "@/components/showcase/hero-orchestrator";
import { ContinuousBento } from "@/components/showcase/continuous-bento";
import { OriginStory } from "@/components/showcase/origin-story";
import { PricingSection } from "@/components/showcase/pricing-section";
import { ScrollRevealText } from "@/components/ui/scroll-reveal-text";
import { SharedFooter } from "@/components/ui/shared-footer";
import { useBetaPopup } from "@/components/ui/beta-popup-context";

export default function HomePage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const { show: showBetaPopup, showWaitlist } = useBetaPopup();
  const router = useRouter();

  useEffect(() => {
    // Fetch live stats
    getPublicPlatformStats();

    // --- PREVIEW MODE BYPASS ---
    // Check if we have the staging bypass cookie
    const hasStagingCookie = document.cookie.includes("staging_bypass=");

    // In strict non-beta preview mode, push to dashboard.
    // Allow beta preview to actually see the beta page
    if (
      process.env.NEXT_PUBLIC_PREVIEW_MODE === "true" &&
      process.env.NEXT_PUBLIC_BETA_MODE !== "true"
    ) {
      router.push("/dashboard");
      return;
    }
    if (hasStagingCookie) {
      router.push("/dashboard");
      return;
    }
    // --- END PREVIEW MODE BYPASS ---

    const handleScroll = () => setIsScrolled(window.scrollY > 32);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [router]);

  const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-body selection:bg-green-500/30">
      {/* Navbar */}
      <nav
        className={`fixed top-0 left-0 right-0 z-[100] h-[72px] flex items-center justify-between px-6 transition-all duration-300 ${isScrolled ? "bg-white/80 backdrop-blur-xl border-b border-zinc-100" : "bg-transparent"}`}
      >
        <a
          href="/"
          className="flex items-center gap-2 font-display text-lg font-bold text-zinc-900 hover:opacity-80 transition-opacity"
        >
          <Logo size={24} />
          <span className="tracking-tight">RevTray</span>
        </a>
        <ul className="hidden md:flex gap-8 text-sm font-medium">
          <li>
            <a href="#features" className="text-zinc-500 hover:text-zinc-900 transition-colors">
              Product
            </a>
          </li>
          <li>
            <a href="#revenue" className="text-zinc-500 hover:text-zinc-900 transition-colors">
              Use Cases
            </a>
          </li>
          <li>
            <Link href="/blog" className="text-zinc-500 hover:text-zinc-900 transition-colors">
              Insights
            </Link>
          </li>
          <li>
            <Link href="/pricing" className="text-zinc-500 hover:text-zinc-900 transition-colors">
              Pricing
            </Link>
          </li>
        </ul>
        <div className="flex items-center gap-6">
          <button
            onClick={showBetaPopup}
            className="hidden sm:block text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            Sign In
          </button>
          <button
            onClick={showWaitlist}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-zinc-900 text-white hover:bg-zinc-800 transition-all shadow-sm active:scale-[0.98]"
          >
            Start Automating
          </button>
        </div>
      </nav>

      <BetaAccessModal isOpen={isAccessModalOpen} onClose={() => setIsAccessModalOpen(false)} />

      {/* Hero */}
      <section className="relative min-h-screen z-20 pt-32 pb-20 px-6 flex items-center justify-center overflow-hidden bg-white">
        {/* Technical Background Elements */}
        <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
          {/* Subtle Dot Grid */}
          <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:32px_32px]" />

          {/* Atmospheric Glows */}
          <div className="absolute top-0 left-1/4 w-[1000px] h-[1000px] bg-sky-200/20 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-1/4 w-[800px] h-[800px] bg-green-200/20 rounded-full blur-[120px] translate-x-1/2 translate-y-1/2" />

          {/* Vertical/Horizontal Technical Lines */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-zinc-100 to-transparent" />
          <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-100 to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto w-full">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            {/* Left Content Column */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="flex flex-col items-start text-left"
            >
              {/* Creator Trust Badge */}
              <motion.div
                variants={fadeInUp}
                className="mb-8 flex items-center gap-3 bg-white/40 border border-white/60 backdrop-blur-md px-4 py-2 rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.02)] ring-1 ring-black/5"
              >
                <div className="flex -space-x-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="w-7 h-7 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center overflow-hidden ring-1 ring-slate-200"
                    >
                      <img
                        src={`https://picsum.photos/seed/user${i}/40/40`}
                        alt="Creator"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                    Trusted by 42+ Whop creators
                  </span>
                </div>
              </motion.div>

              <motion.h1
                variants={fadeInUp}
                className="text-6xl md:text-7xl lg:text-8xl font-black text-zinc-900 leading-[0.95] tracking-tight mb-8"
              >
                Grow your Whop revenue on{" "}
                <span className="relative inline-block text-transparent bg-clip-text bg-gradient-to-r from-green-600 via-emerald-400 to-teal-500 animate-gradient-xy">
                  autopilot.
                  <motion.div
                    initial={{ x: "-100%" }}
                    animate={{ x: "200%" }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12 pointer-events-none"
                  />
                </span>
              </motion.h1>

              <motion.p
                variants={fadeInUp}
                className="text-lg md:text-xl text-zinc-500 max-w-xl mb-10 leading-relaxed font-medium"
              >
                The AI superagent that recovers churn and scales your MRR 24/7. Stop losing revenue
                to silent cancellations.
              </motion.p>

              <motion.div
                variants={fadeInUp}
                className="relative flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto p-1"
              >
                {/* Magnetic Glow Effect */}
                <div className="absolute inset-0 bg-green-400/20 rounded-2xl blur-3xl opacity-40 animate-pulse pointer-events-none" />

                <button
                  onClick={showWaitlist}
                  className="relative w-full sm:w-auto px-10 py-5 rounded-2xl text-lg font-black bg-zinc-900 text-white hover:bg-zinc-800 transition-all shadow-2xl shadow-green-500/20 hover:scale-[1.03] active:scale-[0.97] group overflow-hidden"
                >
                  <div className="absolute inset-0 translate-y-full group-hover:translate-y-0 bg-green-500 transition-transform duration-300" />
                  <span className="relative z-10">Join the Waitlist</span>
                </button>
                <div className="p-1 px-3 bg-zinc-50/50 backdrop-blur rounded-lg border border-zinc-100 italic text-[11px] text-zinc-400 font-medium">
                  Invite-only early access
                </div>
              </motion.div>
            </motion.div>

            {/* Right Dashboard Engine Column */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative w-full"
            >
              <div className="relative group">
                {/* Visual Frame for the Engine */}
                <div className="absolute -inset-12 bg-[radial-gradient(circle_at_center,rgba(34,197,94,0.12)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

                <div className="relative transform transition-transform duration-700">
                  <HeroOrchestrator />
                </div>

                {/* Decorative UI Accents */}
                <div className="absolute top-0 right-0 -translate-y-4 translate-x-4 flex h-6 w-12 items-center justify-center space-x-1.5 rounded-lg border border-zinc-100 bg-white shadow-sm">
                  <div className="h-1.5 w-1.5 rounded-full bg-zinc-200" />
                  <div className="h-1.5 w-1.5 rounded-full bg-zinc-200" />
                  <div className="h-1.5 w-1.5 rounded-full bg-zinc-200" />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 1. The Big Statement (Pain Point or Testimonial) - Revealing from behind */}
      <div className="relative z-10 -mt-[100vh]">
        <ScrollRevealText
          text='"I didn&apos;t realize how much MRR I was losing to silent cancellations until RevTray recovered it."'
          className="text-4xl md:text-6xl lg:text-7xl font-medium leading-tight tracking-tight"
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="flex flex-col items-center gap-1"
          >
            <div className="text-base font-semibold text-zinc-900">Cooper C.</div>
            <div className="text-sm text-zinc-500">Founder of Cx2 Wholesaling Academy</div>
          </motion.div>
        </ScrollRevealText>
      </div>

      <ContinuousBento />

      {/* 5. Origin Story */}
      <OriginStory />

      {/* 6. Pricing */}
      <PricingSection onWaitlistOpen={showWaitlist} />

      {/* 7. Final CTA */}
      <section className="py-28 px-6 bg-zinc-50 border-t border-zinc-100 text-center flex flex-col items-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-medium text-zinc-900 leading-[1.1] tracking-tight mb-6">
            Start automating your MRR recovery today.
          </h2>
          <p className="text-zinc-500 text-lg mb-10">
            Join the waitlist and be the first to experience the Whop AI superagent.
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={showWaitlist}
              className="px-8 py-4 rounded-2xl text-base font-bold bg-zinc-900 text-white hover:bg-zinc-800 transition-all shadow-xl hover:scale-[1.02] active:scale-[0.98]"
            >
              Start for free
            </button>
            <button
              onClick={showBetaPopup}
              className="px-8 py-4 rounded-2xl text-base font-semibold bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 transition-all shadow-sm hidden md:block"
            >
              See our plans
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <SharedFooter />
    </div>
  );
}
