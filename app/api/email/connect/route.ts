/**
 * app/api/email/connect/route.ts
 *
 * POST /api/email/connect
 *
 * Accepts a provider type + credentials, validates them against the
 * provider's API (read-only test — no email sent), then encrypts and
 * upserts a workspace EmailProviderConfig row.
 *
 * Security guarantees:
 *   - Auth required: requireWorkspaceAccess() enforces session + membership.
 *   - Role guard: ADMIN or OWNER only.
 *   - The decrypted key is NEVER returned in any response.
 *   - Input is validated with Zod before any DB or network call.
 *   - AES-256-GCM encryption (existing encrypt() utility).
 *   - Rate-limited: 10 attempts per workspace per hour.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireWorkspaceAccess } from '@/lib/auth/session';
import { encrypt } from '@/lib/encryption';
import { db } from '@/lib/db/client';
import { rateLimit } from '@/lib/rate-limit';
import { validateResendKey } from '@/lib/email/providers/resend';
import { validateSesCredentials } from '@/lib/email/providers/ses';
import { validateSendGridKey } from '@/lib/email/providers/sendgrid';
import type { EmailProviderType } from '@prisma/client';

// ---------------------------------------------------------------------------
// Input schemas — one per provider
// ---------------------------------------------------------------------------

const ResendSchema = z.object({
  provider: z.literal('RESEND'),
  apiKey: z.string().min(1, 're_').max(512),
});

const SesSchema = z.object({
  provider: z.literal('SES'),
  accessKeyId: z
    .string()
    .min(16, 'AWS Access Key ID must be at least 16 characters')
    .max(128),
  secretAccessKey: z
    .string()
    .min(1, 'AWS Secret Access Key is required')
    .max(512),
  region: z
    .string()
    .regex(
      /^[a-z]{2}-[a-z]+-\d$/,
      'Region must be a valid AWS region (e.g. us-east-1)'
    )
    .optional()
    .default('us-east-1'),
});

const SendGridSchema = z.object({
  provider: z.literal('SENDGRID'),
  apiKey: z.string().min(1).max(512),
});

// Union discriminated on "provider"
const ConnectSchema = z.discriminatedUnion('provider', [
  ResendSchema,
  SesSchema,
  SendGridSchema,
]);

type ConnectInput = z.infer<typeof ConnectSchema>;

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------

interface ConnectSuccessResponse {
  success: true;
  provider: EmailProviderType;
  message: string;
}

interface ConnectErrorResponse {
  success: false;
  error: string;
  fieldErrors?: Partial<Record<string, string[]>>;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(
  req: NextRequest
): Promise<NextResponse<ConnectSuccessResponse | ConnectErrorResponse>> {
  // --- 1. Auth + role check ---
  let workspaceId: string;
  let workspaceRole: string;
  try {
    ({ workspaceId, workspaceRole } = await requireWorkspaceAccess());
  } catch {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  if (workspaceRole === 'MEMBER') {
    return NextResponse.json(
      { success: false, error: 'Only workspace Admins and Owners can connect email providers.' },
      { status: 403 }
    );
  }

  // --- 2. Rate limit: 10 per workspace per hour ---
  const rl = await rateLimit(`email:connect:${workspaceId}`, 10, 3600);
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many connection attempts. Try again in an hour.' },
      { status: 429 }
    );
  }

  // --- 3. Parse + validate body ---
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Request body must be valid JSON.' },
      { status: 400 }
    );
  }

  const parsed = ConnectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Validation failed.',
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 422 }
    );
  }

  const input: ConnectInput = parsed.data;

  // --- 4. Validate credentials against provider API (no email sent) ---
  const validation = await validateCredentials(input);
  if (!validation.valid) {
    return NextResponse.json(
      { success: false, error: validation.error ?? 'Provider credential validation failed.' },
      { status: 422 }
    );
  }

  // --- 5. Encrypt credentials + build metadata ---
  const { encryptedKey, metadata } = buildStoragePayload(input);

  // --- 6. Upsert config (one row per workspace) ---
  await db.emailProviderConfig.upsert({
    where: { workspaceId },
    create: {
      workspaceId,
      provider: input.provider as EmailProviderType,
      encryptedKey,
      metadata,
      isVerified: true,
    },
    update: {
      provider: input.provider as EmailProviderType,
      encryptedKey,
      metadata,
      isVerified: true,
    },
  });

  return NextResponse.json(
    {
      success: true,
      provider: input.provider as EmailProviderType,
      message: `${formatProviderName(input.provider)} connected successfully.`,
    },
    { status: 200 }
  );
}

// ---------------------------------------------------------------------------
// Validate credentials per provider
// ---------------------------------------------------------------------------

async function validateCredentials(
  input: ConnectInput
): Promise<{ valid: boolean; error?: string }> {
  switch (input.provider) {
    case 'RESEND':
      return validateResendKey(input.apiKey);

    case 'SES':
      return validateSesCredentials(
        {
          accessKeyId: input.accessKeyId,
          secretAccessKey: input.secretAccessKey,
        },
        input.region
      );

    case 'SENDGRID':
      return validateSendGridKey(input.apiKey);
  }
}

// ---------------------------------------------------------------------------
// Build the encrypted storage payload
// ---------------------------------------------------------------------------

function buildStoragePayload(input: ConnectInput): {
  encryptedKey: string;
  metadata: string;
} {
  switch (input.provider) {
    case 'RESEND':
      return {
        encryptedKey: encrypt(input.apiKey),
        metadata: '{}',
      };

    case 'SES': {
      // Encrypt the full credential JSON — both fields are sensitive
      const credJson = JSON.stringify({
        accessKeyId: input.accessKeyId,
        secretAccessKey: input.secretAccessKey,
      });
      return {
        encryptedKey: encrypt(credJson),
        // Region is not sensitive — safe to store in plain metadata
        metadata: JSON.stringify({ region: input.region }),
      };
    }

    case 'SENDGRID':
      return {
        encryptedKey: encrypt(input.apiKey),
        metadata: '{}',
      };
  }
}

// ---------------------------------------------------------------------------
// GET /api/email/connect — returns current provider status (no key data)
// ---------------------------------------------------------------------------

export async function GET(): Promise<
  NextResponse<
    | { connected: false }
    | { connected: true; provider: EmailProviderType; isVerified: boolean; connectedAt: string }
    | ConnectErrorResponse
  >
> {
  let workspaceId: string;
  try {
    ({ workspaceId } = await requireWorkspaceAccess());
  } catch {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const config = await db.emailProviderConfig.findUnique({
    where: { workspaceId },
    select: {
      provider: true,
      isVerified: true,
      createdAt: true,
    },
  });

  if (!config) {
    return NextResponse.json({ connected: false });
  }

  return NextResponse.json({
    connected: true,
    provider: config.provider,
    isVerified: config.isVerified,
    connectedAt: config.createdAt.toISOString(),
  });
}

// ---------------------------------------------------------------------------
// DELETE /api/email/connect — remove provider config for this workspace
// ---------------------------------------------------------------------------

export async function DELETE(): Promise<
  NextResponse<{ success: boolean; error?: string }>
> {
  let workspaceId: string;
  let workspaceRole: string;
  try {
    ({ workspaceId, workspaceRole } = await requireWorkspaceAccess());
  } catch {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (workspaceRole === 'MEMBER') {
    return NextResponse.json(
      { success: false, error: 'Only Admins and Owners can disconnect email providers.' },
      { status: 403 }
    );
  }

  await db.emailProviderConfig.deleteMany({ where: { workspaceId } });

  return NextResponse.json({ success: true });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatProviderName(provider: string): string {
  switch (provider) {
    case 'RESEND':    return 'Resend';
    case 'SES':       return 'Amazon SES';
    case 'SENDGRID':  return 'SendGrid';
    default:          return provider;
  }
}
