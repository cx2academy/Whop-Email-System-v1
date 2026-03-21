/**
 * app/onboarding/layout.tsx
 *
 * Full-screen focus mode layout.
 * No sidebar, no topbar, no distractions.
 * User's entire attention is on the current step.
 */

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F7F8FA',
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      {children}
    </div>
  );
}
