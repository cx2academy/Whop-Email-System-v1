# SKILL: Database Schema Reference

## Key Models Summary

### Workspace (top-level tenant boundary)
Fields to know: `id`, `plan` (WorkspacePlan enum), `monthlyEmailCap`, `aiCredits`,
`engagementFilterEnabled`, `deduplicationEnabled`, `abuseDetectionEnabled`,
`fromEmail`, `fromName`, `whopApiKey`, `whopCompanyId`, `brandColor`, `logoUrl`
Relation: has EmailProviderConfig (1:1), Contacts, Campaigns, Segments, Automations, etc.

### Contact
Fields: `workspaceId`, `email`, `firstName`, `lastName`, `whopMemberId`, `status` (ContactStatus),
`whopMetadata` (Json), `unsubscribedAt`
Unique: `(workspaceId, email)`
ContactStatus: SUBSCRIBED | UNSUBSCRIBED | BOUNCED | COMPLAINED
NOTE: No PENDING status yet (needed for double opt-in)

### EmailCampaign
Fields: `workspaceId`, `name`, `type` (BROADCAST|DRIP|TRIGGER), `status`, `subject`,
`htmlBody`, `audienceTagIds` (String[]), `audienceSegmentIds` (String[]),
`isAbTest`, `scheduledAt`, `totalRecipients/Sent/Opened/Clicked/Bounced/Revenue`

### EmailProviderConfig
Fields: `workspaceId` (unique), `provider` (RESEND|SES|SENDGRID), `encryptedKey`, `isVerified`
NOTE: Currently requires user to bring their own key. 
TODO Phase 1: Add `usePlatformSending` boolean to Workspace to bypass this.

### AutomationWorkflow + AutomationStep
Step types enum: `TRIGGER | DELAY | SEND_EMAIL | ADD_TAG | WEBHOOK`
Step config stored as JSON string. Position = order integer.
AutomationEnrollment: per-contact tracking through workflow.
TODO Phase 2: Add `CONDITION` step type + `REMOVE_TAG` step type.

### Segment
Rules stored as JSON string with shape: `{ operator: 'AND'|'OR', conditions: SegmentCondition[] }`
ConditionField: tag | status | createdAt | lastOpened | lastClicked | opensCount | emailsSent

### SendingDomain
Tracks SPF/DKIM/DMARC verification. Resend integration via `resendDomainId`.
TODO Phase 3: Add warm-up schedule fields.

### EmailTemplate (user templates)
Fields: `workspaceId`, `name`, `category`, `subject`, `htmlBody`, `isSystemTemplate`, `isPublic`
System templates are currently hardcoded in `lib/templates/library.ts` — NOT in DB.

## Schema Extension Patterns

### Adding a boolean feature flag to Workspace:
```prisma
// In model Workspace:
usePlatformSending Boolean @default(false)
platformSendingEnabled Boolean @default(false)
```
Then: `prisma migrate dev --name add_platform_sending`

### Adding a new enum value:
```prisma
enum AutomationStepType {
  TRIGGER
  DELAY
  SEND_EMAIL
  ADD_TAG
  WEBHOOK
  CONDITION    // ← new
  REMOVE_TAG   // ← new
}
```

### Adding a new model:
Always include:
- `id String @id @default(cuid())`
- `workspaceId String`
- `createdAt DateTime @default(now())`
- `updatedAt DateTime @updatedAt`
- `workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)`
- `@@index([workspaceId])`
- `@@map("snake_case_table_name")`

## Planned Schema Additions by Phase

### Phase 1 — Managed Sending
```prisma
// Workspace additions:
usePlatformSending Boolean @default(true)  // true = no BYOK needed
platformEmailsUsed Int @default(0)         // track platform sends
```

### Phase 2 — Automation Builder
```prisma
// AutomationStepType enum additions:
CONDITION
REMOVE_TAG

// New model: AutomationEdge (for canvas connections)
model AutomationEdge {
  id         String @id @default(cuid())
  workflowId String
  fromStepId String
  toStepId   String
  condition  String? // 'true' | 'false' for CONDITION branches
  workflow   AutomationWorkflow @relation(...)
  fromStep   AutomationStep @relation(name: "EdgeFrom", ...)
  toStep     AutomationStep @relation(name: "EdgeTo", ...)
  @@map("automation_edges")
}

// AutomationStep: add x/y canvas position
canvasX Float @default(0)
canvasY Float @default(0)
```

### Phase 3 — Warm-up
```prisma
model WarmupSchedule {
  id          String @id @default(cuid())
  workspaceId String
  domainId    String
  currentDay  Int @default(1)
  totalDays   Int @default(28)
  status      WarmupStatus @default(ACTIVE)
  dailySendLimit Int @default(10)
  // ...
}
enum WarmupStatus { ACTIVE PAUSED COMPLETED CANCELLED }
```

### Phase 4 — Lead Capture Forms
```prisma
model LeadCaptureForm {
  id          String @id @default(cuid())
  workspaceId String
  name        String
  slug        String  // unique URL slug
  fields      String  @default("[]") // JSON array of fields
  redirectUrl String?
  tagIds      String[] // tags to apply on submission
  doubleOptIn Boolean @default(false)
  confirmEmailSubject String?
  confirmEmailBody    String?
  submissions Int @default(0)
  isActive    Boolean @default(true)
  // ...
}

// Contact PENDING status for double opt-in
// Add to ContactStatus enum: PENDING
```

## JSON Config Shapes

### AutomationStep.config shapes by type:
```ts
// TRIGGER
{ event: 'member_joined' | 'payment_succeeded' | 'member_cancelled' | 'tag_added' | 'form_submitted', tagId?: string, formId?: string }
// DELAY
{ unit: 'minutes' | 'hours' | 'days', amount: number }
// SEND_EMAIL
{ subject: string, htmlBody: string, fromName?: string, fromEmail?: string }
// ADD_TAG / REMOVE_TAG
{ tagId: string }
// WEBHOOK
{ url: string, method: 'GET' | 'POST', headers?: Record<string,string> }
// CONDITION (new)
{ field: 'tag' | 'opened_any' | 'clicked_any' | 'opened_campaign', op: 'has' | 'not_has' | 'true' | 'false', value?: string }
```
