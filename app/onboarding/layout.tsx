import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isEmailAdmin } from "@/lib/admin/utils";

/**
 * app/onboarding/layout.tsx
 * Full-screen focus mode. No sidebar, no topbar, no nav.
 */
export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const userIsAdmin = isEmailAdmin(session?.user?.email);

  // Verification wall for onboarding as well
  if (session?.user && !session.user.emailVerified && !userIsAdmin) {
    redirect('/auth/verify-request');
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F7F8FA',
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      {children}
    </div>
  );
}
