import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { AdminHomeScreen } from '@/remotes/admin/screens/admin-home-screen';
import { SweepStatusScreen } from '@/remotes/admin/screens/sweep-status-screen';
import { ForceResultScreen } from '@/remotes/admin/screens/force-result-screen';
import { RevertOverrideScreen } from '@/remotes/admin/screens/revert-override-screen';
import type { AdminStackParamList } from '@/remotes/admin/navigation/admin-stack-params';

const AdminStack = createNativeStackNavigator<AdminStackParamList>();

/**
 * The `admin` remote's single exposed module (`./App`, ADR-057) — a
 * self-contained `NativeStackNavigator` owning all of admin's screens
 * internally, the same "remote owns its own internal screen graph, host
 * has zero compile-time knowledge of it" shape as `pools`/`education`
 * (ADR-032). The host mounts this via `lazy(() => import('admin/App'))`
 * wrapped in `RemoteBoundary` (`src/host/navigation/screens/admin-screen.tsx`).
 *
 * Relies on the host's `QueryClientProvider` (via `@tanstack/react-query`
 * being an MF shared singleton) and the host's `NavigationContainer`
 * (nested-navigator composition) — this component does not create either
 * itself.
 */
export default function AdminRemoteEntry() {
  const { t } = useTranslation();

  return (
    <AdminStack.Navigator>
      <AdminStack.Screen
        name="AdminHome"
        component={AdminHomeScreen}
        options={{ title: t('admin.screens.adminHome') }}
      />
      <AdminStack.Screen
        name="SweepStatus"
        component={SweepStatusScreen}
        options={{ title: t('admin.screens.sweepStatus') }}
      />
      <AdminStack.Screen
        name="ForceResult"
        component={ForceResultScreen}
        options={{ title: t('admin.screens.forceResult') }}
      />
      <AdminStack.Screen
        name="RevertOverride"
        component={RevertOverrideScreen}
        options={{ title: t('admin.screens.revertOverride') }}
      />
    </AdminStack.Navigator>
  );
}
