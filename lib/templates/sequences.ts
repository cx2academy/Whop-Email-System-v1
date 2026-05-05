import { SystemTemplateCategory } from './library';

export interface TemplateSequenceStep {
  templateId: string;
  delayDays: number; // 0 means immediately after trigger
}

export interface TemplateSequence {
  id: string;
  name: string;
  description: string;
  isPro: boolean;
  steps: TemplateSequenceStep[];
}

export const SYSTEM_SEQUENCES: TemplateSequence[] = [
  {
    id: 'welcome-and-wow',
    name: 'Welcome & Wow Sequence',
    description: 'A 4-part onboarding sequence to welcome new subscribers and deliver immediate value.',
    isPro: true,
    steps: [
      { templateId: 'personal-founder-plain', delayDays: 0 },
      { templateId: 'newsletter-curator', delayDays: 2 },
      { templateId: 'newsletter-essay', delayDays: 5 },
      { templateId: 'upsell-email', delayDays: 7 },
    ],
  },
  {
    id: 'course-launch-bundle',
    name: 'Course Launch Bundle',
    description: 'A proven 3-part sequence to launch your course and drive sales.',
    isPro: true,
    steps: [
      { templateId: 'product-announcement', delayDays: 0 },
      { templateId: 'course-launch-main', delayDays: 3 },
      { templateId: 'scarcity-reminder', delayDays: 7 },
    ],
  },
  {
    id: 'webinar-nurture',
    name: 'Webinar Nurture',
    description: 'Get attendees hyped and ensure they show up to your event.',
    isPro: false,
    steps: [
      { templateId: 'webinar-reminder', delayDays: 0 },
      { templateId: 'community-engagement', delayDays: 1 },
    ],
  }
];
