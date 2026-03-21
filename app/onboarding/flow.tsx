'use client';

/**
 * app/onboarding/flow.tsx
 *
 * Step state machine. Owns all cross-step state.
 * Each step component gets callbacks; parent holds the data.
 */

import { useState } from 'react';
import StepWhop     from './steps/step-whop';
import StepBrand    from './steps/step-brand';
import StepSender   from './steps/step-sender';
import StepDomain   from './steps/step-domain';
import StepSync     from './steps/step-sync';
import StepSequence from './steps/step-sequence';
import StepLive     from './steps/step-live';

interface FlowProps {
  userEmail:    string;
  userName:     string;
  startStep:    number;
  initialData: {
    companyName:  string;
    brandColor:   string;
    fromName:     string;
    contactCount: number;
    campaignId:   string | null;
  };
}

export function OnboardingFlow({ userEmail, userName, startStep, initialData }: FlowProps) {
  const [step,         setStep]         = useState(startStep);
  const [companyName,  setCompanyName]  = useState(initialData.companyName);
  const [brandColor,   setBrandColor]   = useState(initialData.brandColor);
  const [fromName,     setFromName]     = useState(initialData.fromName || initialData.companyName || userName);
  const [contactCount, setContactCount] = useState(initialData.contactCount);
  const [campaignId,   setCampaignId]   = useState<string | null>(initialData.campaignId);

  function advance() { setStep((s) => s + 1); }

  switch (step) {
    case 1: return (
      <StepWhop
        onNext={(name) => {
          if (name) { setCompanyName(name); setFromName(name); }
          advance();
        }}
      />
    );
    case 2: return (
      <StepBrand
        companyName={companyName}
        onNext={(name, color) => { setCompanyName(name); setBrandColor(color); advance(); }}
      />
    );
    case 3: return (
      <StepSender
        companyName={companyName}
        brandColor={brandColor}
        userEmail={userEmail}
        onNext={(name) => { setFromName(name); advance(); }}
      />
    );
    case 4: return (
      <StepDomain
        companyName={companyName}
        onNext={advance}
      />
    );
    case 5: return (
      <StepSync
        onNext={(count) => { setContactCount(count); advance(); }}
      />
    );
    case 6: return (
      <StepSequence
        onNext={(id) => { setCampaignId(id); advance(); }}
      />
    );
    case 7: return (
      <StepLive
        campaignId={campaignId}
        fromName={fromName}
        brandColor={brandColor}
        contactCount={contactCount}
        userEmail={userEmail}
      />
    );
    default: return null;
  }
}
