/**
 * app/page.tsx
 *
 * Landing page — public marketing page for Whop Email Engine.
 *
 * Phase 1: Minimal but production-quality placeholder.
 * Phase 5: Full marketing copy and design polish.
 */

import Link from "next/link";

import { MailIcon, UsersIcon, ZapIcon, BarChartIcon } from "lucide-react";

// ---------------------------------------------------------------------------
// Feature data
// ---------------------------------------------------------------------------

const features = [
  {
    icon: UsersIcon,
    title: "Native Whop Sync",
    description:
      "Pull your community members directly from Whop — no CSV exports, no manual uploads.",
  },
  {
    icon: MailIcon,
    title: "Campaign Builder",
    description:
      "Create broadcast campaigns and automated drip sequences with an intuitive editor.",
  },
  {
    icon: ZapIcon,
    title: "Fast Deployment",
    description:
      "Go from draft to inbox in minutes. Built for creators who move at the speed of their community.",
  },
  {
    icon: BarChartIcon,
    title: "Send Analytics",
    description:
      "Track opens, clicks, and conversions to understand what resonates with your audience.",
  },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Navigation */}
      <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <MailIcon className="h-6 w-6 text-primary" aria-hidden="true" />
            <span className="text-lg font-bold tracking-tight">
              Whop Email Engine
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/auth/login"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
            <Link
              href="/auth/login"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1">
        <section className="container flex flex-col items-center justify-center gap-6 py-24 text-center md:py-32">
          <div className="inline-flex items-center rounded-full border border-border bg-muted px-3 py-1 text-sm text-muted-foreground">
            <ZapIcon className="mr-1.5 h-3 w-3" aria-hidden="true" />
            Built for Whop creators
          </div>

          <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tighter md:text-6xl lg:text-7xl">
            Email your community.{" "}
            <span className="text-muted-foreground">Without the friction.</span>
          </h1>

          <p className="max-w-[600px] text-lg text-muted-foreground md:text-xl">
            Sync your Whop members and launch email campaigns in minutes. No
            third-party tools. No data exports. Just your community and your
            message.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/auth/login"
              className="rounded-md bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Connect your Whop
            </Link>
            <a
              href="https://whop.com"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-border bg-background px-8 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              Learn more
            </a>
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-border bg-muted/30">
          <div className="container py-24">
            <div className="mx-auto mb-16 max-w-2xl text-center">
              <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
                Everything you need to reach your members
              </h2>
              <p className="text-lg text-muted-foreground">
                A purpose-built email platform for the Whop creator ecosystem.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="rounded-lg border border-border bg-background p-6 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                      <Icon
                        className="h-5 w-5 text-primary"
                        aria-hidden="true"
                      />
                    </div>
                    <h3 className="mb-2 text-base font-semibold">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="container flex h-16 items-center justify-between">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Whop Email Engine. All rights
            reserved.
          </p>
          <p className="text-sm text-muted-foreground">
            Built for Whop creators
          </p>
        </div>
      </footer>
    </div>
  );
}
