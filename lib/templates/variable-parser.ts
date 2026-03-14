/**
 * lib/templates/variable-parser.ts
 *
 * Parses and substitutes {{variable}} tokens in template content.
 *
 * Supported syntax:
 *   {{first_name}}                        — simple replacement
 *   {{firstName}}                         — camelCase alias (mapped to snake_case)
 *   {{first_name | fallback: 'there'}}    — with fallback value
 *   {{firstName | fallback: 'there'}}     — camelCase + fallback
 *
 * Unknown variables with no fallback are replaced with an empty string.
 * This function is called at send time — real contacts data is substituted.
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
  purchase_date?: string;
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

// Map camelCase tokens (used by AI prompts) → snake_case keys
const CAMEL_TO_SNAKE: Record<string, string> = {
  firstName:      'first_name',
  lastName:       'last_name',
  senderName:     'sender_name',
  productName:    'product_name',
  communityName:  'community_name',
  ctaUrl:         'cta_url',
  unsubscribeUrl: 'unsubscribe_url',
  purchaseDate:   'purchase_date',
};

/**
 * Resolve a token key (camelCase or snake_case) against the vars map.
 * Returns the value if found, undefined otherwise.
 */
function resolveKey(rawKey: string, vars: TemplateVariables): string | undefined {
  // Try direct match first
  if (vars[rawKey] !== undefined) return vars[rawKey];
  // Try camelCase → snake_case alias
  const snakeKey = CAMEL_TO_SNAKE[rawKey];
  if (snakeKey && vars[snakeKey] !== undefined) return vars[snakeKey];
  return undefined;
}

/**
 * Replace all {{variable}} and {{variable | fallback: 'value'}} tokens.
 *
 * Rules:
 *  - If the variable has a value → use it
 *  - If no value but has fallback → use the fallback (strips surrounding quotes)
 *  - If no value and no fallback → replace with empty string
 */
export function parseVariables(template: string, vars: TemplateVariables): string {
  // Match: {{key}} or {{key | fallback: 'value'}} or {{key | fallback: "value"}}
  return template.replace(
    /\{\{\s*([a-zA-Z0-9_]+)\s*(?:\|\s*fallback\s*:\s*['"]([^'"]*)['"]\s*)?\}\}/g,
    (_match, rawKey: string, fallback?: string) => {
      const value = resolveKey(rawKey.trim(), vars);
      if (value !== undefined && value !== '') return value;
      if (fallback !== undefined) return fallback;
      return '';
    }
  );
}

/**
 * Extract all unique variable names from a template string.
 * Handles both {{key}} and {{key | fallback: 'value'}} syntax.
 */
export function extractVariables(template: string): string[] {
  const matches = template.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*(?:\|[^}]*)?\}\}/g);
  return [...new Set([...matches].map((m) => CAMEL_TO_SNAKE[m[1]] ?? m[1]))];
}

/**
 * Build a TemplateVariables map from a contact record + workspace data.
 * Called at send time — never at preview time.
 */
export function buildSendVariables(opts: {
  firstName?:     string | null;
  lastName?:      string | null;
  email?:         string;
  senderName?:    string;
  unsubscribeUrl?: string;
  ctaUrl?:        string;
  productName?:   string;
  communityName?: string;
}): TemplateVariables {
  return {
    first_name:      opts.firstName  || '',
    last_name:       opts.lastName   || '',
    email:           opts.email      || '',
    sender_name:     opts.senderName || '',
    unsubscribe_url: opts.unsubscribeUrl || '',
    cta_url:         opts.ctaUrl     || '#',
    product_name:    opts.productName    || '',
    community_name:  opts.communityName  || '',
  };
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
