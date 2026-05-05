# SKILL: Project Stack & Conventions

## Tech Stack
- **Framework**: Next.js 16 (App Router, Server Components by default)
- **DB**: PostgreSQL via Prisma 5 ORM
- **Auth**: NextAuth v5 (Auth.js beta) — `@/auth`, `requireWorkspaceAccess()`
- **Email providers**: Resend (primary), AWS SES, SendGrid, SMTP/Nodemailer
- **UI**: Tailwind CSS + Radix UI primitives + shadcn-style components
- **Drag-and-drop**: @dnd-kit/core, @dnd-kit/sortable
- **Deployment**: Vercel (vercel.json present)
- **Queue**: Custom in-process queue at `queues/index.ts`
- **Whop integration**: webhooks at `app/api/whop/webhook/[workspaceId]/route.ts`

## File Conventions

### Server Actions (lib/***/actions.ts)
```ts
'use server';
import { requireWorkspaceAccess } from '@/lib/auth/session';
import { db } from '@/lib/db/client';

export async function myAction(input: InputType) {
  const { workspaceId } = await requireWorkspaceAccess();
  // always scope to workspaceId
  return db.model.findMany({ where: { workspaceId } });
}
```

### API Routes (app/api/***/route.ts)
```ts
import { NextRequest, NextResponse } from 'next/server';
export async function POST(req: NextRequest) {
  return NextResponse.json({ ... });
}
```

### Page Components (app/dashboard/***/page.tsx)
```ts
import type { Metadata } from 'next';
import { requireWorkspaceAccess } from '@/lib/auth/session';
import { db } from '@/lib/db/client';
export const metadata: Metadata = { title: 'Page Name' };
export default async function PageName() {
  const { workspaceId, workspaceRole } = await requireWorkspaceAccess();
  const isAdmin = workspaceRole === 'OWNER' || workspaceRole === 'ADMIN';
  // fetch data...
  return <ClientComponent data={data} />;
}
```

### Client Components
Always start with `'use client';` as first line.
Use `useRouter()` from `next/navigation` for programmatic navigation.

## CSS / Design System
- CSS vars: `var(--brand)`, `var(--text-primary)`, `var(--text-secondary)`, `var(--surface-card)`, `var(--sidebar-border)`, `var(--surface-app)`
- Font display: `style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}`
- Brand green: `#22C55E` / `var(--brand)`
- Brand button: `style={{ background: 'var(--brand)', boxShadow: '0 2px 8px rgba(34,197,94,0.22)' }}`
- Consistent border style: `style={{ border: '0.5px solid var(--sidebar-border)' }}`
- Rounded cards: `className="rounded-xl"` + border

## Auth Pattern
```ts
const { workspaceId, userId, workspaceRole } = await requireWorkspaceAccess();
const isAdmin = workspaceRole === 'OWNER' || workspaceRole === 'ADMIN';
```
requireWorkspaceAccess() throws/redirects if not authenticated. ALWAYS call it first.

## DB Client
```ts
import { db } from '@/lib/db/client';
```
Prisma singleton. Always scope queries to `workspaceId`.

## Plan Gating
```ts
import { checkFeatureGate, checkLimitGate } from '@/lib/plans/gates';
// Throws PlanGateError with upgrade info if gated
await checkFeatureGate(workspaceId, 'automations');
await checkLimitGate(workspaceId, 'contacts', 1);
```

## Whop Billing (plan upgrades)
- Plans: FREE → STARTER ($29) → GROWTH ($79) → SCALE ($199)
- Billing via Whop: `lib/whop/billing.ts`
- Plan config: `lib/plans/config.ts` (PLANS record)

## Key Env Vars
- `DATABASE_URL` - PostgreSQL
- `NEXTAUTH_SECRET` / `NEXTAUTH_URL`
- `RESEND_API_KEY` - platform sending key
- `WHOP_API_KEY` / `WHOP_WEBHOOK_SECRET`
- `ENCRYPTION_KEY` - for EmailProviderConfig.encryptedKey

## Prisma Migrations
```bash
# After editing schema.prisma:
npx prisma migrate dev --name describe_change
npx prisma generate
```

## Import Aliases
- `@/lib/...` → lib/
- `@/components/...` → components/
- `@/app/...` → app/
- `@/types/...` → types/
- `@/auth` → auth.ts (NextAuth config)

## Common UI Components Available
- `components/ui/button.tsx` — Button
- `components/ui/input.tsx` — Input
- `components/ui/card.tsx` — Card
- `components/ui/badge.tsx` — Badge
- `components/ui/label.tsx` — Label
- `components/ui/plan-usage.tsx` — PlanUsage
- Radix: Dialog, DropdownMenu, Toast, Tooltip, Separator, Avatar (all @radix-ui/react-*)

## Error Handling in Server Actions
Return `{ success: false, error: 'message' }` objects — don't throw from server actions unless using error boundaries.

## Automation Step Types (existing)
`TRIGGER | DELAY | SEND_EMAIL | ADD_TAG | WEBHOOK`
Missing: `CONDITION` (IF/ELSE branching) — needs schema addition.

## Whop Webhook Events (lib/whop/webhook route)
Handles: membership.created, membership.cancelled, payment.succeeded, etc.
Each event can trigger AutomationWorkflow enrollment.
