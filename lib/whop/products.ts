'use server';

/**
 * lib/whop/products.ts
 *
 * Fetches the list of products from a workspace's Whop community
 * using the stored whopApiKey. Used to populate the product picker
 * in automation triggers.
 */

import { db } from '@/lib/db/client';

export interface WhopProduct {
  id: string;
  name: string;
  visibility: string;
  price?: number;
}

export async function getWhopProducts(workspaceId: string): Promise<WhopProduct[]> {
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { whopApiKey: true },
  });

  if (!workspace?.whopApiKey) return [];

  try {
    const res = await fetch('https://api.whop.com/v5/products?expand[]=plans', {
      headers: {
        Authorization: `Bearer ${workspace.whopApiKey}`,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 300 }, // cache 5 min
    });

    if (!res.ok) return [];

    const json = await res.json();
    const items = json.data ?? json.products ?? [];

    return items.map((p: { id: string; name: string; visibility?: string; plans?: { base_currency_amount?: number }[] }) => ({
      id:         p.id,
      name:       p.name,
      visibility: p.visibility ?? 'visible',
      price:      p.plans?.[0]?.base_currency_amount,
    }));
  } catch {
    return [];
  }
}
