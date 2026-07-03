import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { lazy, useCallback, useEffect, useRef, useState } from 'react';
import { Button, Linking, StyleSheet, Text, View } from 'react-native';
import { RemoteBoundary } from '@/host/remote-boundary';
import { AuthGatedNavigator } from '@/host/auth/navigation/auth-gated-navigator';
import { AccountSettingsScreen } from '@/host/settings/screens/account-settings-screen';
import { ChangePasswordScreen } from '@/host/settings/screens/change-password-screen';
import { ChangeEmailScreen } from '@/host/settings/screens/change-email-screen';
import { TotpEnrollmentScreen } from '@/host/settings/screens/totp-enrollment-screen';
import { ChangeNicknameScreen } from '@/host/profile/screens/change-nickname-screen';
import { ChangeAvatarScreen } from '@/host/profile/screens/change-avatar-screen';
import { ChangeLocaleScreen } from '@/host/profile/screens/change-locale-screen';
import { DeleteAccountScreen } from '@/host/settings/screens/delete-account-screen';
import { PredictionsScreen } from '@/host/predictions/screens/predictions-screen';
import { getSupabaseAdapter } from '@/platform/supabase/supabase-adapter';
import { parseDeepLink } from '@/domain/auth/parse-deep-link';
import type { AppStackParamList, SettingsStackParamList } from '@/host/auth/navigation/auth-stack-params';

/**
 * ADR-003: React Navigation (native-stack) is the navigation library.
 * ADR-001 (Bolt 1): `AuthGatedNavigator` is the root's first child.
 * Bolt 2: adds SettingsStack inside the authenticated app tree, and wires
 * the deep-link handler (ADR-005) for OAuth callbacks and password-reset
 * links.
 * Bolt 6 (design.md §4): registers `Predictions` directly on `AppStack`
 * (host-placed, `requirements.md §7.4`) — the first bolt to mount Bolt 5's
 * fixture-derived UI on a real, reachable screen.
 * Bolt 7 (design.md §4/§5, ADR-032/ADR-034): registers `Pools` on
 * `AppStack`, mounting the `pools` remote's single exposed `./App` module
 * (a self-contained nested navigator) via `lazy` + `RemoteBoundary` — same
 * on-demand-download wiring shape as the `education` remote (Bolt 0), the
 * first real feature remote since then.
 *
 * Deep links are handled imperatively below (`Linking.getInitialURL()` +
 * `Linking.addEventListener`), not via `NavigationContainer`'s `linking`
 * prop — that prop defers rendering `children` until its own async initial-
 * URL resolution completes, which stalls `AuthGatedNavigator` behind a second,
 * redundant linking pipeline. Passing `linking` here previously caused the
 * app to hang on a blank screen.
 */

const AppStack = createNativeStackNavigator<AppStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();

// Loaded lazily so the host bundle never pays for the remote's code until
// the user actually requests it (ADR-002).
const EducationRemoteApp = lazy(() => import('education/App'));
// Bolt 7 (ADR-032/ADR-034) — the pools remote, same on-demand pattern.
const PoolsRemoteApp = lazy(() => import('pools/App'));

function SettingsStackNavigator() {
  return (
    <SettingsStack.Navigator>
      <SettingsStack.Screen
        name="AccountSettings"
        component={AccountSettingsScreen}
        options={{ title: 'Account settings' }}
      />
      <SettingsStack.Screen
        name="ChangeNickname"
        component={ChangeNicknameScreen}
        options={{ title: 'Nickname' }}
      />
      <SettingsStack.Screen
        name="ChangeAvatar"
        component={ChangeAvatarScreen}
        options={{ title: 'Avatar' }}
      />
      <SettingsStack.Screen
        name="ChangeLocale"
        component={ChangeLocaleScreen}
        options={{ title: 'Language' }}
      />
      <SettingsStack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{ title: 'Change password' }}
      />
      <SettingsStack.Screen
        name="ChangeEmail"
        component={ChangeEmailScreen}
        options={{ title: 'Change email' }}
      />
      <SettingsStack.Screen
        name="TotpEnrollment"
        component={TotpEnrollmentScreen}
        options={{ title: 'Two-factor authentication' }}
      />
      <SettingsStack.Screen
        name="DeleteAccount"
        component={DeleteAccountScreen}
        options={{ title: 'Delete account' }}
      />
    </SettingsStack.Navigator>
  );
}

type HomeScreenProps = NativeStackScreenProps<AppStackParamList, 'Home'>;

function HomeScreen({ navigation }: HomeScreenProps) {
  const [showRemote, setShowRemote] = useState(false);

  const handleLoadRemote = useCallback(() => {
    setShowRemote(true);
  }, []);

  const handleRetryRemote = useCallback(() => {
    setShowRemote(false);
  }, []);

  const handleGoToPredictions = useCallback(() => {
    navigation.navigate('Predictions');
  }, [navigation]);

  const handleGoToPools = useCallback(() => {
    navigation.navigate('Pools');
  }, [navigation]);

  const handleGoToSettings = useCallback(() => {
    navigation.navigate('Settings');
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Liga Mundial</Text>
      <Button title="Predictions" onPress={handleGoToPredictions} />
      <Button title="Pools" onPress={handleGoToPools} />
      <Button title="Settings" onPress={handleGoToSettings} />
      <Text style={styles.subtitle}>
        Host bundle is running. Tap below to load the federated `education` remote.
      </Text>
      <Button title="Load education remote" onPress={handleLoadRemote} />
      {showRemote ? (
        <View style={styles.remoteContainer}>
          <RemoteBoundary onRetry={handleRetryRemote}>
            <EducationRemoteApp />
          </RemoteBoundary>
        </View>
      ) : null}
    </View>
  );
}

/**
 * Wraps the `pools` remote's exposed `./App` module in `RemoteBoundary`
 * (design.md §8, ADR-032) — same graceful-fallback pattern every remote
 * mount uses (ADR-002), so a failed chunk download shows a retry
 * affordance instead of crashing the host. `key` forces a fresh `Suspense`
 * boundary on retry, matching `RemoteBoundary`'s own retry contract.
 */
function PoolsScreen() {
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

function AppTree() {
  return (
    <AppStack.Navigator>
      <AppStack.Screen name="Home" component={HomeScreen} options={{ title: 'Liga Mundial' }} />
      <AppStack.Screen
        name="Predictions"
        component={PredictionsScreen}
        options={{ title: 'Predictions' }}
      />
      <AppStack.Screen
        name="Pools"
        component={PoolsScreen}
        options={{ title: 'Pools', headerShown: false }}
      />
      <AppStack.Screen
        name="Settings"
        component={SettingsStackNavigator}
        options={{ title: 'Settings', headerShown: false }}
      />
    </AppStack.Navigator>
  );
}

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
      <AuthGatedNavigator renderAppTree={() => <AppTree />} />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 12,
  },
  remoteContainer: {
    marginTop: 24,
    minHeight: 80,
    width: '100%',
  },
});
