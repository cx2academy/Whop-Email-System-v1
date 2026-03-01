/**
 * app/api/workspace/route.ts
 *
 * Workspace API — GET current workspace details.
 *
 * This route demonstrates the isolation pattern ALL API routes must follow:
 *   1. Call requireWorkspaceAccessOrThrow() to verify session + membership
 *   2. Scope every DB query to the verified workspaceId
 *   3. Never accept workspaceId from the request body/params
 */

import { NextResponse } from "next/server";
import { requireWorkspaceAccessOrThrow, AuthError } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import type { ApiResponse } from "@/types";

export async function GET() {
  try {
    const { workspaceId, workspaceRole } =
      await requireWorkspaceAccessOrThrow();

    // workspaceId is verified — safe to query
    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        fromEmail: true,
        fromName: true,
        createdAt: true,
        _count: {
          select: {
            contacts: true,
            campaigns: true,
          },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { ...workspace, role: workspaceRole },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: err.message, code: err.code },
        { status: err.code === "UNAUTHENTICATED" ? 401 : 403 }
      );
    }

    console.error("[GET /api/workspace]", err);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
