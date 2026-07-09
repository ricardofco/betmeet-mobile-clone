import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { MyPoolsScreen } from '@/remotes/pools/screens/my-pools-screen';
import { DiscoverPoolsScreen } from '@/remotes/pools/screens/discover-pools-screen';
import { CreatePoolScreen } from '@/remotes/pools/screens/create-pool-screen';
import { JoinByTokenScreen } from '@/remotes/pools/screens/join-by-token-screen';
import { PoolDetailScreen } from '@/remotes/pools/screens/pool-detail-screen';
import { PoolSettingsScreen } from '@/remotes/pools/screens/pool-settings-screen';
import { PoolPredictionsScreen } from '@/remotes/pools/screens/pool-predictions-screen';
import { PoolLeaderboardScreen } from '@/remotes/pools/screens/pool-leaderboard-screen';
import type { PoolsStackParamList } from '@/remotes/pools/navigation/pools-stack-params';

const PoolsStack = createNativeStackNavigator<PoolsStackParamList>();

/**
 * The `pools` remote's single exposed module (`./App`, ADR-032/ADR-034) —
 * a self-contained `NativeStackNavigator` owning all of pools' screens
 * internally. The host mounts this via
 * `lazy(() => import('pools/App'))` wrapped in `RemoteBoundary`, with zero
 * compile-time knowledge of the routes below.
 *
 * Relies on the host's `QueryClientProvider` (via `@tanstack/react-query`
 * being an MF shared singleton, ADR-034) and the host's
 * `NavigationContainer` (nested-navigator composition, standard React
 * Navigation) — this component does not create either itself.
 *
 * Post-Implement fix (2026-07-06, Layer 2 finding #3): every screen's
 * header `title` here was a literal English string, missed during Bolt 9's
 * Implement stage despite this remote being explicitly in-scope
 * (`implement-and-test.md §6`) — now sourced from `i18next` via the
 * `pools.screens.*` catalog keys (`src/platform/i18n/locales/{en,es}.ts`),
 * the same MF `i18next` shared singleton `MyPoolsScreen`'s own retrofit
 * already relies on (ADR-043).
 *
 * Change-2026-07-08 (item 4, header dedup): `main-tab-navigator.tsx`'s outer
 * `PoolsStackNavigator` already gives its single `Pools` route a header
 * (title `navigation.tabs.pools`, "Ligas"/"Leagues" — matching the tab bar
 * itself) with the `renderHeaderMenuButton` hamburger wired via `headerLeft`
 * (Bolt 9, ADR-042). Since that outer screen is a permanent host-side
 * wrapper around this entire nested navigator (it never re-renders per
 * inner route), its header was showing *stacked* on top of this navigator's
 * own `MyPools` root-screen header ("Mis ligas"/"My Pools") every time this
 * remote first mounted — a genuine nested-navigator double-header, not a
 * duplicated JSX heading. Fixed narrowly, scoped to exactly the reported
 * screen: only `MyPools` (this navigator's root) suppresses its own header
 * via `headerShown: false`, keeping the outer "Ligas" header + hamburger as
 * the single header shown there. Every other screen below (`DiscoverPools`,
 * `CreatePool`, etc.) is unaffected — they already push with their own
 * header + a native back button underneath the outer's persistent "Ligas"
 * header, exactly as before this fix (not reported broken, left unchanged).
 * `renderHeaderMenuButton`'s wiring is entirely untouched — it lives on the
 * outer screen, which still renders here.
 */
export default function PoolsRemoteEntry() {
  const { t } = useTranslation();

  return (
    <PoolsStack.Navigator>
      <PoolsStack.Screen
        name="MyPools"
        component={MyPoolsScreen}
        // Change-2026-07-08 (item 4): the outer host `PoolsStackNavigator`
        // already renders a header (title "Ligas"/"Leagues" + the hamburger
        // menu button) around this whole navigator — this root screen's own
        // header was a duplicate. See this file's header comment.
        options={{ title: t('pools.screens.myPools'), headerShown: false }}
      />
      <PoolsStack.Screen
        name="DiscoverPools"
        component={DiscoverPoolsScreen}
        options={{ title: t('pools.screens.discoverPools') }}
      />
      <PoolsStack.Screen
        name="CreatePool"
        component={CreatePoolScreen}
        options={{ title: t('pools.screens.createPool') }}
      />
      <PoolsStack.Screen
        name="JoinByToken"
        component={JoinByTokenScreen}
        options={{ title: t('pools.screens.joinByToken') }}
      />
      <PoolsStack.Screen
        name="PoolDetail"
        component={PoolDetailScreen}
        options={{ title: t('pools.screens.poolDetail') }}
      />
      <PoolsStack.Screen
        name="PoolSettings"
        component={PoolSettingsScreen}
        options={{ title: t('pools.screens.poolSettings') }}
      />
      <PoolsStack.Screen
        name="PoolPredictions"
        component={PoolPredictionsScreen}
        options={{ title: t('pools.screens.poolPredictions') }}
      />
      <PoolsStack.Screen
        name="PoolLeaderboard"
        component={PoolLeaderboardScreen}
        options={{ title: t('pools.screens.poolLeaderboard') }}
      />
    </PoolsStack.Navigator>
  );
}
