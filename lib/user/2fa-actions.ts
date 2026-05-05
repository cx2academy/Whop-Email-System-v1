"use server";

import { z } from "zod";
import * as otplib from "otplib";
import QRCode from "qrcode";

const { authenticator } = otplib;
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { logAudit } from "@/lib/audit/logger";
import { revalidatePath } from "next/cache";
import type { ApiResponse } from "@/types";

/**
 * Step 1: Generate a new TOTP secret for the user.
 * Does NOT enable 2FA yet.
 */
export async function generate2faSecret(): Promise<ApiResponse<{ secret: string; qrCodeUrl: string }>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return { success: false, error: "Not authenticated" };
  }

  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(
    session.user.email,
    "RevTray",
    secret
  );

  try {
    const qrCodeUrl = await QRCode.toDataURL(otpauth);
    return { success: true, data: { secret, qrCodeUrl } };
  } catch (error) {
    return { success: false, error: "Failed to generate QR code" };
  }
}

const verify2faSchema = z.object({
  secret: z.string().min(1),
  token: z.string().length(6, "Token must be 6 digits"),
});

/**
 * Step 2: Verify the token and enable 2FA for the user.
 */
export async function enable2fa(formData: FormData): Promise<ApiResponse<null>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const raw = {
    secret: formData.get("secret"),
    token: formData.get("token"),
  };

  const parsed = verify2faSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { secret, token } = parsed.data;

  const isValid = authenticator.verify({ token, secret });
  if (!isValid) {
    return { success: false, error: "Invalid verification code" };
  }

  // Generate backup codes (simple implementation: 8 random strings)
  const backupCodes = Array.from({ length: 8 }, () => 
    Math.random().toString(36).substring(2, 10).toUpperCase()
  );

  await db.user.update({
    where: { id: session.user.id },
    data: {
      twoFactorEnabled: true,
      twoFactorSecret: secret, // In production, encrypt this!
      twoFactorBackupCodes: JSON.stringify(backupCodes),
    },
  });

  await logAudit(session.user.id, "MFA_ENABLE");

  revalidatePath("/dashboard/settings");
  return { success: true, data: null };
}

/**
 * Disable 2FA.
 */
export async function disable2fa(): Promise<ApiResponse<null>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  await db.user.update({
    where: { id: session.user.id },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorBackupCodes: null,
    },
  });

  await logAudit(session.user.id, "MFA_DISABLE");

  revalidatePath("/dashboard/settings");
  return { success: true, data: null };
}

/**
 * Verify 2FA token during login flow.
 */
export async function verifyLogin2fa(formData: FormData): Promise<ApiResponse<null>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const token = formData.get("token") as string;
  if (!token || token.length !== 6) {
    return { success: false, error: "Token must be 6 digits" };
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { twoFactorSecret: true },
  });

  if (!user || !user.twoFactorSecret) {
    return { success: false, error: "2FA is not enabled for this account" };
  }

  const isValid = authenticator.verify({
    token,
    secret: user.twoFactorSecret,
  });

  if (!isValid) {
    await logAudit(session.user.id, "MFA_VERIFY_FAILURE", { reason: "invalid_token" });
    return { success: false, error: "Invalid verification code" };
  }

  await logAudit(session.user.id, "MFA_VERIFY_SUCCESS");

  return { success: true, data: null };
}
