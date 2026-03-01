/**
 * app/auth/login/page.tsx
 *
 * Login page — supports:
 *   - Whop OAuth (primary)
 *   - Email/password credentials (fallback)
 */

import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign In",
};

interface LoginPageProps {
  searchParams: { callbackUrl?: string; error?: string };
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="inline-block text-2xl font-bold tracking-tight">
            ⚡ Whop Email Engine
          </Link>
          <h1 className="mt-6 text-2xl font-semibold text-foreground">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to your account to continue
          </p>
        </div>

        {searchParams.error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {searchParams.error === "OAuthAccountNotLinked"
              ? "An account with this email already exists. Sign in with email/password."
              : searchParams.error === "CredentialsSignin"
                ? "Invalid email or password. Please try again."
                : "Something went wrong. Please try again."}
          </div>
        )}

        <LoginForm callbackUrl={searchParams.callbackUrl} />

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/auth/register"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Create one free
          </Link>
        </p>
      </div>
    </main>
  );
}
