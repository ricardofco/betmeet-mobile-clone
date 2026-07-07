import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home, Target, Trophy, Users } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { renderHeaderMenuButton } from '@/host/navigation/components/header-menu-button';
import { EducationScreen } from '@/host/navigation/screens/education-screen';
import { HomeScreen } from '@/host/navigation/screens/home-screen';
import { PoolsTabScreen } from '@/host/navigation/screens/pools-tab-screen';
import { PredictionsScreen } from '@/host/predictions/screens/predictions-screen';
import { RankingsScreen } from '@/host/rankings/screens/rankings-screen';
import type {
  HomeStackParamList,
  MainTabParamList,
  PoolsStackParamList,
  PredictionsStackParamList,
  RankingsStackParamList,
} from '@/host/auth/navigation/auth-stack-params';

/**
 * Bolt 9 (ADR-042) — one tab per primary module (`Home`/`Predictions`/
 * `Pools`), each owning its own native-stack so an in-module push always has
 * a native back affordance, independent of the tab bar. Every tab-root
 * screen's header renders `HeaderMenuButton` (`headerLeft`) to reach the
 * `Settings` drawer.
 *
 * Bolt 10 (ADR-048) adds a 4th tab, `Rankings` — same shape as the other
 * three (its own native-stack, one root screen, `HeaderMenuButton`), hosted
 * directly rather than shipped as a Module Federation remote. Tab order:
 * Home / Predictions / Pools / Rankings (newest last, cosmetic).
 *
 * Route names inside each stack are unchanged from Bolts 0-8
 * (`Home`/`Predictions`/`Pools`) — `screen-registry.ts` needs zero edits for
 * those three; `Rankings` is Bolt 10's one new addition there.
 *
 * Federation boundary, unaffected (system-context.md §7): `PoolsStack`'s
 * root screen (`PoolsTabScreen`) still mounts the `pools` remote's own
 * internal navigator (ADR-032/034) exactly as before — only the host-side
 * container around it changed, from an `AppStack` push to this tab's stack
 * root.
 *
 * `vercel-react-native-skills`: each stack navigator below is a static,
 * top-level component (not a factory recreated on every `MainTabNavigator`
 * render) — recreating navigator component identities on every render would
 * force React Navigation to remount the whole stack (losing history) any
 * time this component re-renders, e.g. on a language change.
 */
const Tab = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const PredictionsStack = createNativeStackNavigator<PredictionsStackParamList>();
const PoolsStack = createNativeStackNavigator<PoolsStackParamList>();
const RankingsStack = createNativeStackNavigator<RankingsStackParamList>();

// Post-Implement fix (2026-07-06, Layer 2 finding #1): without `tabBarIcon`,
// `@react-navigation/bottom-tabs` falls back to its own generic placeholder
// icon (the "downward triangle" the user saw on-device) — not a Tamagui
// artifact. `lucide-react-native` was chosen over the seemingly natural
// `@tamagui/lucide-icons` pairing after a real probe found the latter has no
// `2.x` release line at all (its latest, `1.144.4`, pulls in a whole nested
// `@tamagui/core@1.144.4`/`@tamagui/web@1.144.4` — a second, isolated
// Tamagui rendering engine with its own React Context, confirmed by
// inspecting `node_modules/@tamagui/lucide-icons/node_modules/@tamagui/`
// after installing it — icons built on that engine would not correctly
// resolve theme tokens from this app's real `TamaguiProvider`, since it's a
// different module instance entirely). `lucide-react-native` has zero
// dependencies of its own (peer deps only: react/react-native/
// react-native-svg, already installed and MF-shared since Bolt 8) — see the
// new ADR for the full probe record.
// Hoisted to module scope for the same `react/no-unstable-nested-components`
// reason as `renderHeaderMenuButton` above.
function renderHomeTabIcon({ color, size }: { color: string; size: number }) {
  return <Home color={color} size={size} />;
}

function renderPredictionsTabIcon({ color, size }: { color: string; size: number }) {
  return <Target color={color} size={size} />;
}

function renderPoolsTabIcon({ color, size }: { color: string; size: number }) {
  return <Users color={color} size={size} />;
}

function renderRankingsTabIcon({ color, size }: { color: string; size: number }) {
  return <Trophy color={color} size={size} />;
}

function HomeStackNavigator() {
  const { t } = useTranslation();
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: t('navigation.tabs.home'), headerLeft: renderHeaderMenuButton }}
      />
      {/* Bolt 12 (ADR-053) — a real push, not a tab root: no `headerLeft`
          menu button (this isn't a tab-root screen), a native back button is
          supplied automatically by the stack. */}
      <HomeStack.Screen
        name="Education"
        component={EducationScreen}
        options={{ title: t('rules.centerTitle') }}
      />
    </HomeStack.Navigator>
  );
}

function PredictionsStackNavigator() {
  const { t } = useTranslation();
  return (
    <PredictionsStack.Navigator>
      <PredictionsStack.Screen
        name="Predictions"
        component={PredictionsScreen}
        options={{ title: t('navigation.tabs.predictions'), headerLeft: renderHeaderMenuButton }}
      />
    </PredictionsStack.Navigator>
  );
}

function PoolsStackNavigator() {
  const { t } = useTranslation();
  return (
    <PoolsStack.Navigator>
      <PoolsStack.Screen
        name="Pools"
        component={PoolsTabScreen}
        options={{ title: t('navigation.tabs.pools'), headerLeft: renderHeaderMenuButton }}
      />
    </PoolsStack.Navigator>
  );
}

function RankingsStackNavigator() {
  const { t } = useTranslation();
  return (
    <RankingsStack.Navigator>
      <RankingsStack.Screen
        name="Rankings"
        component={RankingsScreen}
        options={{ title: t('navigation.tabs.rankings'), headerLeft: renderHeaderMenuButton }}
      />
    </RankingsStack.Navigator>
  );
}

export function MainTabNavigator() {
  const { t } = useTranslation();

  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{ title: t('navigation.tabs.home'), tabBarIcon: renderHomeTabIcon }}
      />
      <Tab.Screen
        name="PredictionsTab"
        component={PredictionsStackNavigator}
        options={{ title: t('navigation.tabs.predictions'), tabBarIcon: renderPredictionsTabIcon }}
      />
      <Tab.Screen
        name="PoolsTab"
        component={PoolsStackNavigator}
        options={{ title: t('navigation.tabs.pools'), tabBarIcon: renderPoolsTabIcon }}
      />
      <Tab.Screen
        name="RankingsTab"
        component={RankingsStackNavigator}
        options={{ title: t('navigation.tabs.rankings'), tabBarIcon: renderRankingsTabIcon }}
      />
    </Tab.Navigator>
  );
}
