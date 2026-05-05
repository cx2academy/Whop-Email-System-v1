/**
 * lib/encryption.ts
 *
 * Centralized encryption utility for sensitive data at rest.
 *
 * Algorithm: AES-256-GCM (authenticated encryption)
 *   - 256-bit key derived from ENCRYPTION_KEY env var
 *   - Random 12-byte IV per encryption — ensures identical plaintexts
 *     produce different ciphertexts
 *   - GCM auth tag prevents tampering without detection
 *
 * Storage format (all base64, colon-separated):
 *   `${iv}:${authTag}:${ciphertext}`
 *
 * What is encrypted:
 *   - Workspace.whopApiKey (Whop API credentials)
 *
 * What is NOT encrypted (by design):
 *   - Email bodies — not E2EE, would break deliverability tooling
 *   - fromEmail / fromName — not secret, needed for display
 *   - User passwords — already hashed with bcrypt via NextAuth
 *
 * Setup:
 *   Generate a key: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *   Add to .env.local and Vercel env vars: ENCRYPTION_KEY=<64-char hex string>
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const TAG_LENGTH = 16; // 128-bit auth tag

/**
 * Derives a 32-byte key from the ENCRYPTION_KEY env var.
 * Uses SHA-256 so any length input produces a valid key.
 * Throws clearly if the env var is missing.
 */
function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error('ENCRYPTION_KEY environment variable is not set. Add it to .env.local and Vercel environment variables.');
  }
  return createHash('sha256').update(raw).digest();
}

/**
 * Encrypts a plaintext string.
 * Returns a base64 string in format: iv:authTag:ciphertext
 * Safe to store directly in a database text column.
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
}

/**
 * Decrypts a value produced by encrypt().
 * Returns null if the input is null/undefined (pass-through for optional fields).
 * Throws if the ciphertext has been tampered with (GCM auth tag mismatch).
 */
export function decrypt(ciphertext: string | null | undefined): string | null {
  if (!ciphertext) return null;

  // If value doesn't match our format, it may be a plaintext legacy value —
  // return it as-is to avoid breaking existing data during migration.
  const parts = ciphertext.split(':');
  if (parts.length !== 3) return ciphertext;

  const key = getKey();
  const iv = Buffer.from(parts[0], 'base64');
  const authTag = Buffer.from(parts[1], 'base64');
  const encrypted = Buffer.from(parts[2], 'base64');

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

/**
 * Returns true if a stored value looks like an encrypted blob.
 * Useful for deciding whether to show a masked placeholder in the UI.
 */
export function isEncrypted(value: string | null | undefined): boolean {
  if (!value) return false;
  return value.split(':').length === 3;
}
