'use client';

import { useState, useTransition } from 'react';
import { PLANS, PLAN_ORDER, formatLimit, type PlanKey, type PlanDefinition } from '@/lib/plans/config';
import { upgradePlan } from '@/lib/plans/actions';
import { CheckIcon, Loader2, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export function UpgradePageClient({ workspaceId }: { workspaceId: string }) {
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [, startTransition] = useTransition();

  async function handleUpgrade(planKey: PlanKey) {
    setUpgrading(planKey);
    setMessage('');
    
    startTransition(async () => {
      const result = await upgradePlan(planKey);
      setUpgrading(null);

      if (!result.success) {
        setMessage(result.error ?? 'Upgrade failed. Try again.');
        return;
      }

      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }

      setMessage('Plan updated successfully.');
    });
  }

  const getFeatures = (key: PlanKey, plan: PlanDefinition) => {
    if (key === 'FREE') {
      return [
        { included: true, text: `${formatLimit(plan.limits.emailsPerMonth)} emails / month` },
        { included: true, text: `${formatLimit(plan.limits.contacts)} contacts` },
        { included: true, text: `${plan.limits.campaigns} campaigns / month` },
        { included: true, text: '3-day revenue attribution' },
        { included: false, text: 'Automations' },
        { included: false, text: 'Segments' },
      ];
    }
    if (key === 'STARTER') {
      return [
        { included: true, text: `${formatLimit(plan.limits.emailsPerMonth)} emails / month` },
        { included: true, text: `${formatLimit(plan.limits.contacts)} contacts` },
        { included: true, text: 'Unlimited campaigns' },
        { included: true, text: '14-day revenue attribution' },
        { included: true, text: `${plan.limits.automations} automations` },
        { included: false, text: 'A/B testing' },
      ];
    }
    if (key === 'GROWTH') {
      return [
        { included: true, text: `${formatLimit(plan.limits.emailsPerMonth)} emails / month` },
        { included: true, text: `${formatLimit(plan.limits.contacts)} contacts` },
        { included: true, text: 'Unlimited campaigns' },
        { included: true, text: 'Unlimited attribution', highlight: true },
        { included: true, text: 'Unlimited automations' },
        { included: true, text: 'A/B testing' },
      ];
    }
    if (key === 'SCALE') {
      return [
        { included: true, text: 'Unlimited emails' },
        { included: true, text: 'Unlimited contacts' },
        { included: true, text: 'All Growth features' },
        { included: true, text: 'Multiple email providers' },
        { included: true, text: 'Priority support' },
        { included: true, text: 'Dedicated onboarding' },
      ];
    }
    return [];
  };

  return (
    <div className="flex flex-col items-center w-full px-4 md:px-8 font-sans relative">
      {/* Back Button */}
      <div className="absolute top-0 left-4 md:left-8">
        <Link 
          href="/dashboard" 
          className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>

      {/* Header Section */}
      <div className="flex flex-col items-center text-center max-w-3xl mb-16 mt-12 md:mt-0">
        <div className="inline-flex items-center justify-center rounded-full border border-[#16A34A]/30 bg-[#16A34A]/10 px-3 py-1 text-[11px] font-bold tracking-widest text-[#22C55E] uppercase mb-6">
          Simple Pricing
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
          Start free. Scale as you grow.
        </h1>
        <p className="text-lg text-zinc-400 max-w-2xl">
          Every plan includes Whop sync, campaign sending, and open/click tracking.
          Upgrade when you need more.
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-7xl">
        {PLAN_ORDER.map((key) => {
          const plan = PLANS[key];
          const isGrowth = key === 'GROWTH';
          const features = getFeatures(key, plan);
          
          return (
            <div
              key={key}
              className={cn(
                "relative flex flex-col rounded-2xl border p-6 transition-all duration-200",
                isGrowth 
                  ? "border-[#22C55E] bg-[#0A0A0A] shadow-2xl shadow-[#22C55E]/10 z-10" 
                  : "border-zinc-800/50 bg-[#0A0A0A] hover:border-zinc-700/50"
              )}
            >
              {isGrowth && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#22C55E] px-3 py-1 text-[10px] font-bold tracking-wider text-black uppercase shadow-sm">
                  Most Popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">
                    ${plan.monthlyUsd}
                  </span>
                  <span className="text-sm font-medium text-zinc-500">
                    /mo
                  </span>
                </div>
                <p className="mt-3 text-sm text-zinc-400 min-h-[40px]">
                  {plan.tagline}
                </p>
              </div>

              <div className="h-px w-full bg-zinc-800/50 mb-6" />

              <div className="flex-1 space-y-4 mb-8">
                {features.map((f, i) => (
                  <FeatureItem 
                    key={i}
                    included={f.included} 
                    text={f.text} 
                    highlight={f.highlight}
                  />
                ))}
              </div>

              <button
                onClick={() => handleUpgrade(key)}
                disabled={upgrading === key || !!upgrading}
                className={cn(
                  "w-full rounded-xl py-3 px-4 text-sm font-semibold transition-all flex items-center justify-center gap-2",
                  isGrowth || key === 'STARTER'
                    ? "bg-[#22C55E] text-black hover:bg-[#16A34A] shadow-sm"
                    : "bg-[#1A1A1A] text-white hover:bg-[#262626] border border-white/5",
                  (upgrading === key || !!upgrading) && "opacity-50 cursor-not-allowed"
                )}
              >
                {upgrading === key && <Loader2 className="h-4 w-4 animate-spin" />}
                {upgrading === key 
                  ? 'Processing...' 
                  : key === 'FREE' 
                    ? 'Get started free' 
                    : `Start ${plan.name}`}
              </button>
            </div>
          );
        })}
      </div>

      {message && (
        <div className={cn(
          "mt-8 px-4 py-3 rounded-lg text-sm font-medium",
          message.includes('failed') || message.includes('error')
            ? "bg-red-500/10 text-red-400"
            : "bg-green-500/10 text-green-400"
        )}>
          {message}
        </div>
      )}
    </div>
  );
}

function FeatureItem({ included, text, highlight }: { included: boolean; text: string; highlight?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <CheckIcon className={cn("h-4 w-4 mt-0.5 shrink-0", included ? "text-[#22C55E]" : "text-zinc-600")} />
      <span className={cn(
        "text-sm",
        included ? (highlight ? "text-white font-bold" : "text-zinc-300 font-medium") : "text-zinc-600"
      )}>
        {text}
      </span>
    </div>
  );
}
