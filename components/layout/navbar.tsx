import Link from "next/link";
import { Logo } from "@/components/ui/logo";

/**
 * Top navigation bar component.
 * Phase 2 adds auth state, workspace selector, and user menu.
 */
export function Navbar() {
  return (
    <nav className="border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Logo size={24} />
          <span className="text-xl font-bold text-foreground">
            RevTray
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {/* Phase 2: replace with auth-aware user menu */}
          <Link
            href="/auth/login"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign In
          </Link>
          <Link
            href="/auth/register"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}
