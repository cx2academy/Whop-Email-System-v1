'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-300 py-20 px-6">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white mb-12 transition-colors">
          <ArrowLeft size={16} /> Back to home
        </Link>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-extrabold text-white mb-8 tracking-tight">Terms of Service</h1>
          <p className="text-zinc-500 mb-12">Last updated: April 15, 2026</p>
          
          <div className="space-y-12 prose prose-invert max-w-none">
            <section>
              <h2 className="text-xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
              <p className="leading-relaxed">
                By accessing or using RevTray ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service. RevTray is a product designed specifically for Whop creators to manage email marketing and revenue attribution.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-4">2. Description of Service</h2>
              <p className="leading-relaxed">
                RevTray provides email marketing tools, including campaign management, automated workflows, AI-powered content generation, and revenue attribution integrated with the Whop platform.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-4">3. User Accounts</h2>
              <p className="leading-relaxed">
                To use RevTray, you must connect your Whop account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-4">4. Acceptable Use</h2>
              <p className="leading-relaxed">
                You agree not to use the Service for any unlawful purpose or in any way that violates the rights of others. This includes, but is not limited to, sending spam, phishing, or distributing malicious content. You must comply with all applicable anti-spam laws (e.g., CAN-SPAM Act).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-4">5. Fees and Payment</h2>
              <p className="leading-relaxed">
                RevTray offers various subscription plans. Fees are billed through the Whop platform. By subscribing to a paid plan, you agree to pay all applicable fees. All fees are non-refundable unless otherwise required by law.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-4">6. Data Privacy</h2>
              <p className="leading-relaxed">
                Your use of the Service is also governed by our Privacy Policy. By using RevTray, you consent to the collection and use of your data as described in the Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-4">7. Limitation of Liability</h2>
              <p className="leading-relaxed">
                RevTray is provided "as is" without any warranties. In no event shall RevTray be liable for any indirect, incidental, special, or consequential damages arising out of or in connection with your use of the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-4">8. Changes to Terms</h2>
              <p className="leading-relaxed">
                We reserve the right to modify these Terms of Service at any time. We will notify you of any significant changes by posting the new terms on the Service. Your continued use of the Service after such changes constitutes your acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-4">9. Contact Us</h2>
              <p className="leading-relaxed">
                If you have any questions about these Terms of Service, please contact us at support@revtray.com.
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
