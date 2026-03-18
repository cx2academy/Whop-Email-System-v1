/**
 * lib/email/providers/ses.ts
 *
 * Amazon SES v2 email provider.
 *
 * Uses the @aws-sdk/client-sesv2 package (AWS SDK v3).
 * Credentials are passed in at construction time — never read from env
 * so different workspaces can use different AWS accounts.
 *
 * The stored credential blob is JSON: { accessKeyId, secretAccessKey }
 * encrypted with the shared AES-256-GCM key. Region is stored in metadata.
 *
 * Install dependency (add to package.json):
 *   npm install @aws-sdk/client-sesv2
 */

import {
  SESv2Client,
  SendEmailCommand,
  type SendEmailCommandInput,
  GetAccountCommand,
} from '@aws-sdk/client-sesv2';
import type {
  EmailProvider,
  SendEmailOptions,
  SendEmailResult,
} from '@/lib/email/types';

// ---------------------------------------------------------------------------
// Credential shape stored in encryptedKey
// ---------------------------------------------------------------------------

export interface SesCredentials {
  accessKeyId: string;
  secretAccessKey: string;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export class SesProvider implements EmailProvider {
  readonly name = 'ses' as const;

  private readonly client: SESv2Client;

  constructor(credentials: SesCredentials, region = 'us-east-1') {
    this.client = new SESv2Client({
      region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      },
    });
  }

  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    const from = options.from ?? 'noreply@whopemailengine.com';
    const toAddresses = Array.isArray(options.to) ? options.to : [options.to];

    const input: SendEmailCommandInput = {
      FromEmailAddress: from,
      Destination: { ToAddresses: toAddresses },
      ReplyToAddresses: options.replyTo ? [options.replyTo] : undefined,
      Content: {
        Simple: {
          Subject: { Data: options.subject, Charset: 'UTF-8' },
          Body: {
            Html: { Data: options.html, Charset: 'UTF-8' },
            ...(options.text && {
              Text: { Data: options.text, Charset: 'UTF-8' },
            }),
          },
        },
      },
      // SES native deduplication — idempotency at the API level
      ...(options.idempotencyKey && {
        ConfigurationSetName: undefined, // set if you use SES config sets
      }),
    };

    try {
      const command = new SendEmailCommand(input);
      const response = await this.client.send(command);

      return {
        success: true,
        messageId: response.MessageId,
        provider: 'ses',
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: `SES exception: ${message}`,
        provider: 'ses',
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Validation helper — used by POST /api/email/connect
//
// Calls SES GetAccount (read-only) to confirm credentials work.
// Does NOT send any email.
// ---------------------------------------------------------------------------

export async function validateSesCredentials(
  credentials: SesCredentials,
  region = 'us-east-1'
): Promise<{ valid: boolean; error?: string }> {
  const client = new SESv2Client({
    region,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
    },
  });

  try {
    await client.send(new GetAccountCommand({}));
    return { valid: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);

    if (
      message.includes('InvalidClientTokenId') ||
      message.includes('SignatureDoesNotMatch') ||
      message.includes('AuthFailure')
    ) {
      return {
        valid: false,
        error: 'Invalid AWS credentials. Check your Access Key ID and Secret.',
      };
    }

    if (message.includes('not authorized') || message.includes('AccessDenied')) {
      return {
        valid: false,
        error:
          'Credentials are valid but lack SES permissions. Ensure ses:SendEmail and ses:GetAccount are allowed.',
      };
    }

    return {
      valid: false,
      error: `AWS SES validation failed: ${message}`,
    };
  }
}

// ---------------------------------------------------------------------------
// Credential parser — safely parses the decrypted JSON blob
// ---------------------------------------------------------------------------

export function parseSesCredentials(
  decryptedJson: string
): SesCredentials | null {
  try {
    const parsed = JSON.parse(decryptedJson) as unknown;
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'accessKeyId' in parsed &&
      'secretAccessKey' in parsed &&
      typeof (parsed as Record<string, unknown>).accessKeyId === 'string' &&
      typeof (parsed as Record<string, unknown>).secretAccessKey === 'string'
    ) {
      return parsed as SesCredentials;
    }
    return null;
  } catch {
    return null;
  }
}
