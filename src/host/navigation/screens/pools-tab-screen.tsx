import { lazy, useCallback, useState } from 'react';
import { RemoteBoundary } from '@/host/remote-boundary';

// Bolt 7 (ADR-032/ADR-034) — the pools remote, unchanged on-demand pattern.
const PoolsRemoteApp = lazy(() => import('pools/App'));

/**
 * Wraps the `pools` remote's exposed `./App` module in `RemoteBoundary`
 * (ADR-032) — same graceful-fallback pattern every remote mount uses
 * (ADR-002), so a failed chunk download shows a retry affordance instead of
 * crashing the host. `key` forces a fresh `Suspense` boundary on retry,
 * matching `RemoteBoundary`'s own retry contract.
 *
 * Bolt 9 (ADR-042): this is now the root screen of the `PoolsTab`'s own
 * native-stack (previously a direct `AppStack` push with `headerShown:
 * false` and no back affordance — NFR-10.3's confirmed defect). As a
 * tab-root screen it doesn't need a "back to Home" affordance (there's no
 * forward-push relationship to Home) — the structural fix `model.md §4`
 * describes.
 */
export function PoolsTabScreen() {
  const [attempt, setAttempt] = useState(0);

  const handleRetry = useCallback(() => {
    setAttempt(current => current + 1);
  }, []);

  return (
    <RemoteBoundary key={attempt} onRetry={handleRetry}>
      <PoolsRemoteApp />
    </RemoteBoundary>
  );
}
