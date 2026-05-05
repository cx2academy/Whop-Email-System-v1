/**
 * app/api/auth/refresh/route.ts
 *
 * GET /api/auth/refresh?callbackUrl=/dashboard
 *
 * Forces NextAuth to re-issue the JWT cookie by triggering a session update.
 * Used after workspace creation so the new workspaceId is reflected in the
 * cookie immediately, without requiring the user to log out and back in.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { encode } from "next-auth/jwt";

export async function GET(req: NextRequest) {
  const callbackUrl = req.nextUrl.searchParams.get("callbackUrl") ?? "/dashboard";

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }

    // Look up the user's current workspace membership
    const membership = await db.workspaceMembership.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: { workspaceId: true, role: true },
    });

    if (!membership) {
      // Still no workspace — send back to onboarding
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }

    // Build a new JWT with the workspaceId included
    const secret = process.env.AUTH_SECRET!;
    const newToken = await encode({
      token: {
        sub: session.user.id,
        name: session.user.name,
        email: session.user.email,
        picture: session.user.image,
        workspaceId: membership.workspaceId,
        workspaceRole: membership.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      },
      secret,
      salt: process.env.NODE_ENV === "production"
        ? "__Secure-authjs.session-token"
        : "authjs.session-token",
    });

    // Set the new cookie and redirect
    const response = NextResponse.redirect(new URL(callbackUrl, req.url));
    const cookieName = process.env.NODE_ENV === "production"
      ? "__Secure-authjs.session-token"
      : "authjs.session-token";

    response.cookies.set(cookieName, newToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (err) {
    console.error("[auth/refresh]", err);
    // On any error, just redirect — worst case they need to log in again
    return NextResponse.redirect(new URL(callbackUrl, req.url));
  }
}
