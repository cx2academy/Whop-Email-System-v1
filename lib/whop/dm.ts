/**
 * lib/whop/dm.ts
 *
 * Sends a Whop direct message to a member.
 *
 * Whop API flow (v1):
 *   1. GET  /api/v2/memberships/:id → resolve the user ID from membership ID
 *   2. POST /api/v1/dm-channels    → get or create a DM channel with that user
 *   3. POST /api/v1/messages       → send the message into that channel
 *
 * The workspace's existing `whopApiKey` is used as the Bearer token —
 * requires the `chat:message:create` permission scope on that key.
 *
 * Contacts must have a `whopMemberId` set (populated during Whop sync).
 */

const WHOP_API_V1 = 'https://api.whop.com/api/v1';
const WHOP_API_V2 = 'https://api.whop.com/api/v2';

export interface WhopDmOptions {
  whopApiKey: string;
  /** The contact's whopMemberId (membership ID, e.g. mem_xxxxx) */
  whopMemberId: string;
  /** Plain-text or Markdown message body — strip HTML before passing */
  message: string;
}

export interface WhopDmResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Strips HTML tags and decodes common entities to produce plain text
 * suitable for Whop DMs (which render Markdown, not HTML).
 */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<li>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Step 1: Get the Whop user ID from a membership ID (v2 API).
 * The membership record has a `user` field with the user ID.
 */
async function getUserIdFromMembership(
  apiKey: string,
  membershipId: string
): Promise<string | null> {
  try {
    const res = await fetch(`${WHOP_API_V2}/memberships/${membershipId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    });
    if (!res.ok) return null;
    const data = await res.json() as { user?: string };
    return data?.user ?? null;
  } catch {
    return null;
  }
}

/**
 * Step 2: Get or create a DM channel with a specific Whop user (v1 API).
 * Whop returns the existing channel if one already exists — idempotent.
 */
async function getOrCreateDmChannel(
  apiKey: string,
  userId: string
): Promise<string | null> {
  try {
    const res = await fetch(`${WHOP_API_V1}/dm-channels`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ user_id: userId }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn(`[whop/dm] dm-channels failed (${res.status}): ${body.slice(0, 200)}`);
      return null;
    }
    const data = await res.json() as { id?: string };
    return data?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Step 3: Send a message into a channel (v1 API).
 * Requires chat:message:create permission on the API key.
 */
async function sendMessageToChannel(
  apiKey: string,
  channelId: string,
  content: string
): Promise<WhopDmResult> {
  try {
    const res = await fetch(`${WHOP_API_V1}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ channel_id: channelId, content }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { success: false, error: `Whop API ${res.status}: ${body.slice(0, 200)}` };
    }

    const data = await res.json() as { id?: string };
    return { success: true, messageId: data?.id };
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Network error' };
  }
}

/**
 * Main export: send a Whop DM to a contact.
 * Full 3-step flow: membership ID → user ID → DM channel → message.
 */
export async function sendWhopDm(opts: WhopDmOptions): Promise<WhopDmResult> {
  const { whopApiKey, whopMemberId, message } = opts;

  const userId = await getUserIdFromMembership(whopApiKey, whopMemberId);
  if (!userId) {
    return { success: false, error: `Could not resolve user ID for membership ${whopMemberId}` };
  }

  const channelId = await getOrCreateDmChannel(whopApiKey, userId);
  if (!channelId) {
    return { success: false, error: `Could not get or create DM channel for user ${userId}` };
  }

  return sendMessageToChannel(whopApiKey, channelId, message);
}
