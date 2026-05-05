"use client";

/**
 * components/auth/sign-out-button.tsx
 *
 * Client component that triggers NextAuth signOut.
 */

import { signOut } from "next-auth/react";
import { LogOutIcon } from "lucide-react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/auth/login" })}
      className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      aria-label="Sign out"
    >
      <LogOutIcon className="h-4 w-4" aria-hidden="true" />
      Sign out
    </button>
  );
}
