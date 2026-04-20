'use client';

import { useEffect, useRef } from 'react';
import { useTour, TourStep } from './tour-context';

export const CORE_TOUR_STEPS: TourStep[] = [
  {
    id: 'tour-dashboard-overview',
    title: 'Welcome to your Command Center',
    description: 'This is your RevTray dashboard. Watch your performance and revenue metrics update in real-time as your campaigns are delivered.',
    position: 'bottom',
    actionType: 'view'
  },
  {
    id: 'tour-sidebar-insights',
    title: 'Actionable Insights',
    description: 'Track granular delivery rates, audience growth, and directly attribute your email performance to actual Stripe/Whop revenue.',
    position: 'right',
    actionType: 'view',
  },
  {
    id: 'tour-sidebar-growth',
    title: 'Growth & Automation',
    description: 'When you are ready, use our visual builders to create automated sequences and lead capture forms.',
    position: 'right',
    actionType: 'view',
  },
  {
    id: 'tour-sidebar-nav-contacts',
    title: 'Build Your Audience',
    description: 'Before you can send, you need an audience. Click the Contacts link to head there now.',
    position: 'right',
    actionType: 'navigate'
  },
  {
    id: 'tour-contacts-sync-btn',
    title: 'Sync Your Customers',
    description: 'Click this button to instantly bridge your Whop members over to RevTray as active subscribers.',
    position: 'bottom',
    actionType: 'click'
  },
  {
    id: 'tour-contacts-sync-status',
    title: 'Live Sync',
    description: 'Watch as your contacts are securely synced into RevTray. (If a sync error occurs, you can always try again later!)',
    position: 'bottom',
    actionType: 'view'
  },
  {
    id: 'tour-sidebar-nav-campaigns', // Need to add to campaigns list
    title: 'Time to Send',
    description: 'Now that we have contacts, let\'s build an email. Navigate to the Campaigns tab.',
    position: 'right',
    actionType: 'navigate'
  },
  {
    id: 'tour-new-campaign-btn',
    title: 'Create Your Campaign',
    description: 'Click here to start drafting your first campaign.',
    position: 'bottom',
    actionType: 'click'
  },
  {
    id: 'tour-creation-modal-overview',
    title: 'The AI Co-pilot',
    description: 'We give you two distinct paths. You can generate entire highly-optimized email sequences from a single prompt, or craft your message using the Artisan side.',
    position: 'top',
    actionType: 'view'
  },
  {
    id: 'tour-ai-popup-use-template',
    title: 'Template Library',
    description: 'For now, let\'s manually choose a layout. Click "Use a Template" to see the library.',
    position: 'right',
    actionType: 'click'
  },
  {
    id: 'tour-template-course-launch',
    title: 'Proven Structures',
    description: 'Scroll down and click the "Course Launch" template to preview its layout. We have pre-built layouts configured for maximum conversion.',
    position: 'bottom',
    actionType: 'click'
  },
  {
    id: 'tour-template-preview-use',
    title: 'Preview & Use',
    description: 'Preview how the email looks on desktop and mobile. Click "Use Template" to generate it in the builder.',
    position: 'left',
    actionType: 'click'
  },
  {
    id: 'tour-campaign-subject', // To be added
    title: 'Subject Line & Optimization',
    description: 'Write your subject and preview text. Notice our AI deliverability gauge that helps you dodge spam filters.',
    position: 'bottom',
    actionType: 'view'
  },
  {
    id: 'tour-campaign-builder', // To be added
    title: 'The Visual Builder',
    description: 'Drag and drop blocks, edit styles, and inject personalized {{variables}} like their first name.',
    position: 'left',
    actionType: 'view'
  },
  {
    id: 'tour-campaign-preview', // To be added
    title: 'Test Before You Blast',
    description: 'Always click here to verify how your email renders on mobile vs desktop. Go ahead and click "Review & Send" when ready.',
    position: 'bottom',
    actionType: 'navigate'
  },
  {
    id: 'tour-campaign-review',
    title: 'Safe Sandbox Mode',
    description: 'We\'ve locked the audience to just YOUR email address so you can see it in action safely. Go ahead and click Send!',
    position: 'top',
    actionType: 'click'
  },
  {
    id: 'tour-campaign-success-view-analytics',
    title: 'Campaign Sent!',
    description: 'It\'s on the way! Now lets check out the post-send reporting. Click "View analytics".',
    position: 'bottom',
    actionType: 'navigate'
  },
  {
    id: 'tour-campaign-analytics-stats',
    title: 'Performance Tracking',
    description: 'Watch opens, clicks, and attributed revenue roll in. You can also monitor your bounce rate and A/B test results here.',
    position: 'bottom',
    actionType: 'view'
  },
  {
    id: 'tour-sidebar-nav-revenue',
    title: 'Revenue Tracking',
    description: 'Click here to see how your campaigns influence actual subscription payments and product sales.',
    position: 'right',
    actionType: 'navigate'
  },
  {
    id: 'tour-revenue-overview',
    title: 'You\'re Ready!',
    description: 'You\'ve completed the onboarding tour! From here, you can watch Revenue metrics from Whop flow in. Let\'s head back to the dashboard.',
    position: 'bottom',
    actionType: 'view'
  }
];

export function DashboardTourInitializer({ hasCompletedTour }: { hasCompletedTour: boolean }) {
  const { startTour, isActive } = useTour();
  const initialized = useRef(false);

  useEffect(() => {
    // Only start if they haven't completed it, it's not active already, and we haven't initialized it this mount
    if (!hasCompletedTour && !isActive && !initialized.current) {
        
        // Wait just a moment for the DOM to fully paint the layout
        setTimeout(() => {
            startTour(CORE_TOUR_STEPS);
            initialized.current = true;
        }, 1000);
    }
  }, [hasCompletedTour, isActive, startTour]);

  return null;
}
