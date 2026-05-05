# SKILL: Master Phase Plan — Whop Email Engine

## Top 10 Priorities (Ordered by Impact)

1. **Managed sending** — Remove BYOK requirement. Use platform Resend key by default. Biggest adoption blocker.
2. **Visual automation builder** — Canvas-based IF/ELSE flow editor. Table stakes vs Kit/EmailSync.
3. **Domain warm-up system** — Gradual volume ramp over 28 days. Deliverability foundation.
4. **Lead capture forms + double opt-in** — Grow lists beyond Whop members. GDPR compliance.
5. **Free tier overhaul** — Raise to 2,500 contacts / 10,000 emails. Currently uncompetitive vs Kit.
6. **Template gallery UI** — Visual previews, category browser, quick-clone. Remove hardcoded HTML from TS.
7. **Automation conditional branching** — CONDITION step type with true/false edges. Required for real flows.
8. **Multiple attribution models** — First-touch, linear, time-decay alongside last-click.
9. **Email preview polish** — Mobile/desktop toggle, spam score, real inbox test.
10. **AI email generation** — Full email from prompt, not just panel assist. Make it the headline feature.

---

## Phase Plan

### PHASE 1 — Managed Sending (Priority #1 + #5 Free Tier)
**Goal:** User signs up, connects Whop, sends their first email with zero infra setup.
**Files to create/edit:**
- `prisma/schema.prisma` — add `usePlatformSending Boolean @default(true)` to Workspace
- `prisma/migrations/...` — new migration
- `lib/sending/platform-sender.ts` — NEW: platform-level Resend client using RESEND_API_KEY env
- `lib/sending/actions.ts` — update sendCampaign to use platform sender when usePlatformSending=true
- `app/api/email/connect/route.ts` — make provider config optional (not required to send)
- `app/dashboard/settings/email-provider.tsx` — update UI: "Optional — bring your own key for advanced control"
- `lib/plans/config.ts` — raise FREE tier: 2,500 contacts, 10,000 emails/month
- `app/dashboard/settings/plan-billing.tsx` — update free tier display

**Definition of done:** New user can send a campaign without touching email provider settings.

---

### PHASE 2 — Visual Automation Builder (Priority #2 + #7)
**Goal:** Canvas-based drag-and-drop flow builder with CONDITION nodes (IF/ELSE).
**Files to create/edit:**
- `prisma/schema.prisma` — add CONDITION + REMOVE_TAG to AutomationStepType enum; add AutomationEdge model; add canvasX/canvasY to AutomationStep
- `prisma/migrations/...`
- `app/dashboard/automation/builder/page.tsx` — NEW: canvas page wrapper
- `components/automation/canvas.tsx` — NEW: React Flow-style canvas (built with dnd-kit or custom SVG+state)
- `components/automation/nodes/` — NEW: node components per step type (TriggerNode, DelayNode, SendEmailNode, ConditionNode, TagNode, WebhookNode)
- `components/automation/node-panel.tsx` — NEW: right panel for editing selected node config
- `lib/automation/actions.ts` — update to handle edges, CONDITION type, REMOVE_TAG
- `lib/automation/executor.ts` — NEW: runtime execution with branching logic

**Definition of done:** User can build an "on join → wait 1 day → send welcome email → IF opened → add tag 'engaged' ELSE → send follow-up" flow visually.

---

### PHASE 3 — Domain Warm-up System (Priority #3)
**Goal:** Automatic warm-up schedule when a new domain is connected. Shows daily limits + progress.
**Files to create/edit:**
- `prisma/schema.prisma` — add WarmupSchedule model + WarmupStatus enum
- `prisma/migrations/...`
- `lib/warmup/schedule.ts` — NEW: warm-up volume curve (day 1=10, day 2=20... day 28=2000+)
- `lib/warmup/actions.ts` — NEW: start/pause/reset warmup, get current daily limit
- `lib/sending/actions.ts` — enforce warmup daily limit if warmup is ACTIVE
- `app/dashboard/deliverability/warmup.tsx` — NEW: warm-up progress UI component
- `app/dashboard/deliverability/page.tsx` — add warmup section

**Definition of done:** New domain auto-starts a 28-day warm-up. Deliverability page shows daily limit, progress bar, day count.

---

