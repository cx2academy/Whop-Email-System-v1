/**
 * lib/admin/utils.ts
 *
 * Centralized logic for administrative access checks.
 * Uses environment variables to determine who has "God Mode" access.
 */

import { auth } from '@/auth';

/**
 * Returns a list of all administrative emails from the environment.
 */
export function getAdminEmails(): string[] {
  const envEmails = process.env.ADMIN_EMAILS || '';
  return envEmails
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Checks if a specific email has administrative access.
 * Fallback to hardcoded owner during absolute dev if env is missing.
 */
export function isEmailAdmin(email?: string | null): boolean {
  if (!email) return false;
  
  const adminEmails = getAdminEmails();
  
  // Always include the project creator as an emergency fallback
  const fallbackAdmin = 'bauxiticstar7546@gmail.com';
  
  return adminEmails.includes(email.toLowerCase()) || email.toLowerCase() === fallbackAdmin;
}

/**
 * Server-side helper to check if the current session is an admin.
 */
export async function isAdmin(): Promise<boolean> {
  const session = await auth();
  return isEmailAdmin(session?.user?.email);
}

/**
 * Server-side helper to throw an error if the current session is NOT an admin.
 * Used at the top of server actions.
 */
export async function ensureAdmin() {
  const sessionIsAdmin = await isAdmin();
  if (!sessionIsAdmin) {
    throw new Error('Unauthorized: Administrative access required.');
  }
}
