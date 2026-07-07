import { lazy, useCallback, useState } from 'react';
import { RemoteBoundary } from '@/host/remote-boundary';

// Bolt 13 (ADR-057) — the `admin` remote, third real MF remote, first
// genuinely freestanding one (no existing screen anywhere pulls toward
// host or another remote). Same on-demand pattern as `education`/`pools`.
const AdminRemoteApp = lazy(() => import('admin/App'));

/**
 * Bolt 13 (ADR-057, design.md §9/§10) — `admin`'s host navigation entry
 * point: a screen pushed onto `SettingsStack` (not a tab root, not a
 * Home-screen button, unlike `education`'s ADR-053) — Settings is where
 * this repo already puts account-scoped, infrequently-used affordances
 * (`DeleteAccount` sits in the exact same list). Direct structural copy of
 * `education-screen.tsx`: lazy import + `RemoteBoundary` + retry — the
 * exact, already-twice-proven mechanism, no new pattern invented.
 */
export function AdminScreen() {
  const [attempt, setAttempt] = useState(0);

  const handleRetry = useCallback(() => {
    setAttempt(current => current + 1);
  }, []);

  return (
    <RemoteBoundary key={attempt} onRetry={handleRetry}>
      <AdminRemoteApp />
    </RemoteBoundary>
  );
}
