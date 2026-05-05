"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Scale, AlertTriangle, UserCheck, Zap, Ban, Gavel } from "lucide-react";
import Link from "next/link";

export default function TermsOfService() {
  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 },
  };

  const lastUpdated = "May 4, 2026";

  const sections = [
    {
      title: "1. Acceptance of Terms",
      icon: <UserCheck className="w-5 h-5 text-green-600" />,
      content: `By accessing or using RevTray, you agree to be bound by these Terms of Service. If you are using the service on behalf of a business (e.g., your Whop store), you represent that you have the authority to bind that entity to these terms.`,
    },
    {
      title: "2. Beta Nature of Service",
      icon: <Zap className="w-5 h-5 text-green-600" />,
      content: `RevTray is currently in a "Private Beta" phase. You acknowledge that the service is provided "AS IS" and "AS AVAILABLE." We make no guarantees regarding uptime, stability, or the accuracy of automated revenue recovery actions. Use of the service during this period is at your own risk.`,
    },
    {
      title: "3. Revenue Engine Authorization",
      icon: <Scale className="w-5 h-5 text-green-600" />,
      content: `By connecting your Whop store, you grant RevTray the explicit right to:
      • Analyze your transaction data and customer behavior.
      • Execute automated email campaigns and recovery sequences on your behalf.
      • Modify subscriber metadata within your Whop environment to optimize for retention.
      You remain solely responsible for the content of your communications and compliance with anti-spam laws (CAN-SPAM, etc.).`,
    },
    {
      title: "4. Limitation of Liability",
      icon: <AlertTriangle className="w-5 h-5 text-green-600" />,
      content: `TO THE MAXIMUM EXTENT PERMITTED BY LAW, REVTRAY ENGINE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES, INCLUDING LOSS OF PROFITS, REVENUE, OR DATA. 
      In no event shall our total liability for any claim exceed the amount paid by you to us in the past twelve months, or $100 USD, whichever is greater.`,
    },
    {
      title: "5. Termination & Suspension",
      icon: <Ban className="w-5 h-5 text-green-600" />,
      content: `We reserve the right to suspend or terminate your access to RevTray at any time, for any reason, including but not limited to:
      • Violation of these terms.
      • Harmful behavior toward the RevTray community or infrastructure.
      • At our sole discretion during the management of the Beta lifecycle.`,
    },
    {
      title: "6. Governing Law",
      icon: <Gavel className="w-5 h-5 text-green-600" />,
      content: `These Terms shall be governed by and construed in accordance with the laws of the State of Texas, without regard to its conflict of law provisions. Any legal action or proceeding arising under these Terms will be brought exclusively in the courts located in Austin, TX.`,
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
            Legal / Terms / v1.0
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-20">
        {/* Title Section */}
        <motion.div {...fadeInUp} className="mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 border border-green-100 text-green-700 text-[10px] font-bold uppercase tracking-widest mb-6">
            <Scale className="w-3 h-3" />
            Service Agreement
          </div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tight mb-4">
            Terms of Service
          </h1>
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
            <p className="text-slate-600 leading-relaxed mb-12">
              Please read these Terms of Service Carefully. These terms govern your use of the
              RevTray platform and automation engine. By using our service, you agree to these
              conditions in their entirety.
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

            <div className="mt-20 p-8 rounded-2xl bg-slate-50 border border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Questions?</h3>
              <p className="text-slate-500 text-sm mb-0">
                For clear explanations of these terms or reporting violations, please contact
                <span className="font-bold text-slate-900 ml-1">legal@revtray.com</span>
              </p>
            </div>
          </div>
        </motion.div>

        {/* Footer info */}
        <div className="mt-12 text-center text-xs text-slate-400 font-medium pb-20">
          &copy; 2026 RevTray Engine. Operating under the jurisdiction of the State of Texas.
        </div>
      </main>
    </div>
  );
}
