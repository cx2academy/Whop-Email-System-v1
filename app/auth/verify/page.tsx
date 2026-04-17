/**
 * app/auth/verify/page.tsx
 *
 * Verification page. Checks the token and updates the user.
 */

import { db } from "@/lib/db/client";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function VerifyPage(props: {
  searchParams: Promise<{ token?: string }>;
}) {
  const searchParams = await props.searchParams;
  const token = searchParams.token;

  if (!token) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#090A0C] px-4 text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Invalid Link</h1>
        <p className="text-gray-400 mb-8">This verification link is missing a token.</p>
        <Link href="/auth/login" className="text-[#22C55E] hover:underline font-bold">Back to Sign In</Link>
      </div>
    );
  }

  // Find the token
  const verification = await db.verificationToken.findUnique({
    where: { token },
  });

  if (!verification || verification.expires < new Date()) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#090A0C] px-4 text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Link Expired</h1>
        <p className="text-gray-400 mb-8">Your verification link has expired or has already been used.</p>
        <div className="flex flex-col gap-4">
          <Link 
            href="/auth/register" 
            className="inline-flex h-11 items-center justify-center rounded-xl bg-white/5 border border-white/10 px-8 text-sm font-bold text-white transition-all hover:bg-white/10"
          >
            Create New Account
          </Link>
          <Link href="/auth/login" className="text-gray-500 hover:text-white text-xs transition-colors">Back to Sign In</Link>
        </div>
      </div>
    );
  }

  // Valid token! Update the user and delete the token.
  try {
    await db.$transaction([
      db.user.update({
        where: { email: verification.identifier },
        data: { emailVerified: new Date() },
      }),
      db.verificationToken.delete({
        where: { token },
      }),
    ]);
  } catch (error) {
    console.error("[verify/page] Verification transaction failed:", error);
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#090A0C] px-4 text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Verification Error</h1>
        <p className="text-gray-400 mb-8">Something went wrong while verifying your email. Please try again or contact support.</p>
        <Link href="/auth/login" className="text-[#22C55E] hover:underline font-bold">Back to Sign In</Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#090A0C] px-4 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#22C55E]/10 text-[#22C55E]">
        <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-white mb-2">Email Verified!</h1>
      <p className="text-gray-400 mb-8 leading-relaxed max-w-sm">
        Your account is now active. You can now sign in and start building your first campaign.
      </p>
      <Link 
        href="/auth/login?verified=true" 
        className="inline-flex h-12 items-center justify-center rounded-xl bg-[#22C55E] px-10 text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] shadow-[0_0_20px_rgba(34,197,94,0.2)]"
      >
        Sign In to Your Workspace
      </Link>
    </div>
  );
}
