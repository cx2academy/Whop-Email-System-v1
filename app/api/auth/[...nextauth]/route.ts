/**
 * app/api/auth/[...nextauth]/route.ts
 *
 * NextAuth v5 route handler.
 * Handles all auth routes: /api/auth/signin, /api/auth/signout,
 * /api/auth/callback/*, /api/auth/session, etc.
 */

import { handlers } from "@/auth";

export const { GET, POST } = handlers;
