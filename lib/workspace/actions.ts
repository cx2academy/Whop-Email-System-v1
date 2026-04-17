/**
 * lib/workspace/actions.ts
 *
 * Server Actions for workspace management.
 *
 * All actions:
 *   1. Validate input with Zod
 *   2. Verify session via requireWorkspaceAccess*
 *   3. Scope every DB query to workspaceId
 *   4. Return typed ApiResponse (never throw to the client)
 */

"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hash } from "bcryptjs";
import { render } from "@react-email/render";

import { db } from "@/lib/db/client";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { getAppUrl } from "@/lib/env";
import {
  requireWorkspaceAccess,
  requireAdminAccess,
} from "@/lib/auth/session";
import { logAudit } from "@/lib/audit/logger";
import { slugify } from "@/lib/utils";
import { encrypt } from "@/lib/encryption";
import { authLimiter } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";
import { VerificationEmail } from "@/emails/verification";
import type { ApiResponse } from "@/types";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const createWorkspaceSchema = z.object({
  name: z
    .string()
    .min(2, "Workspace name must be at least 2 characters")
    .max(64, "Workspace name must be under 64 characters")
    .trim(),
});

const updateWorkspaceSchema = z.object({
  name: z.string().min(2).max(64).trim().optional(),
  fromEmail: z.string().email("Must be a valid email").optional().nullable(),
  fromName: z.string().max(64).optional().nullable(),
  whopApiKey: z.string().optional().nullable(),
  niche: z.string().optional().nullable(),
});

const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required").trim(),
  lastName: z.string().min(1, "Last name is required").trim(),
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  dob: z.string().optional().nullable(),
  phoneNumber: z.string().optional().nullable(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      "Password must contain at least one uppercase letter, one lowercase letter, one number and one special character"
    ),
  workspaceName: z
    .string()
    .min(2, "Workspace name must be at least 2 characters")
    .max(64)
    .trim(),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: "You must agree to the Terms of Service and Privacy Policy.",
  }),
  marketingConsent: z.boolean().optional().default(false),
  persona: z.string().optional().nullable(),
  heardAboutUs: z.string().optional().nullable(),
  utmSource: z.string().optional().nullable(),
  utmMedium: z.string().optional().nullable(),
  utmCampaign: z.string().optional().nullable(),
});

// ---------------------------------------------------------------------------
// Auth actions
// ---------------------------------------------------------------------------

/**
 * Register a new user with email/password and create their first workspace.
 */
