import { auth } from '@/auth';
import { requireWorkspaceAccess } from '@/lib/auth/session';
import { db } from '@/lib/db/client';
import { redirect } from 'next/navigation';
import { Gift, Zap, ArrowRight, ExternalLink } from 'lucide-react';
import { WhopAffiliateForm } from './affiliate-form';

export const metadata = {
  title: 'Beta Rewards — RevTray',
};

export default async function BetaRewardsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth/login');

  const { workspaceId } = await requireWorkspaceAccess();

  // Re-verify they actually graduated (all 4 + graduation submitted)
  const feedbacks = await db.betaFeedback.findMany({
    where: { workspaceId },
    select: { feature: true }
  });
  
  const submittedSet = new Set(feedbacks.map(f => f.feature));
  const hasGraduated = ['domain_setup', 'imported_leads', 'used_ai', 'sent_campaign', 'graduation'].every(q => submittedSet.has(q));

  if (!hasGraduated && process.env.NEXT_PUBLIC_BETA_MODE === 'true') {
     redirect('/dashboard');
  }

  // Determine if they've submitted affiliate username
  // Since we didn't add it to schema, we'll see if it exists in Whop
  // Actually, wait, let's just make it a front-end form that shows success if submitted.
  // We can just use the DB to store it? The user requested:
  // "the UI to connect their Whop Affiliate account to get their unique referral link."
  // And "associate it via API to generate their 40% affiliate link".
  // For the UI, we'll build the component below.

  return (
    <div className="max-w-4xl space-y-12">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-bold uppercase tracking-widest mb-6">
          <Gift className="h-4 w-4" /> Vault Unlocked
        </div>
        <h1 className="text-4xl font-display font-extrabold text-white tracking-tight leading-tight mb-4">
          Beta Rewards unlocked.
        </h1>
        <p className="text-lg text-zinc-400 leading-relaxed max-w-2xl">
          Thank you for helping us test our core systems. As promised, your exclusive rewards have been unlocked.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        
        {/* Reward 1: Static Code */}
        <div className="bg-[#0D0F12] border border-white/5 p-8 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <Zap className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">50% Off Lifetime</h3>
                <p className="text-xs text-zinc-500">Apply at checkout</p>
              </div>
            </div>
            
            <p className="text-sm text-zinc-400 leading-relaxed mb-6">
              This code will give you a permanent 50% discount on the Pro Yearly plan when we formally launch the upgrade portal next week.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Your Private Code</label>
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-4 rounded-xl">
               <code className="text-2xl font-mono font-bold text-green-400 tracking-wider">
                 FOUNDERS-50
               </code>
            </div>
          </div>
        </div>

        {/* Reward 2: Affiliate Link */}
        <div className="bg-[#0D0F12] border border-white/5 p-8 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Gift className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">40% RevShare API</h3>
                <p className="text-xs text-zinc-500">Whop Affiliate Program</p>
              </div>
            </div>
            
            <p className="text-sm text-zinc-400 leading-relaxed mb-6">
              Earn 40% recurring commission on anyone you refer. Connect your Whop username below to generate your trackable link via our Whop API integration.
            </p>
          </div>

          <WhopAffiliateForm />
        </div>

      </div>

    </div>
  );
}
