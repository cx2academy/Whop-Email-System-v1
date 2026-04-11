import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * app/api/auth/staging/route.ts
 * 
 * Sets a secure cookie to allow bypassing the login flow on staging.
 * Usage: dev.revtray.com/api/auth/staging?token=YOUR_SECRET_TOKEN
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const secret = process.env.STAGING_BYPASS_TOKEN;

  if (!secret || token !== secret) {
    return new NextResponse("Invalid or missing token", { status: 401 });
  }

  const cookieStore = await cookies();
  
  // Set the bypass cookie for 30 days
  cookieStore.set("staging_bypass", secret, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });

  // Redirect to the dashboard
  return NextResponse.redirect(new URL("/dashboard", req.url));
}