export async function registerUser(
  formData: FormData
): Promise<ApiResponse<{ redirectTo: string }>> {
  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";

  // Rate-limit registration by email AND IP to prevent account-creation spam.
  const emailValue = (formData.get("email") as string | null)?.toLowerCase().trim() ?? "unknown";

  const emailRl = authLimiter.check(`register:email:${emailValue}`);
  const ipRl = authLimiter.check(`register:ip:${ip}`);

  if (!emailRl.success || !ipRl.success) {
    return {
      success: false,
      error: "Too many registration attempts. Please wait a minute and try again.",
    };
  }

    const personaValue = formData.get("persona") === "other" 
      ? formData.get("personaOther") 
      : formData.get("persona");
      
    const heardValue = formData.get("heardAboutUs") === "other" 
      ? formData.get("heardAboutUsOther") 
      : formData.get("heardAboutUs");

  const raw = {
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    dob: formData.get("dob"),
    phoneNumber: formData.get("phoneNumber"),
    password: formData.get("password"),
    workspaceName: formData.get("workspaceName"),
    termsAccepted: formData.get("termsAccepted") === "on",
    marketingConsent: formData.get("marketingConsent") === "on",
    persona: (personaValue as string) || null,
    heardAboutUs: (heardValue as string) || null,
    utmSource: formData.get("utmSource") || null,
    utmMedium: formData.get("utmMedium") || null,
    utmCampaign: formData.get("utmCampaign") || null,
  };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { 
    firstName, lastName, email, password, workspaceName, 
    dob, phoneNumber,
    termsAccepted, marketingConsent, persona, heardAboutUs,
    utmSource, utmMedium, utmCampaign
  } = parsed.data;

  console.log(`[registerUser] Starting registration for ${email}`);

  // Check if email already in use
  const existingEmail = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existingEmail) {
    return {
      success: false,
      error: "An account with this email already exists",
      code: "EMAIL_IN_USE",
    };
  }

  // Check if phone number already in use
  if (phoneNumber) {
    const existingPhone = await db.user.findUnique({
      where: { phoneNumber },
      select: { id: true },
    });
    if (existingPhone) {
      return {
        success: false,
        error: "An account with this phone number already exists",
        code: "PHONE_IN_USE",
      };
    }
  }

  console.log(`[registerUser] Hashing password...`);
  // Hash password
  const passwordHash = await hash(password, 12);
  console.log(`[registerUser] Password hashed`);

  const verificationToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

  console.log(`[registerUser] Starting database transaction...`);
  // Create user + workspace + membership in a transaction
  await db.$transaction(async (tx) => {
    console.log(`[registerUser] Creating user...`);
    const user = await tx.user.create({
      data: {
        firstName,
        lastName,
        name: `${firstName} ${lastName}`.trim(),
        email,
        passwordHash,
        dob: dob ? new Date(dob) : null,
        phoneNumber,
        termsAccepted,
        marketingConsent,
        persona: persona || undefined,
        heardAboutUs: heardAboutUs || undefined,
        utmSource: utmSource || undefined,
        utmMedium: utmMedium || undefined,
        utmCampaign: utmCampaign || undefined,
      },
    });

    // Create verification token
    await tx.verificationToken.create({
      data: {
        identifier: email,
        token: verificationToken,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    console.log(`[registerUser] Generating workspace slug...`);
    // Generate unique workspace slug
    const baseSlug = slugify(workspaceName);
    const count = await tx.workspace.count({
      where: { slug: { startsWith: baseSlug } },
    });
    const slug = count === 0 ? baseSlug : `${baseSlug}-${count}`;

    console.log(`[registerUser] Creating workspace...`);
    const workspace = await tx.workspace.create({
      data: {
        name: workspaceName,
        slug,
      },
    });

    console.log(`[registerUser] Creating workspace membership...`);
    await tx.workspaceMembership.create({
      data: {
        workspaceId: workspace.id,
        userId: user.id,
        role: "OWNER",
      },
    });
  });
  console.log(`[registerUser] Transaction complete`);

  // Send verification email
  try {
    const appUrl = getAppUrl();
    const verificationUrl = `${appUrl}/auth/verify?token=${verificationToken}`;
    const emailHtml = await render(
      VerificationEmail({
        name: firstName,
        url: verificationUrl,
      })
    );

    await sendEmail({
      to: email,
      subject: "Verify your email - RevTray",
      html: emailHtml,
    });
  } catch (error) {
    console.error("[registerUser] Failed to send verification email:", error);
    // We don't fail registration if email fails, but maybe we should log it.
  }

  // Log registration (need to get the user ID)
  try {
    const newlyCreatedUser = await db.user.findUnique({ where: { email }, select: { id: true } });
    if (newlyCreatedUser) {
      await logAudit(newlyCreatedUser.id, "REGISTER");
    }
  } catch (e) {
    console.error("[registerUser] Audit log failed:", e);
  }

  return { success: true, data: { redirectTo: "/auth/login" } };
}

// ---------------------------------------------------------------------------
// Workspace actions
// ---------------------------------------------------------------------------

/**
 * Create a new workspace for the current user.
 * Users can belong to multiple workspaces.
 */
export async function createWorkspace(
  formData: FormData
): Promise<ApiResponse<{ workspaceId: string }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = createWorkspaceSchema.safeParse({
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { name } = parsed.data;
  const baseSlug = slugify(name);
  const count = await db.workspace.count({
    where: { slug: { startsWith: baseSlug } },
  });
  const slug = count === 0 ? baseSlug : `${baseSlug}-${count}`;

  const workspace = await db.workspace.create({
    data: { name, slug },
  });

  await db.workspaceMembership.create({
    data: {
      workspaceId: workspace.id,
      userId: session.user.id,
      role: "OWNER",
    },
  });

  revalidatePath("/dashboard");
  return { success: true, data: { workspaceId: workspace.id } };
}

/**
 * Update workspace settings (admin/owner only).
 */
export async function updateWorkspace(
  rawData: Record<string, unknown>
): Promise<ApiResponse<{ workspaceId: string }>> {
  const { workspaceId } = await requireAdminAccess();

  const parsed = updateWorkspaceSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  // Encrypt whopApiKey before storing — never persisted in plaintext
  const dataToSave = { ...parsed.data };
  if (dataToSave.whopApiKey) {
    dataToSave.whopApiKey = encrypt(dataToSave.whopApiKey);
  }

  await db.workspace.update({
    where: { id: workspaceId },
    data: dataToSave,
  });

  revalidatePath("/dashboard/settings");
  return { success: true, data: { workspaceId } };
}

/**
 * Get the current user's workspace.
 * Enforces that the caller is a member of the workspace.
 */
export async function getCurrentWorkspace() {
  const { workspaceId } = await requireWorkspaceAccess();

  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      fromEmail: true,
      fromName: true,
      monthlyEmailCap: true,
      createdAt: true,
      _count: {
        select: {
          contacts: true,
          campaigns: true,
        },
      },
    },
  });

  if (!workspace) redirect("/onboarding");
  return workspace;
}