### PHASE 4 — Lead Capture Forms + Double Opt-in (Priority #4)
**Goal:** Create embeddable opt-in forms with double opt-in flow. Add PENDING contact status.
**Files to create/edit:**
- `prisma/schema.prisma` — add LeadCaptureForm model; add PENDING to ContactStatus enum
- `prisma/migrations/...`
- `lib/forms/actions.ts` — NEW: createForm, getForm, submitForm, confirmOptIn
- `app/dashboard/forms/page.tsx` — NEW: forms list page
- `app/dashboard/forms/new/page.tsx` — NEW: form builder page
- `components/forms/form-builder.tsx` — NEW: drag fields, configure double opt-in
- `app/api/forms/[formId]/submit/route.ts` — NEW: public submission endpoint
- `app/confirm/[token]/page.tsx` — NEW: double opt-in confirmation page
- `lib/forms/embed.ts` — NEW: generates embed snippet (iframe + JS widget)

**Definition of done:** Creator builds a form, copies embed code to their site, subscriber submits → gets confirmation email → confirmed → SUBSCRIBED.

---

### PHASE 5 — Template Gallery (Priority #6)
**Goal:** Move system templates to DB, add visual gallery with previews, quick-clone.
**Files to create/edit:**
- `prisma/schema.prisma` — add `thumbnailUrl`, `isPro` to EmailTemplate
- `prisma/migrations/...`
- `scripts/seed-templates.ts` — NEW: seed script to insert library.ts templates into DB
- `lib/templates/actions.ts` — update to query DB instead of library.ts for system templates
- `app/dashboard/templates/page.tsx` — full rebuild: grid gallery with category filter + preview modal
- `components/templates/template-card.tsx` — NEW: card with iframe preview thumbnail
- `components/templates/template-preview-modal.tsx` — NEW: full preview + use/clone buttons
- `lib/templates/library.ts` — keep as seed source, deprecate direct import elsewhere

**Definition of done:** Templates page shows visual grid. User can filter by category, preview full email, click "Use template" to open campaign builder pre-filled.

---

### PHASE 6 — Attribution Models + Analytics Upgrade (Priority #8)
**Goal:** Add first-touch, linear, time-decay attribution. Upgrade analytics dashboard.
**Files to create/edit:**
- `prisma/schema.prisma` — `attributionModel` on RevenueAttribution: keep `last_click`, add `first_touch | linear | time_decay`
- `lib/attribution/models.ts` — NEW: compute attribution per model
- `lib/attribution/actions.ts` — NEW: recalculate, export, model comparison
- `app/dashboard/revenue/page.tsx` — add model switcher UI + comparison chart
- `app/dashboard/analytics/page.tsx` — upgrade: cohort view, engagement over time, unsubscribe rate trend

**Definition of done:** Revenue page has model dropdown. Switching model re-computes attributed revenue per campaign. Side-by-side comparison available.

---

### PHASE 7 — AI Email Generation (Priority #10)
**Goal:** Full "generate from prompt" flow — user describes email, AI writes complete ready-to-send email.
**Files to create/edit:**
- `app/api/ai/generate-email/route.ts` — NEW: takes prompt + context, returns subject + htmlBody blocks
- `components/email-editor/ai-generate-modal.tsx` — NEW: prompt input → streaming preview → "Use this"
- `app/dashboard/campaigns/new/page.tsx` — add "Generate with AI" entry point before builder
- `lib/ai/prompts.ts` — NEW: system prompts for email generation, subject line variants, tone options
- Credit deduction integrated: 3 credits per full generation, 1 per subject variant

**Definition of done:** From new campaign page user can choose "Write with AI", enter "announce my new trading course launching Friday, urgent CTA", get a complete on-brand email, review and send.

---

### PHASE 8 — Email Preview Polish + Spam Score (Priority #9)
**Goal:** Real mobile/desktop toggle, spam score check, inbox placement test.
**Files to create/edit:**
- `components/email-editor/email-preview.tsx` — full rebuild: iframe with 375px/600px toggle, dark mode toggle
- `lib/deliverability/spam-score.ts` — NEW: heuristic spam scoring (subject line caps, link density, text ratio, etc.)
- `components/email-editor/spam-check-panel.tsx` — NEW: inline warnings in campaign builder step 3
- `app/api/email/preview-send/route.ts` — NEW: send test email to yourself

**Definition of done:** Campaign builder step 3 shows spam score 0-100, warnings list, mobile/desktop preview toggle, "Send test to myself" button.

---

## Skill Files Index
- `SKILL-stack.md` — tech conventions, imports, auth patterns
- `SKILL-schema.md` — DB schema reference, extension patterns
- `SKILL-phases.md` — this file: phase plan + priorities

## Notes for Claude When Building
- Always read SKILL-stack.md before writing any code in a phase
- Always read SKILL-schema.md before touching prisma/schema.prisma
- Never hallucinate existing function signatures — check the actual file first with bash_tool
- Each phase delivers: all changed files + migration SQL if needed + git commands
- After delivering a phase: STOP and wait for "proceed to phase X"
- Project path on user's machine: `C:\Users\coope\OneDrive\Desktop\whop-email-engine`
