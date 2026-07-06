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
 */
export default function PoolsRemoteEntry() {
  const { t } = useTranslation();

  return (
    <PoolsStack.Navigator>
      <PoolsStack.Screen
        name="MyPools"
        component={MyPoolsScreen}
        options={{ title: t('pools.screens.myPools') }}
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
