import { PostHog } from 'posthog-node';

let posthogClient: PostHog | null = null;

export function getPostHog() {
  if (!posthogClient) {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';
    
    if (key) {
      posthogClient = new PostHog(key, {
        host: host,
      });
    }
  }
  return posthogClient;
}

export function captureServerEvent(distinctId: string, event: string, properties?: Record<string, any>) {
  const client = getPostHog();
  if (client) {
    client.capture({
      distinctId,
      event,
      properties,
    });
  }
}
