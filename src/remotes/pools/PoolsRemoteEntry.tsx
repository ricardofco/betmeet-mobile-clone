import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MyPoolsScreen } from '@/remotes/pools/screens/my-pools-screen';
import { DiscoverPoolsScreen } from '@/remotes/pools/screens/discover-pools-screen';
import { CreatePoolScreen } from '@/remotes/pools/screens/create-pool-screen';
import { JoinByTokenScreen } from '@/remotes/pools/screens/join-by-token-screen';
import { PoolDetailScreen } from '@/remotes/pools/screens/pool-detail-screen';
import { PoolSettingsScreen } from '@/remotes/pools/screens/pool-settings-screen';
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
 */
export default function PoolsRemoteEntry() {
  return (
    <PoolsStack.Navigator>
      <PoolsStack.Screen name="MyPools" component={MyPoolsScreen} options={{ title: 'My pools' }} />
      <PoolsStack.Screen
        name="DiscoverPools"
        component={DiscoverPoolsScreen}
        options={{ title: 'Discover pools' }}
      />
      <PoolsStack.Screen name="CreatePool" component={CreatePoolScreen} options={{ title: 'Create pool' }} />
      <PoolsStack.Screen name="JoinByToken" component={JoinByTokenScreen} options={{ title: 'Join by code' }} />
      <PoolsStack.Screen name="PoolDetail" component={PoolDetailScreen} options={{ title: 'Pool' }} />
      <PoolsStack.Screen
        name="PoolSettings"
        component={PoolSettingsScreen}
        options={{ title: 'Pool settings' }}
      />
    </PoolsStack.Navigator>
  );
}
