"use server";

import { db } from "@/lib/db/client";
import { headers } from "next/headers";

type AuditAction = 
  | "LOGIN_SUCCESS" 
  | "LOGIN_FAILURE" 
  | "REGISTER" 
  | "PASSWORD_CHANGE" 
  | "MFA_ENABLE" 
  | "MFA_DISABLE" 
  | "MFA_VERIFY_SUCCESS"
  | "MFA_VERIFY_FAILURE"
  | "WORKSPACE_CREATE"
  | "API_KEY_CREATE";

export async function logAudit(
  userId: string,
  action: AuditAction,
  metadata?: Record<string, any>
) {
  try {
    const headerList = await headers();
    const ip = headerList.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    const userAgent = headerList.get("user-agent");

    await db.auditLog.create({
      data: {
        userId,
        action,
        ipAddress: ip,
        userAgent,
        metadata: metadata || {},
      },
    });
  } catch (error) {
    // We don't want audit logging failure to crash the main flow, 
    // but we should log it to the server console.
    console.error("[logAudit] Failed to create audit log:", error);
  }
}
