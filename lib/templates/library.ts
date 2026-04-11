/**
 * lib/templates/library.ts
 *
 * Hardcoded system template library.
 * Templates are defined in code — no DB required.
 * They are read-only but cloneable as user templates.
 *
 * Categories:
 *   course_launch | announcement | promotion | scarcity |
 *   webinar | community | reengagement | upsell
 */

export type TemplateTone = 'professional' | 'casual' | 'urgent' | 'friendly' | 'authoritative' | 'empathetic';

export interface SystemTemplate {
  id: string;           // stable slug, never changes
  name: string;
  category: SystemTemplateCategory;
  subject: string;
  previewText: string;
  htmlBody: string;
  estimatedReadingSeconds: number;
  tags: string[];       // for recommendation engine
  isPro?: boolean;      // whether this template requires a paid plan
  tone?: TemplateTone;  // the tone of the template
}

export type SystemTemplateCategory =
  | 'course_launch'
  | 'announcement'
  | 'promotion'
  | 'scarcity'
  | 'webinar'
  | 'community'
  | 'reengagement'
  | 'upsell'
  | 'newsletter'
  | 'transactional'
  | 'feedback'
  | 'personal_branding';

export const CATEGORY_LABELS: Record<SystemTemplateCategory, string> = {
  course_launch: 'Course Launch',
  announcement:  'Product Announcement',
  promotion:     'Discount / Promotion',
  scarcity:      'Scarcity Reminder',
  webinar:       'Webinar Reminder',
  community:     'Community Engagement',
  reengagement:  'Re-engagement',
  upsell:        'Upsell',
  newsletter:    'Newsletter',
  transactional: 'Transactional',
  feedback:      'Feedback & Surveys',
  personal_branding: 'Personal Branding',
};

// ---------------------------------------------------------------------------
// Template definitions
// ---------------------------------------------------------------------------

