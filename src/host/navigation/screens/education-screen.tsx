import { lazy, useCallback, useState } from 'react';
import { RemoteBoundary } from '@/host/remote-boundary';

// Bolt 0/ADR-052 — the education remote, unchanged on-demand pattern.
const EducationRemoteApp = lazy(() => import('education/App'));

/**
 * Bolt 12 (ADR-053) — `education`'s first real host navigation entry point:
 * a screen pushed onto `HomeStack` (not a tab root). This is the exact
 * lazy-import + `RemoteBoundary` + retry logic Bolt 0's `HomeScreen`
 * `showRemote` toggle used to own inline, relocated here unchanged in
 * substance — the still-open Layer 2 item (kill the remote's dev server
 * mid-session, confirm `RemoteBoundary`'s retry UI) stays exercisable against
 * this new call site (design.md §6.2 point 3).
 */
export function EducationScreen() {
  const [attempt, setAttempt] = useState(0);

  const handleRetry = useCallback(() => {
    setAttempt(current => current + 1);
  }, []);

  return (
    <RemoteBoundary key={attempt} onRetry={handleRetry}>
      <EducationRemoteApp />
    </RemoteBoundary>
  );
}
