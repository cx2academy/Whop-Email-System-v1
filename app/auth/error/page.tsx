/**
 * app/auth/error/page.tsx
 *
 * NextAuth error page — displayed when auth callbacks fail.
 */

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Authentication Error",
};

interface ErrorPageProps {
  searchParams: { error?: string };
}

const ERROR_MESSAGES: Record<string, string> = {
  Configuration: "There is a problem with the server configuration.",
  AccessDenied: "You do not have permission to sign in.",
  Verification: "The verification link may have expired or already been used.",
  OAuthSignin: "There was a problem signing in with the OAuth provider.",
  OAuthCallback: "There was a problem with the OAuth callback.",
  OAuthCreateAccount: "There was a problem creating your account.",
  EmailCreateAccount: "There was a problem creating your account.",
  Callback: "There was a problem with the authentication callback.",
  Default: "An unexpected error occurred during sign in.",
};

export default function AuthErrorPage({ searchParams }: ErrorPageProps) {
  const errorKey = searchParams.error ?? "Default";
  const errorMessage = ERROR_MESSAGES[errorKey] ?? ERROR_MESSAGES.Default;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-6 text-4xl">⚠️</div>
        <h1 className="mb-2 text-2xl font-bold text-foreground">
          Authentication Error
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">{errorMessage}</p>
        <Link
          href="/auth/login"
          className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Back to Sign In
        </Link>
      </div>
    </main>
  );
}
