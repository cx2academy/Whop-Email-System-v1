/**
 * lib/templates/variable-parser.ts
 *
 * Parses and substitutes {{variable}} tokens in template content.
 *
 * Used at two points:
 *   1. Preview — fill with sample data so users see a realistic preview
 *   2. Send time — fill with real contact + workspace data
 *
 * Unknown variables are left as-is (not stripped), so users can see
 * what still needs to be filled in.
 */

export interface TemplateVariables {
  first_name?: string;
  last_name?: string;
  email?: string;
  product_name?: string;
  community_name?: string;
  sender_name?: string;
  cta_url?: string;
  unsubscribe_url?: string;
  // Promo
  discount?: string;
  discount_code?: string;
  deadline?: string;
  regular_price?: string;
  // Event
  event_name?: string;
  event_date?: string;
  event_time?: string;
  event_location?: string;
  time_until?: string;
  // Open-ended extras
  [key: string]: string | undefined;
}

/**
 * Replace all {{variable_name}} tokens with values from the vars map.
 * Tokens with no matching var are left unchanged.
 */
export function parseVariables(template: string, vars: TemplateVariables): string {
  return template.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (match, key: string) => {
    const val = vars[key];
    return val !== undefined ? val : match;
  });
}

/**
 * Extract all {{variable_name}} tokens from a template string.
 */
export function extractVariables(template: string): string[] {
  const matches = template.matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g);
  return [...new Set([...matches].map((m) => m[1]))];
}

/**
 * Sample data for preview rendering.
 */
export const PREVIEW_VARIABLES: TemplateVariables = {
  first_name:      'Alex',
  last_name:       'Johnson',
  email:           'alex@example.com',
  product_name:    'Your Product Name',
  community_name:  'Your Community',
  sender_name:     'Your Name',
  cta_url:         '#',
  unsubscribe_url: '#',
  discount:        '30',
  discount_code:   'LAUNCH30',
  deadline:        'Friday, March 10',
  regular_price:   '$197',
  event_name:      'Live Workshop',
  event_date:      'Friday, March 10',
  event_time:      '2:00 PM EST',
  event_location:  'Zoom (link in your email)',
  time_until:      '2 hours',
};

/**
 * Build template variables from a contact + workspace at send time.
 */
export function buildSendVariables(opts: {
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  workspaceName?: string;
  senderName?: string;
  unsubscribeUrl?: string;
}): TemplateVariables {
  return {
    first_name:      opts.firstName ?? 'there',
    last_name:       opts.lastName ?? '',
    email:           opts.email,
    community_name:  opts.workspaceName ?? '',
    sender_name:     opts.senderName ?? opts.workspaceName ?? '',
    unsubscribe_url: opts.unsubscribeUrl ?? '#',
  };
}
