"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Shield, Lock, Eye, FileText, Scale } from "lucide-react";
import Link from "next/link";

export default function PrivacyPolicy() {
  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 },
  };

  const lastUpdated = "May 4, 2026";

  const sections = [
    {
      title: "1. Information We Collect",
      icon: <Eye className="w-5 h-5 text-green-600" />,
      content: `We collect information that identifies, relates to, describes, or could reasonably be linked, directly or indirectly, with a particular consumer or device. This includes:
      • Business Information: Whop store handles, revenue ranges, and store performance metrics.
      • Contact Information: Full name, email address, and communication preferences.
      • Technical Data: IP addresses, browser types, and usage patterns via cookies and telemetry.`,
    },
    {
      title: "2. How We Use Your Information",
      icon: <Scale className="w-5 h-5 text-green-600" />,
      content: `RevTray uses collected data for "Business Purposes" to maximize your revenue efficiency, including:
      • Service Optimization: Enhancing our AI algorithms and recovery engines.
      • Communication: Sending transactional updates and marketing materials concerning RevTray and our partners.
      • Analytics: Aggregating data to identify industry trends and benchmark store performance.`,
    },
    {
      title: "3. Sharing and Disclosure",
      icon: <Lock className="w-5 h-5 text-green-600" />,
      content: `We do not sell your personal information. However, we may share data with:
      • Service Providers: Secure vendors who assist in hosting, analytics, and payment processing.
      • Business Partners: Trusted entities we collaborate with to offer integrated Whop tools.
      • Legal Necessity: When required to comply with law, regulation, or valid legal process.`,
    },
    {
      title: "4. Data Retention & Security",
      icon: <Shield className="w-5 h-5 text-green-600" />,
      content: `We implement industry-standard security measures to protect your data. Information is retained as long as necessary to provide services or satisfy legal, accounting, or reporting requirements. You acknowledge that no internet transmission is 100% secure.`,
    },
    {
      title: "5. Your Legal Rights",
      icon: <FileText className="w-5 h-5 text-green-600" />,
      content: `Depending on your location (GDPR/CCPA/other), you may have rights to:
      • Access: Request a copy of the personal data we hold about you.
      • Deletion: Request that we erase your personal data under certain conditions.
      • Opt-Out: Unsubscribe from marketing communications at any time via the 'unsubscribe' link.`,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-green-100 selection:text-green-900">
      {/* Simple Header */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-bold uppercase tracking-tight">Back to Home</span>
          </Link>
          <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
            Compliance / Privacy / v1.0
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-20">
        {/* Title Section */}
        <motion.div {...fadeInUp} className="mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 border border-green-100 text-green-700 text-[10px] font-bold uppercase tracking-widest mb-6">
            <Shield className="w-3 h-3" />
            Legal Framework
          </div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tight mb-4">Privacy Policy</h1>
          <p className="text-slate-500 text-lg">
            Last updated: <span className="font-bold text-slate-900">{lastUpdated}</span>
          </p>
        </motion.div>

        {/* Content Card */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-[2rem] border border-slate-200 p-8 md:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
        >
          <div className="prose prose-slate max-w-none">
            <p className="text-slate-600 leading-relaxed italic mb-12">
              RevTray (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting the privacy of Whop
              creators. This Privacy Policy describes how we collect, use, and handle your
              information when you use our website and services.
            </p>

            <div className="space-y-16">
              {sections.map((section, idx) => (
                <div key={idx} className="group">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-slate-50 group-hover:bg-green-50 transition-colors">
                      {section.icon}
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 m-0 leading-none">
                      {section.title}
                    </h2>
                  </div>
                  <div className="text-slate-600 leading-relaxed whitespace-pre-line pl-12 border-l border-slate-100 group-hover:border-green-200 transition-colors">
                    {section.content}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-20 p-8 rounded-2xl bg-slate-900 text-white">
              <h3 className="text-xl font-bold mb-4">Contact Us</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                If you have questions about this policy or our data practices, please reach out to
                our legal compliance team:
              </p>
              <div className="font-mono text-sm text-green-400">legal@revtray.com</div>
            </div>
          </div>
        </motion.div>

        {/* Footer info */}
        <div className="mt-12 text-center text-xs text-slate-400 font-medium">
          &copy; 2026 RevTray Engine. All rights reserved.
          <br className="md:hidden" />
          <span className="hidden md:inline mx-2">•</span>
          Operating under Texas State Jurisdiction.
        </div>
      </main>
    </div>
  );
}
