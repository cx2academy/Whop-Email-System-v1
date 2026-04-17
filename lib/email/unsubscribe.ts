import { createHmac } from 'crypto';

const UNSUBSCRIBE_SECRET = process.env.UNSUBSCRIBE_SECRET || 'revtray-default-secret-change-me';

export function generateUnsubscribeToken(workspaceId: string, contactId: string): string {
  const data = `${workspaceId}:${contactId}`;
  const hmac = createHmac('sha256', UNSUBSCRIBE_SECRET).update(data).digest('hex');
  return Buffer.from(`${data}:${hmac}`).toString('base64url');
}

export function verifyUnsubscribeToken(token: string): { workspaceId: string; contactId: string } | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const [workspaceId, contactId, hmac] = decoded.split(':');
    
    if (!workspaceId || !contactId || !hmac) return null;

    const expectedHmac = createHmac('sha256', UNSUBSCRIBE_SECRET)
      .update(`${workspaceId}:${contactId}`)
      .digest('hex');

    if (hmac === expectedHmac) {
      return { workspaceId, contactId };
    }
  } catch (e) {
    return null;
  }
  return null;
}
