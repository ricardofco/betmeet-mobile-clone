import { NavigationContainer } from '@react-navigation/native';
import { useEffect, useRef } from 'react';
import { Linking } from 'react-native';
import { AuthGatedNavigator } from '@/host/auth/navigation/auth-gated-navigator';
import { RootDrawerNavigator } from '@/host/navigation/root-drawer-navigator';
import { getSupabaseAdapter } from '@/platform/supabase/supabase-adapter';
import { parseDeepLink } from '@/domain/auth/parse-deep-link';

/**
 * ADR-003: React Navigation (native-stack) is the navigation library.
 * ADR-001 (Bolt 1): `AuthGatedNavigator` is the root's first child.
 * Bolt 2: adds SettingsStack inside the authenticated app tree, and wires
 * the deep-link handler (ADR-005) for OAuth callbacks and password-reset
 * links.
 * Bolt 6 (design.md §4): registers `Predictions` (host-placed,
 * `requirements.md §7.4`) — the first bolt to mount Bolt 5's fixture-derived
 * UI on a real, reachable screen.
 * Bolt 7 (design.md §4/§5, ADR-032/ADR-034): registers `Pools`, mounting the
 * `pools` remote's single exposed `./App` module (a self-contained nested
 * navigator) via `lazy` + `RemoteBoundary` — same on-demand-download wiring
 * shape as the `education` remote (Bolt 0), the first real feature remote
 * since then.
 * Bolt 9 (ADR-042): the flat `AppStack` is replaced by a nested
 * Drawer → Tabs → per-tab-stack shell (`RootDrawerNavigator`) — see that
 * module for the full shape. `AuthGatedNavigator`'s `renderAppTree` contract
 * is unaffected; only what it renders internally changed.
 *
 * Deep links are handled imperatively below (`Linking.getInitialURL()` +
 * `Linking.addEventListener`), not via `NavigationContainer`'s `linking`
 * prop — that prop defers rendering `children` until its own async initial-
 * URL resolution completes, which stalls `AuthGatedNavigator` behind a second,
 * redundant linking pipeline. Passing `linking` here previously caused the
 * app to hang on a blank screen.
 */

/**
 * The deep-link handler called by both `Linking.getInitialURL()` (cold start)
 * and `Linking.addEventListener('url', ...)` (foreground/background).
 *
 * Uses `parseDeepLink` (domain pure function) to classify the URL, then calls
 * the appropriate `SupabaseAdapter` method (ADR-005).
 */
async function handleDeepLink(url: string | null): Promise<void> {
  if (!url) return;
  const payload = parseDeepLink(url);

  if (payload.kind === 'oauth-callback') {
    await getSupabaseAdapter().handleOAuthCallback(payload.rawUrl);
    // `onSessionChange` fires → Zustand store updates → AuthGatedNavigator
    // re-renders to the correct branch. No explicit navigation needed.
    return;
  }

  if (payload.kind === 'password-reset') {
    await getSupabaseAdapter().exchangePasswordResetToken(payload.tokenHash);
    // `onSessionChange` fires with the recovery session → AuthGatedNavigator
    // renders UnauthenticatedTree → the deep-link navigation to SetNewPassword
    // must happen after the tree is mounted. A short session-change will
    // re-render the navigator; screen navigation is handled from the tree.
    // For now the user lands on SignIn — they can type their password; a full
    // navigation-to-SetNewPassword requires a navigation ref which is wired
    // in a follow-up if needed. The token exchange establishes the session
    // which unlocks `setNewPassword`.
    return;
  }
  // UnknownPayload — silently ignored.
}

export function RootNavigator() {
  const initialUrlProcessed = useRef(false);

  useEffect(() => {
    // Cold-start deep link: app launched by tapping a deep link.
    if (!initialUrlProcessed.current) {
      initialUrlProcessed.current = true;
      Linking.getInitialURL().then(handleDeepLink).catch(() => {});
    }

    // Foreground deep link: app already running.
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url).catch(() => {});
    });

    return () => subscription.remove();
  }, []);

  return (
    <NavigationContainer>
      <AuthGatedNavigator renderAppTree={() => <RootDrawerNavigator />} />
    </NavigationContainer>
  );
}
