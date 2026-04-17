"use server";

import { z } from "zod";
import { compare, hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { logAudit } from "@/lib/audit/logger";
import type { ApiResponse } from "@/types";
import { headers } from "next/headers";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      "Password must contain at least one uppercase letter, one lowercase letter, one number and one special character"
    ),
  confirmPassword: z.string().min(1, "Please confirm your new password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export async function changePassword(formData: FormData): Promise<ApiResponse<null>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const rawData = Object.fromEntries(formData.entries());
  const parsed = changePasswordSchema.safeParse(rawData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { currentPassword, newPassword } = parsed.data;

  // Get current user
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });

  if (!user || !user.passwordHash) {
    return {
      success: false,
      error: "You are logged in via a third-party service and do not have a separate password.",
    };
  }

  // Verify current password
  const isCurrentValid = await compare(currentPassword, user.passwordHash);
  if (!isCurrentValid) {
    return { success: false, error: "Incorrect current password" };
  }

  // Hash new password
  const newPasswordHash = await hash(newPassword, 12);

  // Update user
  await db.user.update({
    where: { id: session.user.id },
    data: { passwordHash: newPasswordHash },
  });

  await logAudit(session.user.id, "PASSWORD_CHANGE");

  revalidatePath("/dashboard/settings");
  return { success: true, data: null };
}
