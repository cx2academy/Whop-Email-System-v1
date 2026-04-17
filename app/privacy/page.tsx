'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
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
          <h1 className="text-4xl font-extrabold text-white mb-8 tracking-tight">Privacy Policy</h1>
          <p className="text-zinc-500 mb-12">Last updated: April 15, 2026</p>
          
          <div className="space-y-12 prose prose-invert max-w-none">
            <section>
              <h2 className="text-xl font-bold text-white mb-4">1. Information We Collect</h2>
              <p className="leading-relaxed">
                We collect information you provide directly to us when you create an account, connect your Whop account, and use our Service. This includes:
              </p>
              <ul className="list-disc pl-6 mt-4 space-y-2">
                <li>Account information (name, email, Whop ID)</li>
                <li>Whop community data (member lists, product IDs, transaction history for attribution)</li>
                <li>Email campaign data (content, recipient lists, open/click rates)</li>
                <li>Usage data (how you interact with our Service)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-4">2. How We Use Your Information</h2>
              <p className="leading-relaxed">
                We use the information we collect to:
              </p>
              <ul className="list-disc pl-6 mt-4 space-y-2">
                <li>Provide, maintain, and improve our Service</li>
                <li>Process transactions and attribute revenue to your email campaigns</li>
                <li>Send you technical notices, updates, and support messages</li>
                <li>Respond to your comments and questions</li>
                <li>Monitor and analyze trends, usage, and activities in connection with our Service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-4">3. Data Sharing and Disclosure</h2>
              <p className="leading-relaxed">
                We do not sell your personal data. We may share your information in the following circumstances:
              </p>
              <ul className="list-disc pl-6 mt-4 space-y-2">
                <li>With third-party service providers who perform services on our behalf (e.g., email delivery services like Resend)</li>
                <li>If required by law or to protect the rights and safety of RevTray and its users</li>
                <li>In connection with a merger, sale of company assets, or acquisition</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-4">4. Data Security</h2>
              <p className="leading-relaxed">
                We take reasonable measures to protect your information from loss, theft, misuse, and unauthorized access. However, no internet transmission is ever fully secure or error-free.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-4">5. Your Choices</h2>
              <p className="leading-relaxed">
                You can access and update your account information through the RevTray dashboard. You may also request the deletion of your account and data by contacting us.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-4">6. Cookies</h2>
              <p className="leading-relaxed">
                We use cookies and similar tracking technologies to track activity on our Service and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-4">7. Changes to this Policy</h2>
              <p className="leading-relaxed">
                We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-4">8. Contact Us</h2>
              <p className="leading-relaxed">
                If you have any questions about this Privacy Policy, please contact us at privacy@revtray.com.
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
