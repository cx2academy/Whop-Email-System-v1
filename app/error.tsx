"use client";

/**
 * app/error.tsx
 *
 * Global error boundary — catches unhandled errors in Server Components.
 * Displayed when a page throws an unexpected error.
 */

import { useEffect } from "react";
import Link from "next/link";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // In production this would report to monitoring (e.g. Sentry)
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="mb-4 text-4xl">⚠️</div>
      <h1 className="mb-2 text-xl font-bold text-foreground">
        Something went wrong
      </h1>
      <p className="mb-6 max-w-sm text-sm text-muted-foreground">
        An unexpected error occurred. If this keeps happening, please contact support.
      </p>
      {error.digest && (
        <p className="mb-4 font-mono text-xs text-muted-foreground">
          Error ID: {error.digest}
        </p>
      )}
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          Go to dashboard
        </Link>
      </div>
    </main>
  );
}
