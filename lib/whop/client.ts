/**
 * lib/whop/client.ts
 *
 * Whop API Client — uses v2 API which works with company API keys.
 *
 * v2 response shape (different from v5):
 *  - email is directly on the membership record
 *  - user/plan/product are ID strings, not expanded objects
 *  - pagination uses current_page/total_page/total_count (no has_more)
 *  - status values include "completed", "expired", "canceled" etc.
 */

import { sleep } from "@/lib/utils";

const WHOP_API_BASE_URL = "https://api.whop.com/api/v2";
const DEFAULT_PAGE_SIZE = 50;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 500;

// ---------------------------------------------------------------------------
// v2 API Types
// ---------------------------------------------------------------------------

export interface WhopMembershipRaw {
  id: string;
  company_id: string;
  product: string;       // product ID string
  user: string;          // user ID string
  plan: string;          // plan ID string
  email: string;         // email is directly on membership in v2
  status: string;        // "completed", "expired", "canceled", etc.
  valid: boolean;
  license_key: string;
  metadata: Record<string, unknown>;
  quantity: number;
  created_at: number;
  expires_at: number | null;
  renewal_period_start: number | null;
  renewal_period_end: number | null;
}

export interface WhopV2PaginatedResponse<T> {
  pagination: {
    current_page: number;
    total_page: number;
    total_count: number;
  };
  data: T[];
}

// Keep these exported so sync/service.ts still compiles
export interface WhopUserRaw { id: string; username: string; email: string; profile_pic_url: string | null; }
export interface WhopPlanRaw { id: string; name: string; }
export interface WhopProductRaw { id: string; name: string; }

export interface NormalisedWhopMember {
  whopMemberId: string;
  whopUserId: string;
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  membershipStatus: string;
  productId: string;
  productName: string;
  planName: string;
  joinedAt: Date;
  expiresAt: Date | null;
  rawMetadata: Record<string, unknown>;
}

export class WhopApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly path: string
  ) {
    super(message);
    this.name = "WhopApiError";
  }
}

export class WhopRateLimitError extends WhopApiError {
  constructor(public readonly retryAfterMs: number, path: string) {
    super(`Whop API rate limit hit on ${path}`, 429, path);
    this.name = "WhopRateLimitError";
  }
}

// ---------------------------------------------------------------------------
// Data mapping — adapted for v2 flat structure
// ---------------------------------------------------------------------------

export function mapMembershipToContact(
  raw: WhopMembershipRaw
): NormalisedWhopMember {
  return {
    whopMemberId: raw.id,
    whopUserId: raw.user ?? "",
    email: raw.email?.toLowerCase().trim() ?? "",
    username: "",           // not available in v2 without separate lookup
    firstName: null,        // not available in v2 without separate lookup
    lastName: null,
    avatarUrl: null,
    // "completed" and "trialing" mean the membership is active in v2
    isActive: raw.valid === true,
    membershipStatus: raw.status,
    productId: raw.product ?? "",
    productName: "",        // ID only in v2
    planName: "",           // ID only in v2
    joinedAt: new Date((raw.created_at ?? 0) * 1000),
    expiresAt: raw.expires_at ? new Date(raw.expires_at * 1000) : null,
    rawMetadata: {
      membershipId: raw.id,
      companyId: raw.company_id,
      status: raw.status,
      valid: raw.valid,
      productId: raw.product,
      planId: raw.plan,
      licenseKey: raw.license_key,
      createdAt: raw.created_at,
      expiresAt: raw.expires_at,
    },
  };
}

// ---------------------------------------------------------------------------
// Client factory
// ---------------------------------------------------------------------------

export function createWhopClient(apiKey: string) {
  if (!apiKey?.trim()) {
    throw new WhopApiError("createWhopClient: apiKey is required.", 400, "client_init");
  }

  const baseHeaders: HeadersInit = {
    Authorization: `Bearer ${apiKey.trim()}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  async function apiFetch<T>(
    path: string,
    options?: RequestInit,
    retryCount = 0
  ): Promise<T> {
    const url = `${WHOP_API_BASE_URL}${path}`;

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers: { ...baseHeaders, ...options?.headers },
      });
    } catch (networkErr) {
      if (retryCount < MAX_RETRIES) {
        await sleep(RETRY_BASE_DELAY_MS * Math.pow(2, retryCount));
        return apiFetch<T>(path, options, retryCount + 1);
      }
      throw new WhopApiError(`Network error on ${path}: ${String(networkErr)}`, 0, path);
    }

    if (response.status === 429) {
      const retryAfterMs =
        parseInt(response.headers.get("Retry-After") ?? "2", 10) * 1000;
      if (retryCount < MAX_RETRIES) {
        await sleep(retryAfterMs);
        return apiFetch<T>(path, options, retryCount + 1);
      }
      throw new WhopRateLimitError(retryAfterMs, path);
    }

    if (response.status >= 500 && retryCount < MAX_RETRIES) {
      await sleep(RETRY_BASE_DELAY_MS * Math.pow(2, retryCount));
      return apiFetch<T>(path, options, retryCount + 1);
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new WhopApiError(
        `Whop API error (${response.status}): ${errorText}`,
        response.status,
        path
      );
    }

    return response.json() as Promise<T>;
  }

  return {
    /**
     * Async generator — yields all memberships across all pages.
     * Uses v2 pagination (current_page / total_page).
     */
    async *fetchAllMemberships(
      perPage = DEFAULT_PAGE_SIZE
    ): AsyncGenerator<WhopMembershipRaw[]> {
      let page = 1;
      let totalPages = 1;

      while (page <= totalPages) {
        const result = await apiFetch<WhopV2PaginatedResponse<WhopMembershipRaw>>(
          `/memberships?page=${page}&per_page=${perPage}`
        );

        totalPages = result.pagination?.total_page ?? 1;

        if (result.data?.length > 0) {
          yield result.data;
        }

        page++;

        // Safety: stop if no data to prevent infinite loop
        if (!result.data?.length) break;
      }
    },

    /**
     * Validate the API key.
     */
    async validateApiKey(): Promise<{ valid: boolean; companyName?: string }> {
      try {
        // v2 uses /company (same as v5 for this endpoint)
        const res = await fetch("https://api.whop.com/api/v5/company", {
          headers: baseHeaders,
        });
        if (!res.ok) return { valid: false };
        const result = await res.json() as { id: string; title?: string };
        return { valid: true, companyName: result.title ?? "Whop Company" };
      } catch {
        return { valid: false };
      }
    },
  };
}

export type WhopClient = ReturnType<typeof createWhopClient>;