export const SYSTEM_TEMPLATES: SystemTemplate[] = [
  {
    id: 'course-launch-main',
    name: 'Course Launch (AIDA Framework)',
    category: 'course_launch',
    subject: '🎓 {{product_name}} is officially live!',
    previewText: 'Everything you need to know about getting started',
    estimatedReadingSeconds: 60,
    tags: ['launch', 'course', 'aida'],
    tone: 'professional',
    htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px; color: #333333; line-height: 1.6; font-size: 16px;">
  <!-- Attention -->
  <h1 style="font-size: 28px; margin: 0 0 20px 0; line-height: 1.3; color: #111827;">It's finally here, {{first_name}}! 🎉</h1>
  <p style="margin: 0 0 16px 0; font-size: 18px; color: #4b5563;">The doors to {{product_name}} are officially open.</p>

  <p style="margin: 0 0 16px 0;">Hi {{first_name}},</p>
  <!-- Interest -->
  <p style="margin: 0 0 16px 0;">For the past {{time_in_making}}, we've been quietly building a system designed to help you achieve {{main_benefit}} without {{common_pain_point}}.</p>
  <p style="margin: 0 0 16px 0;">Today, I'm thrilled to announce that <strong>{{product_name}}</strong> is live and ready for you.</p>

  <!-- Desire -->
  <p style="margin: 0 0 16px 0;">Inside, you'll discover the exact frameworks we used to {{impressive_result}}.</p>
  <p style="margin: 0 0 16px 0;">Here's what you get instant access to:</p>
  <ul style="margin: 0 0 24px 0; padding-left: 20px;">
    <li style="margin-bottom: 8px;">📚 <strong>Step-by-step modules</strong> designed for real results</li>
    <li style="margin-bottom: 8px;">💬 <strong>Private community access</strong> to network with peers</li>
    <li style="margin-bottom: 8px;">🎯 <strong>Actionable templates</strong> you can plug in immediately</li>
  </ul>
  <p style="margin: 0 0 16px 0;">Imagine where you could be in just {{timeframe}} if you started implementing this today.</p>

  <!-- Action -->
  <div style="text-align: center; margin: 32px 0;">
    <a href="{{cta_url}}" style="background: #6366f1; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
      Join {{product_name}} Now &rarr;
    </a>
  </div>

  <p style="margin: 0 0 16px 0;">See you inside,<br><strong>{{sender_name}}</strong></p>

  <hr style="border: none; border-top: 1px solid #eaeaea; margin: 32px 0;">
  <p style="font-size: 12px; color: #888888; text-align: center; margin: 0;">
    You're receiving this because you're a member of {{community_name}}.<br>
    <a href="{{unsubscribe_url}}" style="color: #888888; text-decoration: underline;">Unsubscribe</a>
  </p>
</div>`,
  },
  {
    id: 'course-launch-casual',
    name: 'Course Launch (Casual Tone)',
    category: 'course_launch',
    subject: 'we are live! 🚀',
    previewText: 'come on in, the water is fine',
    estimatedReadingSeconds: 30,
    tags: ['launch', 'course', 'casual'],
    tone: 'casual',
    isPro: true,
    htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px; color: #333333; line-height: 1.6; font-size: 16px;">
  <h1 style="font-size: 24px; margin: 0 0 20px 0; line-height: 1.3; color: #111827;">we did it, {{first_name}}!</h1>

  <p style="margin: 0 0 16px 0;">Hey {{first_name}},</p>
  <p style="margin: 0 0 16px 0;">Just a super quick note to let you know that <strong>{{product_name}}</strong> is officially open.</p>

  <p style="margin: 0 0 16px 0;">I'm so pumped to finally share this with you. We've poured everything into making this the best {{product_type}} out there.</p>

  <p style="margin: 0 0 16px 0;">No long sales pitch today. You already know what this is and how it can help you {{main_benefit}}.</p>

  <div style="text-align: center; margin: 32px 0;">
    <a href="{{cta_url}}" style="background: #10b981; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
      Grab your spot here
    </a>
  </div>

  <p style="margin: 0 0 16px 0;">Hit reply if you have any questions at all.</p>
  <p style="margin: 0 0 16px 0;">Cheers,<br><strong>{{sender_name}}</strong></p>
  
  <hr style="border: none; border-top: 1px solid #eaeaea; margin: 32px 0;">
  <p style="font-size: 12px; color: #888888; text-align: center; margin: 0;">
    <a href="{{unsubscribe_url}}" style="color: #888888; text-decoration: underline;">Unsubscribe</a>
  </p>
</div>`,
  },
  {
    id: 'early-bird-discount',
    name: 'Early Bird Discount',
    category: 'promotion',
    subject: '⏰ Early bird pricing ends {{deadline}} — save {{discount}}%',
    previewText: 'Lock in the lowest price before it goes up',
    estimatedReadingSeconds: 35,
    tags: ['launch', 'discount', 'promotion'],
    htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px; color: #333333; line-height: 1.6; font-size: 16px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="font-size: 28px; margin: 0 0 8px 0; line-height: 1.3; color: #111827;">Don't miss early bird pricing, {{first_name}}</h1>
    <p style="font-size: 18px; color: #4b5563; margin: 0;">Save {{discount}}% &mdash; offer ends {{deadline}}</p>
  </div>

  <p style="margin: 0 0 16px 0;">Hey {{first_name}},</p>
  <p style="margin: 0 0 16px 0;">Just a quick reminder: our early bird pricing for <strong>{{product_name}}</strong> ends on <strong>{{deadline}}</strong>.</p>
  <p style="margin: 0 0 16px 0;">After that, the price goes up to {{regular_price}}.</p>

  <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 32px 0; border-radius: 4px; text-align: center;">
    <p style="margin: 0; font-weight: bold; color: #92400e;">🔥 Use code <span style="font-size: 20px; display: inline-block; background: #fde68a; padding: 2px 8px; border-radius: 4px; margin-left: 4px;">{{discount_code}}</span> at checkout</p>
  </div>

  <div style="text-align: center; margin: 32px 0;">
    <a href="{{cta_url}}" style="background: #f59e0b; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
      Claim Early Bird Price &rarr;
    </a>
  </div>

  <p style="margin: 0 0 16px 0;">Don't wait,<br><strong>{{sender_name}}</strong></p>

  <hr style="border: none; border-top: 1px solid #eaeaea; margin: 32px 0;">
  <p style="font-size: 12px; color: #888888; text-align: center; margin: 0;">
    <a href="{{unsubscribe_url}}" style="color: #888888; text-decoration: underline;">Unsubscribe</a>
  </p>
</div>`,
  },
  {
    id: 'scarcity-reminder',
    name: 'Scarcity (PAS Framework)',
    category: 'scarcity',
    subject: '🚨 Last chance — closes tonight at midnight',
    previewText: 'This is your final reminder',
    estimatedReadingSeconds: 45,
    tags: ['scarcity', 'urgency', 'close', 'pas'],
    tone: 'urgent',
    htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px; color: #333333; line-height: 1.6; font-size: 16px;">
  <h1 style="font-size: 28px; margin: 0 0 20px 0; line-height: 1.3; color: #dc2626;">This closes tonight, {{first_name}}</h1>

  <p style="margin: 0 0 16px 0;">Hey {{first_name}},</p>
  <!-- Problem -->
  <p style="margin: 0 0 16px 0;">If you're still struggling with {{pain_point}}, you're not alone. Most people get stuck trying to figure out {{difficult_task}} on their own.</p>

  <!-- Agitation -->
  <p style="margin: 0 0 16px 0;">But every day you wait is another day of {{negative_consequence}}. The frustration builds, the opportunities pass by, and you're left wondering why it has to be so hard.</p>
  <p style="margin: 0 0 16px 0;">It doesn't have to be.</p>

  <!-- Solution -->
  <p style="margin: 0 0 16px 0;"><strong>{{product_name}}</strong> is the exact roadmap you need to bypass the trial and error.</p>
  <p style="margin: 0 0 16px 0;">But you have to act now. The cart closes <strong>tonight at midnight</strong> and won't reopen anytime soon.</p>

  <p style="margin: 0 0 16px 0;">Here's what you'll miss out on if you don't join:</p>
  <ul style="margin: 0 0 24px 0; padding-left: 20px;">
    <li style="margin-bottom: 8px;">❌ {{benefit_1}}</li>
    <li style="margin-bottom: 8px;">❌ {{benefit_2}}</li>
    <li style="margin-bottom: 8px;">❌ {{benefit_3}}</li>
  </ul>

  <div style="text-align: center; margin: 32px 0;">
    <a href="{{cta_url}}" style="background: #dc2626; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
      Get the Solution Before Midnight &rarr;
    </a>
  </div>

  <p style="margin: 0 0 16px 0;">Last chance,<br><strong>{{sender_name}}</strong></p>

  <hr style="border: none; border-top: 1px solid #eaeaea; margin: 32px 0;">
  <p style="font-size: 12px; color: #888888; text-align: center; margin: 0;">
    <a href="{{unsubscribe_url}}" style="color: #888888; text-decoration: underline;">Unsubscribe</a>
  </p>
</div>`,
  },
  {
    id: 'scarcity-reminder-friendly',
    name: 'Scarcity (Friendly Tone)',
    category: 'scarcity',
    subject: 'Just a quick heads up before we close',
    previewText: 'I didn\'t want you to miss out on this',
    estimatedReadingSeconds: 30,
    tags: ['scarcity', 'friendly', 'close'],
    tone: 'friendly',
    isPro: true,
    htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px; color: #333333; line-height: 1.6; font-size: 16px;">
  <h1 style="font-size: 24px; margin: 0 0 20px 0; line-height: 1.3; color: #111827;">Just a quick heads up, {{first_name}}</h1>

  <p style="margin: 0 0 16px 0;">Hi {{first_name}},</p>
  <p style="margin: 0 0 16px 0;">I'm sending this because I know how easy it is to let these things slip by, and I didn't want you to miss out.</p>

  <p style="margin: 0 0 16px 0;">We're closing enrollment for <strong>{{product_name}}</strong> tonight.</p>

  <p style="margin: 0 0 16px 0;">If it's not the right time, no worries at all! But if you've been meaning to join and just haven't gotten around to it, now is the time.</p>

  <div style="text-align: center; margin: 32px 0;">
    <a href="{{cta_url}}" style="background: #3b82f6; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
      Join us before we close &rarr;
    </a>
  </div>

  <p style="margin: 0 0 16px 0;">Hope to see you inside!</p>
  <p style="margin: 0 0 16px 0;">Warmly,<br><strong>{{sender_name}}</strong></p>
  
  <hr style="border: none; border-top: 1px solid #eaeaea; margin: 32px 0;">
  <p style="font-size: 12px; color: #888888; text-align: center; margin: 0;">
    <a href="{{unsubscribe_url}}" style="color: #888888; text-decoration: underline;">Unsubscribe</a>
  </p>
</div>`,
  },
  {
    id: 'product-announcement',
    name: 'New Product Announcement',
    category: 'announcement',
    subject: '🚀 Introducing {{product_name}}',
    previewText: 'Something new is here',
    estimatedReadingSeconds: 40,
    tags: ['announcement', 'launch', 'new'],
    htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px; color: #333333; line-height: 1.6; font-size: 16px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="font-size: 28px; margin: 0 0 8px 0; line-height: 1.3; color: #111827;">Big news, {{first_name}} 🚀</h1>
    <p style="font-size: 18px; color: #4b5563; margin: 0;">We've been working on something special</p>
  </div>

  <p style="margin: 0 0 16px 0;">Hi {{first_name}},</p>
  <p style="margin: 0 0 16px 0;">I'm incredibly excited to announce <strong>{{product_name}}</strong> &mdash; and I wanted you to be among the first to know.</p>

  <p style="margin: 0 0 16px 0;">{{product_description}}</p>

  <p style="margin: 0 0 16px 0;">Here's what makes it different:</p>
  <ul style="margin: 0 0 24px 0; padding-left: 20px;">
    <li style="margin-bottom: 8px;">✅ {{differentiator_1}}</li>
    <li style="margin-bottom: 8px;">✅ {{differentiator_2}}</li>
    <li style="margin-bottom: 8px;">✅ {{differentiator_3}}</li>
  </ul>

  <div style="text-align: center; margin: 32px 0;">
    <a href="{{cta_url}}" style="background: #6366f1; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
      Learn More &rarr;
    </a>
  </div>

  <p style="margin: 0 0 16px 0;">More details coming soon,<br><strong>{{sender_name}}</strong></p>

  <hr style="border: none; border-top: 1px solid #eaeaea; margin: 32px 0;">
  <p style="font-size: 12px; color: #888888; text-align: center; margin: 0;">
    <a href="{{unsubscribe_url}}" style="color: #888888; text-decoration: underline;">Unsubscribe</a>
  </p>
</div>`,
  },
  {
    id: 'webinar-reminder',
    name: 'Webinar / Event Reminder',
    category: 'webinar',
    subject: '📅 Reminder: {{event_name}} starts in {{time_until}}',
    previewText: "Don't forget — you're registered!",
    estimatedReadingSeconds: 30,
    tags: ['webinar', 'event', 'reminder'],
    htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px; color: #333333; line-height: 1.6; font-size: 16px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="font-size: 28px; margin: 0 0 8px 0; line-height: 1.3; color: #111827;">See you soon, {{first_name}}! 👋</h1>
    <p style="font-size: 18px; color: #4b5563; margin: 0;">{{event_name}} starts in {{time_until}}</p>
  </div>

  <p style="margin: 0 0 16px 0;">Hi {{first_name}},</p>
  <p style="margin: 0 0 16px 0;">Just a reminder that <strong>{{event_name}}</strong> is happening <strong>{{event_date}}</strong> at <strong>{{event_time}}</strong>.</p>

  <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 20px; margin: 32px 0; border-radius: 4px;">
    <p style="margin: 0 0 8px 0;"><strong>📍 Where:</strong> {{event_location}}</p>
    <p style="margin: 0;"><strong>🕐 When:</strong> {{event_date}} at {{event_time}}</p>
  </div>

  <div style="text-align: center; margin: 32px 0;">
    <a href="{{cta_url}}" style="background: #22c55e; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
      Join the Event &rarr;
    </a>
  </div>

  <p style="margin: 0 0 16px 0;">See you there,<br><strong>{{sender_name}}</strong></p>

  <hr style="border: none; border-top: 1px solid #eaeaea; margin: 32px 0;">
  <p style="font-size: 12px; color: #888888; text-align: center; margin: 0;">
    <a href="{{unsubscribe_url}}" style="color: #888888; text-decoration: underline;">Unsubscribe</a>
  </p>
</div>`,
  },
  {
    id: 'community-engagement',
    name: 'Community Engagement',
    category: 'community',
    subject: '💬 What\'s happening in {{community_name}} this week',
    previewText: 'New discussions, wins, and resources',
    estimatedReadingSeconds: 50,
    tags: ['community', 'engagement', 'newsletter'],
    htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px; color: #333333; line-height: 1.6; font-size: 16px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="font-size: 28px; margin: 0 0 8px 0; line-height: 1.3; color: #111827;">This week in {{community_name}} 👀</h1>
  </div>

  <p style="margin: 0 0 16px 0;">Hey {{first_name}},</p>
  <p style="margin: 0 0 16px 0;">Here's a quick roundup of what's been happening in the community this week.</p>

  <h2 style="font-size: 20px; margin: 32px 0 16px 0; line-height: 1.3; color: #111827;">🔥 Top Discussions</h2>
  <p style="margin: 0 0 16px 0;">{{top_discussion_1}}</p>

  <h2 style="font-size: 20px; margin: 32px 0 16px 0; line-height: 1.3; color: #111827;">🏆 Member Wins</h2>
  <p style="margin: 0 0 16px 0;">{{member_win}}</p>

  <h2 style="font-size: 20px; margin: 32px 0 16px 0; line-height: 1.3; color: #111827;">📚 Resources This Week</h2>
  <p style="margin: 0 0 16px 0;">{{resource_description}}</p>

  <div style="text-align: center; margin: 32px 0;">
    <a href="{{cta_url}}" style="background: #8b5cf6; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
      Join the Conversation &rarr;
    </a>
  </div>

  <p style="margin: 0 0 16px 0;">See you in there,<br><strong>{{sender_name}}</strong></p>

  <hr style="border: none; border-top: 1px solid #eaeaea; margin: 32px 0;">
  <p style="font-size: 12px; color: #888888; text-align: center; margin: 0;">
    <a href="{{unsubscribe_url}}" style="color: #888888; text-decoration: underline;">Unsubscribe</a>
  </p>
</div>`,
  },
  {
    id: 'reengagement',
    name: 'Re-engagement Email',
    category: 'reengagement',
    subject: '{{first_name}}, we miss you 👋',
    previewText: "It's been a while — here's what you've missed",
    estimatedReadingSeconds: 35,
    tags: ['reengagement', 'winback', 'inactive'],
    htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px; color: #333333; line-height: 1.6; font-size: 16px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="font-size: 28px; margin: 0 0 8px 0; line-height: 1.3; color: #111827;">We miss you, {{first_name}} 💙</h1>
  </div>

  <p style="margin: 0 0 16px 0;">Hi {{first_name}},</p>
  <p style="margin: 0 0 16px 0;">It's been a while since we've heard from you in {{community_name}}, and we wanted to check in.</p>

  <p style="margin: 0 0 16px 0;">Since you've been away, here's what's new:</p>
  <ul style="margin: 0 0 24px 0; padding-left: 20px;">
    <li style="margin-bottom: 8px;">✨ {{update_1}}</li>
    <li style="margin-bottom: 8px;">✨ {{update_2}}</li>
    <li style="margin-bottom: 8px;">✨ {{update_3}}</li>
  </ul>

  <p style="margin: 0 0 16px 0;">We'd love to have you back. Click below to see what you've missed.</p>

  <div style="text-align: center; margin: 32px 0;">
    <a href="{{cta_url}}" style="background: #6366f1; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
      See What's New &rarr;
    </a>
  </div>

  <p style="margin: 0 0 16px 0;">Hope to see you soon,<br><strong>{{sender_name}}</strong></p>

  <hr style="border: none; border-top: 1px solid #eaeaea; margin: 32px 0;">
  <p style="font-size: 12px; color: #888888; text-align: center; margin: 0;">
    <a href="{{unsubscribe_url}}" style="color: #888888; text-decoration: underline;">Unsubscribe</a>
  </p>
</div>`,
  },
  {
    id: 'upsell-email',
    name: 'Upsell / Next Step Offer',
    category: 'upsell',
    subject: '{{first_name}}, ready for the next level?',
    previewText: 'You asked, we listened',
    estimatedReadingSeconds: 40,
    tags: ['upsell', 'upgrade', 'offer'],
    htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px; color: #333333; line-height: 1.6; font-size: 16px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="font-size: 28px; margin: 0 0 8px 0; line-height: 1.3; color: #111827;">You're ready for the next level 🚀</h1>
  </div>

  <p style="margin: 0 0 16px 0;">Hi {{first_name}},</p>
  <p style="margin: 0 0 16px 0;">Based on your progress in {{community_name}}, I think you're ready for <strong>{{product_name}}</strong>.</p>

  <p style="margin: 0 0 16px 0;">It's designed specifically for people like you who have already achieved {{previous_achievement}} and are ready to go further.</p>

  <p style="margin: 0 0 16px 0;">What you'll get:</p>
  <ul style="margin: 0 0 24px 0; padding-left: 20px;">
    <li style="margin-bottom: 8px;">⚡ {{benefit_1}}</li>
    <li style="margin-bottom: 8px;">⚡ {{benefit_2}}</li>
    <li style="margin-bottom: 8px;">⚡ {{benefit_3}}</li>
  </ul>

  <div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 20px; margin: 32px 0; border-radius: 4px; text-align: center;">
    <p style="margin: 0;"><strong>Special offer for existing members:</strong><br>{{special_offer}}</p>
  </div>

  <div style="text-align: center; margin: 32px 0;">
    <a href="{{cta_url}}" style="background: #0ea5e9; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
      Upgrade Now &rarr;
    </a>
  </div>

  <p style="margin: 0 0 16px 0;">To your next level,<br><strong>{{sender_name}}</strong></p>

  <hr style="border: none; border-top: 1px solid #eaeaea; margin: 32px 0;">
  <p style="font-size: 12px; color: #888888; text-align: center; margin: 0;">
    <a href="{{unsubscribe_url}}" style="color: #888888; text-decoration: underline;">Unsubscribe</a>
  </p>
</div>`,
  },
  {
    id: 'newsletter-curator',
    name: 'The Curator (Link-Heavy)',
    category: 'newsletter',
    subject: 'Top 5 resources for {{topic}} this week',
    previewText: 'Hand-picked links to save you hours of research',
    estimatedReadingSeconds: 60,
    tags: ['newsletter', 'curation', 'weekly'],
    isPro: true,
    htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px; color: #333333; line-height: 1.6; font-size: 16px;">
  <div style="text-align: center; padding-bottom: 24px; border-bottom: 1px solid #eaeaea; margin-bottom: 32px;">
    <img src="{{company_logo}}" alt="{{company_name}}" style="max-height: 48px; max-width: 200px;" />
  </div>
  
  <h1 style="font-size: 28px; margin: 0 0 20px 0; line-height: 1.3; color: #111827;">The Weekly Curator</h1>
  <p style="margin: 0 0 32px 0; font-size: 18px; color: #4b5563;">Hey {{first_name}}, here are the top resources I found this week to help you master {{topic}}.</p>

  <div style="margin-bottom: 32px;">
    <h2 style="font-size: 20px; margin: 0 0 8px 0; line-height: 1.3; color: #111827;">1. {{link_1_title}}</h2>
    <p style="margin: 0 0 12px 0; color: #4b5563;">{{link_1_description}}</p>
    <a href="{{link_1_url}}" style="color: #2563eb; font-weight: bold; text-decoration: none;">Read the full article &rarr;</a>
  </div>

  <div style="margin-bottom: 32px;">
    <h2 style="font-size: 20px; margin: 0 0 8px 0; line-height: 1.3; color: #111827;">2. {{link_2_title}}</h2>
    <p style="margin: 0 0 12px 0; color: #4b5563;">{{link_2_description}}</p>
    <a href="{{link_2_url}}" style="color: #2563eb; font-weight: bold; text-decoration: none;">Watch the video &rarr;</a>
  </div>

  <div style="margin-bottom: 40px;">
    <h2 style="font-size: 20px; margin: 0 0 8px 0; line-height: 1.3; color: #111827;">3. {{link_3_title}}</h2>
    <p style="margin: 0 0 12px 0; color: #4b5563;">{{link_3_description}}</p>
    <a href="{{link_3_url}}" style="color: #2563eb; font-weight: bold; text-decoration: none;">Get the tool &rarr;</a>
  </div>

  <div style="background-color: #f8fafc; padding: 24px; border-radius: 8px; margin-bottom: 40px; border: 1px solid #e2e8f0;">
    <h3 style="font-size: 16px; margin: 0 0 8px 0; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Sponsor: {{sponsor_name}}</h3>
    <p style="margin: 0 0 16px 0; color: #334155;">{{sponsor_description}}</p>
    <a href="{{sponsor_url}}" style="background: #0f172a; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Check them out</a>
  </div>

  <p style="margin: 0 0 16px 0;">Until next week,<br><strong>{{sender_name}}</strong></p>

  <hr style="border: none; border-top: 1px solid #eaeaea; margin: 40px 0 24px 0;">
  <div style="text-align: center;">
    <div style="margin-bottom: 16px;">
      <a href="{{social_twitter}}" style="margin: 0 8px; color: #6b7280; text-decoration: none;">Twitter</a>
      <a href="{{social_linkedin}}" style="margin: 0 8px; color: #6b7280; text-decoration: none;">LinkedIn</a>
      <a href="{{social_youtube}}" style="margin: 0 8px; color: #6b7280; text-decoration: none;">YouTube</a>
    </div>
    <p style="font-size: 12px; color: #888888; margin: 0;">
      &copy; {{current_year}} {{company_name}}. All rights reserved.<br>
      <a href="{{unsubscribe_url}}" style="color: #888888; text-decoration: underline;">Unsubscribe</a>
    </p>
  </div>
</div>`,
  },
  {
    id: 'newsletter-essay',
    name: 'The Essay (Text-Heavy)',
    category: 'newsletter',
    subject: 'Why I changed my mind about {{topic}}',
    previewText: 'A deep dive into my recent shift in perspective',
    estimatedReadingSeconds: 180,
    tags: ['newsletter', 'storytelling', 'essay'],
    htmlBody: `<div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 32px 20px; color: #333333; line-height: 1.8; font-size: 17px;">
  <h1 style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 28px; font-weight: 700; color: #111827; margin: 0 0 32px 0; line-height: 1.3;">Why I changed my mind about {{topic}}</h1>
  
  <p style="margin: 0 0 20px 0;">Hi {{first_name}},</p>
  
  <p style="margin: 0 0 20px 0;">For the longest time, I believed that {{old_belief}}. It was the conventional wisdom, and it seemed to work for everyone else.</p>
  
  <p style="margin: 0 0 20px 0;">But recently, I had an experience that completely shattered that assumption.</p>
  
  <h2 style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 22px; font-weight: 600; color: #111827; margin: 40px 0 16px 0;">The Turning Point</h2>
  
  <p style="margin: 0 0 20px 0;">{{story_paragraph_1}}</p>
  
  <p style="margin: 0 0 20px 0;">{{story_paragraph_2}}</p>
  
  <blockquote style="border-left: 4px solid #d1d5db; padding-left: 20px; margin: 0 0 20px 0; font-style: italic; color: #4b5563;">
    "{{key_quote}}"
  </blockquote>
  
  <h2 style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 22px; font-weight: 600; color: #111827; margin: 40px 0 16px 0;">What This Means For You</h2>
  
  <p style="margin: 0 0 20px 0;">If you're currently struggling with {{pain_point}}, I want you to try a different approach this week.</p>
  
  <ol style="padding-left: 20px; margin: 0 0 32px 0;">
    <li style="margin-bottom: 12px;"><strong>Step 1:</strong> {{actionable_step_1}}</li>
    <li style="margin-bottom: 12px;"><strong>Step 2:</strong> {{actionable_step_2}}</li>
    <li style="margin-bottom: 12px;"><strong>Step 3:</strong> {{actionable_step_3}}</li>
  </ol>
  
  <p style="margin: 0 0 20px 0;">Hit reply and let me know how it goes. I read every single email.</p>
  
  <p style="margin: 0 0 20px 0;">Best,<br><strong>{{sender_name}}</strong></p>

  <hr style="border: none; border-top: 1px solid #eaeaea; margin: 40px 0 24px 0;">
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; text-align: center;">
    <p style="font-size: 12px; color: #888888; margin: 0;">
      You're receiving this because you subscribed at {{company_name}}.<br>
      <a href="{{unsubscribe_url}}" style="color: #888888; text-decoration: underline;">Unsubscribe</a>
    </p>
  </div>
</div>`,
  },
  {
    id: 'transactional-order-confirmed',
    name: 'Order Confirmed',
    category: 'transactional',
    subject: 'Receipt for your purchase of {{last_purchase_item}}',
    previewText: 'Thank you for your order! Here are your details.',
    estimatedReadingSeconds: 20,
    tags: ['transactional', 'receipt', 'purchase'],
    isPro: true,
    htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333333; line-height: 1.6; font-size: 16px;">
  <div style="background-color: #f8fafc; padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0;">
    <img src="{{company_logo}}" alt="{{company_name}}" style="max-height: 48px; margin-bottom: 24px;" />
    <h1 style="font-size: 28px; font-weight: 700; margin: 0 0 8px 0; color: #0f172a; line-height: 1.3;">Order Confirmed</h1>
    <p style="font-size: 18px; color: #64748b; margin: 0;">Thanks for your purchase, {{first_name}}!</p>
  </div>
  
  <div style="padding: 40px 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="margin: 0 0 24px 0;">Your order <strong>#{{order_number}}</strong> has been processed successfully. You can access your purchase immediately using the link below.</p>
    
    <div style="text-align: center; margin-bottom: 40px;">
      <a href="{{access_url}}" style="background-color: #0f172a; color: #ffffff; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block; width: 100%; box-sizing: border-box;">Access Your Purchase &rarr;</a>
    </div>
    
    <h2 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin: 0 0 16px 0;">Order Summary</h2>
    
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px;">
      <tr>
        <td style="padding: 12px 0; color: #334155;">{{last_purchase_item}}</td>
        <td style="padding: 12px 0; color: #0f172a; text-align: right; font-weight: 500;">{{purchase_amount}}</td>
      </tr>
      <tr>
        <td style="padding: 16px 0 0 0; color: #64748b; border-top: 1px solid #e2e8f0;">Total Paid</td>
        <td style="padding: 16px 0 0 0; font-size: 18px; color: #0f172a; text-align: right; font-weight: 700; border-top: 1px solid #e2e8f0;">{{purchase_amount}}</td>
      </tr>
    </table>
    
    <p style="font-size: 14px; color: #64748b; margin: 0; text-align: center;">If you have any questions about your order, simply reply to this email.</p>
  </div>
  
  <div style="text-align: center; margin-top: 32px;">
    <p style="font-size: 12px; color: #94a3b8; margin: 0;">
      &copy; {{current_year}} {{company_name}}.<br>
      <a href="{{support_url}}" style="color: #94a3b8; text-decoration: underline;">Contact Support</a>
    </p>
  </div>
</div>`,
  },
  {
    id: 'transactional-password-reset',
    name: 'Password Reset',
    category: 'transactional',
    subject: 'Reset your password for {{company_name}}',
    previewText: 'A request was made to reset your password.',
    estimatedReadingSeconds: 15,
    tags: ['transactional', 'security', 'account'],
    htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; color: #333333; line-height: 1.6; border: 1px solid #eaeaea; border-radius: 12px; padding: 40px 32px; font-size: 16px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <img src="{{company_logo}}" alt="{{company_name}}" style="max-height: 40px;" />
  </div>
  
  <h1 style="font-size: 24px; font-weight: 700; text-align: center; margin: 0 0 16px 0; color: #111827; line-height: 1.3;">Reset Your Password</h1>
  
  <p style="color: #4b5563; text-align: center; margin: 0 0 32px 0;">We received a request to reset the password for the account associated with this email address.</p>
  
  <div style="text-align: center; margin-bottom: 40px;">
    <a href="{{reset_url}}" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block; width: 100%; box-sizing: border-box;">Reset Password &rarr;</a>
  </div>
  
  <p style="font-size: 14px; color: #6b7280; text-align: center; margin: 0;">If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>
</div>`,
  },
  {
    id: 'transactional-subscription-cancelled',
    name: 'Subscription Cancelled (Win-back)',
    category: 'transactional',
    subject: 'Your subscription has been cancelled',
    previewText: 'We\'re sorry to see you go. Here\'s what happens next.',
    estimatedReadingSeconds: 30,
    tags: ['transactional', 'churn', 'retention'],
    isPro: true,
    htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px; color: #333333; line-height: 1.6; font-size: 16px;">
  <h1 style="font-size: 28px; font-weight: 700; margin: 0 0 20px 0; color: #111827; line-height: 1.3;">We're sorry to see you go, {{first_name}}</h1>
  
  <p style="margin: 0 0 16px 0;">This email confirms that your subscription to <strong>{{product_name}}</strong> has been cancelled.</p>
  
  <p style="margin: 0 0 16px 0;">You will continue to have access until the end of your current billing period on <strong>{{end_date}}</strong>. After that, your account will be downgraded.</p>
  
  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin: 32px 0; text-align: center;">
    <h2 style="font-size: 20px; font-weight: 600; margin: 0 0 12px 0; color: #0f172a;">Made a mistake?</h2>
    <p style="color: #4b5563; margin: 0 0 20px 0;">If you cancelled by accident or changed your mind, you can easily reactivate your subscription and keep your current pricing.</p>
    <a href="{{reactivate_url}}" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Reactivate Subscription &rarr;</a>
  </div>
  
  <p style="margin: 0 0 16px 0;">We're always looking to improve. If you have 30 seconds, we'd love to know why you decided to cancel so we can make {{company_name}} better.</p>
  
  <p style="margin: 0 0 32px 0; font-weight: bold;"><a href="{{feedback_url}}" style="color: #2563eb; text-decoration: none;">Share your feedback &rarr;</a></p>
  
  <p style="margin: 0;">Thank you for giving us a try,<br><strong>The {{company_name}} Team</strong></p>
</div>`,
  },
  {
    id: 'feedback-nps',
    name: 'NPS Survey',
    category: 'feedback',
    subject: 'How are we doing, {{first_name}}?',
    previewText: 'We\'d love your quick feedback on your experience.',
    estimatedReadingSeconds: 20,
    tags: ['feedback', 'survey', 'nps'],
    isPro: true,
    htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px; color: #333333; line-height: 1.6; text-align: center; font-size: 16px;">
  <img src="{{company_logo}}" alt="{{company_name}}" style="max-height: 48px; margin-bottom: 32px;" />
  
  <h1 style="font-size: 28px; font-weight: 700; margin: 0 0 16px 0; color: #111827; line-height: 1.3;">How likely are you to recommend {{product_name}} to a friend or colleague?</h1>
  
  <p style="color: #4b5563; margin: 0 0 40px 0;">Your feedback helps us improve and build a better product for you. It only takes one click.</p>
  
  <div style="display: flex; justify-content: space-between; max-width: 500px; margin: 0 auto 12px auto; gap: 4px;">
    <a href="{{nps_url}}?score=0" style="flex: 1; background-color: #f3f4f6; color: #374151; padding: 12px 0; border-radius: 4px; text-decoration: none; font-weight: bold; font-size: 14px;">0</a>
    <a href="{{nps_url}}?score=1" style="flex: 1; background-color: #f3f4f6; color: #374151; padding: 12px 0; border-radius: 4px; text-decoration: none; font-weight: bold; font-size: 14px;">1</a>
    <a href="{{nps_url}}?score=2" style="flex: 1; background-color: #f3f4f6; color: #374151; padding: 12px 0; border-radius: 4px; text-decoration: none; font-weight: bold; font-size: 14px;">2</a>
    <a href="{{nps_url}}?score=3" style="flex: 1; background-color: #f3f4f6; color: #374151; padding: 12px 0; border-radius: 4px; text-decoration: none; font-weight: bold; font-size: 14px;">3</a>
    <a href="{{nps_url}}?score=4" style="flex: 1; background-color: #f3f4f6; color: #374151; padding: 12px 0; border-radius: 4px; text-decoration: none; font-weight: bold; font-size: 14px;">4</a>
    <a href="{{nps_url}}?score=5" style="flex: 1; background-color: #f3f4f6; color: #374151; padding: 12px 0; border-radius: 4px; text-decoration: none; font-weight: bold; font-size: 14px;">5</a>
    <a href="{{nps_url}}?score=6" style="flex: 1; background-color: #f3f4f6; color: #374151; padding: 12px 0; border-radius: 4px; text-decoration: none; font-weight: bold; font-size: 14px;">6</a>
    <a href="{{nps_url}}?score=7" style="flex: 1; background-color: #f3f4f6; color: #374151; padding: 12px 0; border-radius: 4px; text-decoration: none; font-weight: bold; font-size: 14px;">7</a>
    <a href="{{nps_url}}?score=8" style="flex: 1; background-color: #f3f4f6; color: #374151; padding: 12px 0; border-radius: 4px; text-decoration: none; font-weight: bold; font-size: 14px;">8</a>
    <a href="{{nps_url}}?score=9" style="flex: 1; background-color: #f3f4f6; color: #374151; padding: 12px 0; border-radius: 4px; text-decoration: none; font-weight: bold; font-size: 14px;">9</a>
    <a href="{{nps_url}}?score=10" style="flex: 1; background-color: #f3f4f6; color: #374151; padding: 12px 0; border-radius: 4px; text-decoration: none; font-weight: bold; font-size: 14px;">10</a>
  </div>
  
  <div style="display: flex; justify-content: space-between; max-width: 500px; margin: 0 auto 40px auto; font-size: 12px; color: #6b7280;">
    <span>Not likely at all</span>
    <span>Extremely likely</span>
  </div>
  
  <p style="font-size: 14px; color: #9ca3af; margin: 0;">Thank you for your time,<br>{{company_name}} Team</p>
</div>`,
  },
  {
    id: 'feedback-product',
    name: 'Product Feedback Request',
    category: 'feedback',
    subject: 'Quick question about {{product_name}}',
    previewText: 'I\'d love to hear your thoughts on your recent purchase.',
    estimatedReadingSeconds: 25,
    tags: ['feedback', 'review', 'testimonial'],
    htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px; color: #333333; line-height: 1.6; font-size: 16px;">
  <p style="margin: 0 0 20px 0;">Hi {{first_name}},</p>
  
  <p style="margin: 0 0 20px 0;">You've had access to <strong>{{product_name}}</strong> for a little while now, and I wanted to personally reach out and see how it's going.</p>
  
  <p style="margin: 0 0 20px 0;">My goal is to make this the absolute best resource available, and the only way I can do that is by hearing directly from people using it.</p>
  
  <p style="margin: 0 0 24px 0;">Would you mind taking 2 minutes to answer three quick questions?</p>
  
  <div style="margin: 0 0 32px 0;">
    <a href="{{feedback_form_url}}" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Share Your Feedback &rarr;</a>
  </div>
  
  <p style="margin: 0 0 20px 0;">As a thank you for your time, I'll send you a special bonus resource at the end of the survey.</p>
  
  <p style="margin: 0;">Thanks in advance,<br><strong>{{sender_name}}</strong></p>
</div>`,
  },
  {
    id: 'personal-founder-plain',
    name: 'Plain Text Founder Email',
    category: 'personal_branding',
    subject: 'A quick thought on {{topic}}',
    previewText: 'Something I\'ve been thinking about lately...',
    estimatedReadingSeconds: 45,
    tags: ['personal', 'founder', 'plain-text'],
    htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px; color: #000000; line-height: 1.5; font-size: 15px;">
  <p style="margin: 0 0 20px 0;">Hey {{first_name}},</p>
  
  <p style="margin: 0 0 20px 0;">I was talking with a customer yesterday about {{topic}}, and it made me realize something important.</p>
  
  <p style="margin: 0 0 20px 0;">Most people think that to succeed at {{goal}}, you need to {{common_myth}}.</p>
  
  <p style="margin: 0 0 20px 0;">But after doing this for {{years_experience}} years, I've found the exact opposite is true.</p>
  
  <p style="margin: 0 0 20px 0;">The real secret is {{core_insight}}.</p>
  
  <p style="margin: 0 0 20px 0;">When you focus on that instead, everything else becomes easier. You stop wasting time on {{distraction}}, and start seeing actual results.</p>
  
  <p style="margin: 0 0 20px 0;">I put together a short video explaining exactly how to implement this approach. It's free, no opt-in required.</p>
  
  <p style="margin: 0 0 20px 0;"><a href="{{video_url}}" style="color: #2563eb; text-decoration: underline;">Watch the video here.</a></p>
  
  <p style="margin: 0 0 20px 0;">Let me know what you think.</p>
  
  <p style="margin: 0;">- {{sender_name}}</p>
  
  <p style="font-size: 12px; color: #666666; margin: 40px 0 0 0;">
    Sent by {{company_name}}<br>
    <a href="{{unsubscribe_url}}" style="color: #666666;">Unsubscribe</a>
  </p>
</div>`,
  },
  {
    id: 'personal-behind-scenes',
    name: 'Behind the Scenes',
    category: 'personal_branding',
    subject: 'What I\'m working on right now',
    previewText: 'A sneak peek at what\'s coming next',
    estimatedReadingSeconds: 60,
    tags: ['personal', 'update', 'behind-the-scenes'],
    isPro: true,
    htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px; color: #333333; line-height: 1.6; font-size: 16px;">
  <h1 style="font-size: 28px; font-weight: 700; margin: 0 0 24px 0; color: #111827; line-height: 1.3;">Behind the scenes at {{company_name}} 🕵️‍♂️</h1>
  
  <p style="margin: 0 0 20px 0;">Hi {{first_name}},</p>
  
  <p style="margin: 0 0 20px 0;">I like to keep things transparent with this community, so today I want to share exactly what we're working on behind the scenes.</p>
  
  <h2 style="font-size: 20px; font-weight: 600; margin: 32px 0 12px 0; color: #111827;">1. The big project: {{project_name}}</h2>
  <p style="margin: 0 0 16px 0;">For the last {{time_frame}}, we've been heads down building {{project_name}}. The goal is simple: {{project_goal}}.</p>
  <p style="margin: 0 0 20px 0;">We hit a major roadblock last week when {{challenge}}, but we figured out a workaround by {{solution}}.</p>
  
  <h2 style="font-size: 20px; font-weight: 600; margin: 32px 0 12px 0; color: #111827;">2. What I'm reading</h2>
  <p style="margin: 0 0 20px 0;">I just finished <em>{{book_title}}</em> by {{book_author}}. If you're interested in {{book_topic}}, it's a must-read. The biggest takeaway for me was {{book_takeaway}}.</p>
  
  <h2 style="font-size: 20px; font-weight: 600; margin: 32px 0 12px 0; color: #111827;">3. A question for you</h2>
  <p style="margin: 0 0 16px 0;">As we finalize the roadmap for next quarter, I want to make sure we're building what you actually need.</p>
  <p style="margin: 0 0 20px 0;"><strong>What is the #1 biggest challenge you're facing with {{industry_topic}} right now?</strong></p>
  
  <p style="margin: 0 0 20px 0;">Hit reply and let me know. I reply to every email.</p>
  
  <p style="margin: 0;">Talk soon,<br><strong>{{sender_name}}</strong></p>
  
  <hr style="border: none; border-top: 1px solid #eaeaea; margin: 40px 0 24px 0;">
  <div style="text-align: center;">
    <p style="font-size: 12px; color: #9ca3af; margin: 0;">
      <a href="{{unsubscribe_url}}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a>
    </p>
  </div>
</div>`,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getTemplateById(id: string): SystemTemplate | undefined {
  return SYSTEM_TEMPLATES.find((t) => t.id === id);
}

export function getTemplatesByCategory(category: SystemTemplateCategory): SystemTemplate[] {
  return SYSTEM_TEMPLATES.filter((t) => t.category === category);
}

export function getAllCategories(): SystemTemplateCategory[] {
  return [...new Set(SYSTEM_TEMPLATES.map((t) => t.category))];
}

/**
 * Recommend templates based on keywords in a campaign name or context.
 * Rule-based — no ML required.
 */
export function recommendTemplates(context: string, limit = 3): SystemTemplate[] {
  const lower = context.toLowerCase();
  const scored = SYSTEM_TEMPLATES.map((t) => {
    const score = t.tags.filter((tag) => lower.includes(tag)).length;
    return { template: t, score };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.template);
}

export function estimateReadingTime(html: string): number {
  const text = html.replace(/<[^>]+>/g, ' ');
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(15, Math.round((words / 200) * 60)); // 200wpm average
}
