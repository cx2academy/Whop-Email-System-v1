import { AutomationStepType } from '@prisma/client';

export interface AutomationBlueprint {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'Retention' | 'Growth' | 'Onboarding';
  steps: {
    type: AutomationStepType;
    config: any;
  }[];
}

export const AUTOMATION_BLUEPRINTS: AutomationBlueprint[] = [
  {
    id: 'welcome-sequence',
    name: 'New Member Welcome',
    description: 'Automatically greet new members the moment they join your community.',
    icon: 'Sparkles',
    category: 'Onboarding',
    steps: [
      {
        type: AutomationStepType.TRIGGER,
        config: { type: 'whop_membership_start' }
      },
      {
        type: AutomationStepType.SEND_EMAIL,
        config: { 
          subject: 'Welcome to the family! 🚀',
          templateId: null,
          body: 'Hey there! We are so excited to have you here. Check out the resources below to get started...'
        }
      }
    ]
  },
  {
    id: 'win-back-cancelled',
    name: 'Win-Back Flow',
    description: 'Recover lost revenue by sending a targeted offer when a membership is cancelled.',
    icon: 'RotateCcw',
    category: 'Retention',
    steps: [
      {
        type: AutomationStepType.TRIGGER,
        config: { type: 'whop_membership_cancel' }
      },
      {
        type: AutomationStepType.DELAY,
        config: { delayValue: 1, delayUnit: 'hours' }
      },
      {
        type: AutomationStepType.SEND_EMAIL,
        config: { 
          subject: 'We hate to see you go...',
          templateId: null,
          body: 'Hey, we noticed you cancelled your membership. Was there something we could have done better? Here is a 20% discount if you want to come back...'
        }
      }
    ]
  },
  {
    id: 'upsell-after-purchase',
    name: 'Post-Purchase Upsell',
    description: 'Strike while the iron is hot. Suggest a complementary product after a successful purchase.',
    icon: 'TrendingUp',
    category: 'Growth',
    steps: [
      {
        type: AutomationStepType.TRIGGER,
        config: { type: 'whop_purchase' }
      },
      {
        type: AutomationStepType.DELAY,
        config: { delayValue: 2, delayUnit: 'days' }
      },
      {
        type: AutomationStepType.SEND_EMAIL,
        config: { 
          subject: 'Ready for the next level?',
          templateId: null,
          body: 'We hope you are enjoying your recent purchase! Many of our members also find [Product Name] extremely helpful for...'
        }
      }
    ]
  }
];
