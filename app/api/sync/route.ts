/**
 * app/api/sync/route.ts
 *
 * Sync trigger endpoint — POST /api/sync
 *
 * Rate limited: 5 triggers per hour per workspace.
 * Auth: ADMIN or OWNER role required.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccessOrThrow, AuthError } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { runSync } from "@/lib/sync/service";
import { syncLimiter } from "@/lib/rate-limit";
import type { ApiResponse } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { workspaceId, userId, workspaceRole } =
      await requireWorkspaceAccessOrThrow();

    // Role check
    if (workspaceRole === "MEMBER") {
      return NextResponse.json<ApiResponse<any>>(
        { success: false, error: "Admin or Owner role required", code: "UNAUTHORIZED" },
        { status: 403 }
      );
    }

    // Rate limit per workspace
    const rateCheck = syncLimiter.check(`sync:${workspaceId}`);
    if (!rateCheck.success) {
      return NextResponse.json<ApiResponse<any>>(
        {
          success: false,
          error: "Sync rate limit exceeded. You can trigger up to 5 syncs per hour.",
          code: "RATE_LIMITED",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rateCheck.resetAt - Date.now()) / 1000)),
          },
        }
      );
    }

    // Check for API key
    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
      select: { whopApiKey: true },
    });

    if (!workspace?.whopApiKey) {
      return NextResponse.json<ApiResponse<any>>(
        {
          success: false,
          error: "No Whop API key configured. Add it in Settings.",
          code: "NO_API_KEY",
        },
        { status: 400 }
      );
    }

    // Prevent concurrent syncs
    const activeSyncs = await db.syncLog.count({
      where: { workspaceId, status: "RUNNING" },
    });

    if (activeSyncs > 0) {
      return NextResponse.json<ApiResponse<any>>(
        {
          success: false,
          error: "A sync is already running for this workspace.",
          code: "SYNC_IN_PROGRESS",
        },
        { status: 409 }
      );
    }

    const result = await runSync({
      workspaceId,
      apiKey: workspace.whopApiKey,
      triggeredBy: userId,
    });

    if (result.status === "FAILED") {
      return NextResponse.json<ApiResponse<any>>({
        success: false,
        error: "Sync failed",
      });
    }

    return NextResponse.json<ApiResponse<any>>({
      success: true,
      data: {
        syncLogId: result.syncLogId,
        status: result.status,
        totalFetched: result.totalFetched,
        totalUpserted: result.totalUpserted,
        totalSkipped: result.totalSkipped,
        totalErrors: result.totalErrors,
        durationMs: result.durationMs,
      },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json<ApiResponse<any>>(
        { success: false, error: err.message, code: err.code },
        { status: err.code === "UNAUTHENTICATED" ? 401 : 403 }
      );
    }
    console.error("[POST /api/sync]", err);
    return NextResponse.json<ApiResponse<any>>(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
