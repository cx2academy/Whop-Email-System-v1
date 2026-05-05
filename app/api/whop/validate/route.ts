/**
 * app/api/whop/validate/route.ts
 *
 * POST /api/whop/validate — verifies a Whop API key is functional.
 * Called from the Settings page before saving the key.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccessOrThrow, AuthError } from "@/lib/auth/session";
import { createWhopClient } from "@/lib/whop/client";
import type { ApiResponse } from "@/types";

export async function POST(req: NextRequest) {
  try {
    await requireWorkspaceAccessOrThrow();

    const body = await req.json().catch(() => null);
    const apiKey = body?.apiKey as string | undefined;

    if (!apiKey || typeof apiKey !== "string" || apiKey.trim() === "") {
      return NextResponse.json<ApiResponse<any>>(
        { success: false, error: "apiKey is required" },
        { status: 400 }
      );
    }

    const client = createWhopClient(apiKey.trim());
    const validation = await client.validateApiKey();

    if (!validation.valid) {
      return NextResponse.json<ApiResponse<any>>(
        { success: false, error: "Invalid Whop API key", code: "INVALID_KEY" },
        { status: 400 }
      );
    }

    return NextResponse.json<ApiResponse<any>>({
      success: true,
      data: { companyName: validation.companyName },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json<ApiResponse<any>>(
        { success: false, error: err.message },
        { status: 401 }
      );
    }
    console.error("[POST /api/whop/validate]", err);
    return NextResponse.json<ApiResponse<any>>(
      { success: false, error: "Validation failed" },
      { status: 500 }
    );
  }
}
