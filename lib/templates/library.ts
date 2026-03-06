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

export interface SystemTemplate {
  id: string;           // stable slug, never changes
  name: string;
  category: SystemTemplateCategory;
  subject: string;
  previewText: string;
  htmlBody: string;
  estimatedReadingSeconds: number;
  tags: string[];       // for recommendation engine
}

export type SystemTemplateCategory =
  | 'course_launch'
  | 'announcement'
  | 'promotion'
  | 'scarcity'
  | 'webinar'
  | 'community'
  | 'reengagement'
  | 'upsell';

export const CATEGORY_LABELS: Record<SystemTemplateCategory, string> = {
  course_launch: 'Course Launch',
  announcement:  'Product Announcement',
  promotion:     'Discount / Promotion',
  scarcity:      'Scarcity Reminder',
  webinar:       'Webinar Reminder',
  community:     'Community Engagement',
  reengagement:  'Re-engagement',
  upsell:        'Upsell',
};

// ---------------------------------------------------------------------------
// Template definitions
// ---------------------------------------------------------------------------

export const SYSTEM_TEMPLATES: SystemTemplate[] = [
  {
    id: 'course-launch-main',
    name: 'Course Launch Announcement',
    category: 'course_launch',
    subject: '🎓 {{product_name}} is officially live!',
    previewText: 'Everything you need to know about getting started',
    estimatedReadingSeconds: 45,
    tags: ['launch', 'course'],
    htmlBody: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
  <h1 style="font-size: 28px; margin-bottom: 8px;">It's live, {{first_name}}! 🎉</h1>
  <p style="font-size: 16px; color: #555; margin-bottom: 24px;">{{product_name}} is now open and ready for you.</p>

  <p>Hi {{first_name}},</p>
  <p>The moment you've been waiting for is here. <strong>{{product_name}}</strong> is now live and your access is ready.</p>

  <p>Here's what's inside:</p>
  <ul>
    <li>📚 Step-by-step modules designed for real results</li>
    <li>💬 Private community access</li>
    <li>🎯 Actionable frameworks you can use immediately</li>
  </ul>

  <div style="margin: 32px 0;">
    <a href="{{cta_url}}" style="background: #6366f1; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
      Access {{product_name}} Now →
    </a>
  </div>

  <p>See you inside,<br><strong>{{sender_name}}</strong></p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
  <p style="font-size: 12px; color: #999;">
    You're receiving this because you're a member of {{community_name}}.<br>
    <a href="{{unsubscribe_url}}">Unsubscribe</a>
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
    htmlBody: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
  <h1 style="font-size: 26px;">Don't miss early bird pricing, {{first_name}}</h1>
  <p style="font-size: 16px; color: #555;">Save {{discount}}% — offer ends {{deadline}}</p>

  <p>Hey {{first_name}},</p>
  <p>Just a quick reminder: our early bird pricing for <strong>{{product_name}}</strong> ends on <strong>{{deadline}}</strong>.</p>
  <p>After that, the price goes up to {{regular_price}}.</p>

  <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 4px;">
    <p style="margin: 0; font-weight: bold;">🔥 Use code <span style="font-size: 18px;">{{discount_code}}</span> at checkout</p>
  </div>

  <div style="margin: 32px 0;">
    <a href="{{cta_url}}" style="background: #f59e0b; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
      Claim Early Bird Price →
    </a>
  </div>

  <p>Don't wait,<br><strong>{{sender_name}}</strong></p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
  <p style="font-size: 12px; color: #999;"><a href="{{unsubscribe_url}}">Unsubscribe</a></p>
</div>`,
  },
  {
    id: 'scarcity-reminder',
    name: 'Scarcity / Last Chance',
    category: 'scarcity',
    subject: '🚨 Last chance — closes tonight at midnight',
    previewText: 'This is your final reminder',
    estimatedReadingSeconds: 25,
    tags: ['scarcity', 'urgency', 'close'],
    htmlBody: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
  <h1 style="font-size: 26px; color: #dc2626;">This closes tonight, {{first_name}}</h1>

  <p>Hey {{first_name}},</p>
  <p>This is my final email about <strong>{{product_name}}</strong>. The cart closes tonight at midnight and won't reopen.</p>

  <p>If you've been on the fence, now is the time to decide.</p>

  <p>Here's what you'll miss out on if you don't join:</p>
  <ul>
    <li>❌ {{benefit_1}}</li>
    <li>❌ {{benefit_2}}</li>
    <li>❌ {{benefit_3}}</li>
  </ul>

  <div style="margin: 32px 0;">
    <a href="{{cta_url}}" style="background: #dc2626; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
      Join Before Midnight →
    </a>
  </div>

  <p>Last chance,<br><strong>{{sender_name}}</strong></p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
  <p style="font-size: 12px; color: #999;"><a href="{{unsubscribe_url}}">Unsubscribe</a></p>
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
    htmlBody: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
  <h1 style="font-size: 28px;">Big news, {{first_name}} 🚀</h1>
  <p style="font-size: 16px; color: #555;">We've been working on something special</p>

  <p>Hi {{first_name}},</p>
  <p>I'm incredibly excited to announce <strong>{{product_name}}</strong> — and I wanted you to be among the first to know.</p>

  <p>{{product_description}}</p>

  <p>Here's what makes it different:</p>
  <ul>
    <li>✅ {{differentiator_1}}</li>
    <li>✅ {{differentiator_2}}</li>
    <li>✅ {{differentiator_3}}</li>
  </ul>

  <div style="margin: 32px 0;">
    <a href="{{cta_url}}" style="background: #6366f1; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
      Learn More →
    </a>
  </div>

  <p>More details coming soon,<br><strong>{{sender_name}}</strong></p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
  <p style="font-size: 12px; color: #999;"><a href="{{unsubscribe_url}}">Unsubscribe</a></p>
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
    htmlBody: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
  <h1 style="font-size: 26px;">See you soon, {{first_name}}! 👋</h1>
  <p style="font-size: 16px; color: #555;">{{event_name}} starts in {{time_until}}</p>

  <p>Hi {{first_name}},</p>
  <p>Just a reminder that <strong>{{event_name}}</strong> is happening <strong>{{event_date}}</strong> at <strong>{{event_time}}</strong>.</p>

  <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin: 24px 0; border-radius: 4px;">
    <p style="margin: 0;"><strong>📍 Where:</strong> {{event_location}}</p>
    <p style="margin: 8px 0 0;"><strong>🕐 When:</strong> {{event_date}} at {{event_time}}</p>
  </div>

  <div style="margin: 32px 0;">
    <a href="{{cta_url}}" style="background: #22c55e; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
      Join the Event →
    </a>
  </div>

  <p>See you there,<br><strong>{{sender_name}}</strong></p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
  <p style="font-size: 12px; color: #999;"><a href="{{unsubscribe_url}}">Unsubscribe</a></p>
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
    htmlBody: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
  <h1 style="font-size: 26px;">This week in {{community_name}} 👀</h1>

  <p>Hey {{first_name}},</p>
  <p>Here's a quick roundup of what's been happening in the community this week.</p>

  <h2 style="font-size: 18px; margin-top: 28px;">🔥 Top Discussions</h2>
  <p>{{top_discussion_1}}</p>

  <h2 style="font-size: 18px; margin-top: 28px;">🏆 Member Wins</h2>
  <p>{{member_win}}</p>

  <h2 style="font-size: 18px; margin-top: 28px;">📚 Resources This Week</h2>
  <p>{{resource_description}}</p>

  <div style="margin: 32px 0;">
    <a href="{{cta_url}}" style="background: #8b5cf6; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
      Join the Conversation →
    </a>
  </div>

  <p>See you in there,<br><strong>{{sender_name}}</strong></p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
  <p style="font-size: 12px; color: #999;"><a href="{{unsubscribe_url}}">Unsubscribe</a></p>
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
    htmlBody: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
  <h1 style="font-size: 26px;">We miss you, {{first_name}} 💙</h1>

  <p>Hi {{first_name}},</p>
  <p>It's been a while since we've heard from you in {{community_name}}, and we wanted to check in.</p>

  <p>Since you've been away, here's what's new:</p>
  <ul>
    <li>✨ {{update_1}}</li>
    <li>✨ {{update_2}}</li>
    <li>✨ {{update_3}}</li>
  </ul>

  <p>We'd love to have you back. Click below to see what you've missed.</p>

  <div style="margin: 32px 0;">
    <a href="{{cta_url}}" style="background: #6366f1; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
      See What's New →
    </a>
  </div>

  <p>Hope to see you soon,<br><strong>{{sender_name}}</strong></p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
  <p style="font-size: 12px; color: #999;"><a href="{{unsubscribe_url}}">Unsubscribe</a></p>
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
    htmlBody: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
  <h1 style="font-size: 26px;">You're ready for the next level 🚀</h1>

  <p>Hi {{first_name}},</p>
  <p>Based on your progress in {{community_name}}, I think you're ready for <strong>{{product_name}}</strong>.</p>

  <p>It's designed specifically for people like you who have already achieved {{previous_achievement}} and are ready to go further.</p>

  <p>What you'll get:</p>
  <ul>
    <li>⚡ {{benefit_1}}</li>
    <li>⚡ {{benefit_2}}</li>
    <li>⚡ {{benefit_3}}</li>
  </ul>

  <div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 16px; margin: 24px 0; border-radius: 4px;">
    <p style="margin: 0;"><strong>Special offer for existing members:</strong> {{special_offer}}</p>
  </div>

  <div style="margin: 32px 0;">
    <a href="{{cta_url}}" style="background: #0ea5e9; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
      Upgrade Now →
    </a>
  </div>

  <p>To your next level,<br><strong>{{sender_name}}</strong></p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
  <p style="font-size: 12px; color: #999;"><a href="{{unsubscribe_url}}">Unsubscribe</a></p>
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
