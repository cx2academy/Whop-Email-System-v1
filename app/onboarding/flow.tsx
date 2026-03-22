'use client';

/**
 * app/onboarding/flow.tsx
 *
 * Step state machine. Owns all cross-step state.
 *
 * Change: StepDomain's onNext now accepts an optional fromEmail argument.
 * When the user picks their sender address (prefix@domain) inside the
 * domain step, it gets stored in fromName state and passed to StepLive.
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
    aiCredits:    number;
  };
}

export function OnboardingFlow({ userEmail, userName, startStep, initialData }: FlowProps) {
  const [step,         setStep]         = useState(startStep);
  const [companyName,  setCompanyName]  = useState(initialData.companyName);
  const [brandColor,   setBrandColor]   = useState(initialData.brandColor);
  const [fromName,     setFromName]     = useState(initialData.fromName || initialData.companyName || userName);
  const [contactCount, setContactCount] = useState(initialData.contactCount);
  const [campaignId,   setCampaignId]   = useState<string | null>(initialData.campaignId);
  const [aiCredits,    setAiCredits]    = useState(initialData.aiCredits);

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
        onNext={(fromEmail?: string) => {
          // If user picked a sender address (prefix@domain), store it
          // It will already be saved to the DB by saveSenderAddress()
          // We update fromName here so StepLive shows the right address
          if (fromEmail) setFromName(fromEmail);
          advance();
        }}
      />
    );
    case 5: return (
      <StepSync
        onNext={(count) => { setContactCount(count); advance(); }}
      />
    );
    case 6: return (
      <StepSequence
        aiCredits={aiCredits}
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
