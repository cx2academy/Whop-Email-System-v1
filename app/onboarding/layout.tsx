/**
 * app/onboarding/layout.tsx
 * Full-screen focus mode. No sidebar, no topbar, no nav.
 */
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
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
