import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { lazy, useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { RemoteBoundary } from '@/host/remote-boundary';
import { AuthGatedNavigator } from '@/host/auth/navigation/auth-gated-navigator';
import type { AppStackParamList } from '@/host/auth/navigation/auth-stack-params';

/**
 * ADR-003: React Navigation (native-stack) is the navigation library.
 * ADR-001 (Bolt 1): `AuthGatedNavigator` is the root's first child — it
 * decides which screen tree exists at all (unauthenticated / verify-email /
 * onboarding / protected app) per AUTH-7's guard. `AppStack` below is the
 * protected tree, rendered only once the guard says "proceed" (rule 6) or
 * lets a pending-MFA session through (rule 4's exception). The Bolt 0
 * education-remote demo is preserved here, inside the now-protected tree,
 * rather than removed — it remains reachable once signed in.
 */
const AppStack = createNativeStackNavigator<AppStackParamList>();

// Loaded lazily so the host bundle never pays for the remote's code until
// the user actually requests it (ADR-002).
const EducationRemoteApp = lazy(() => import('education/App'));

function HomeScreen() {
  const [showRemote, setShowRemote] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Liga Mundial</Text>
      <Text style={styles.subtitle}>
        Host bundle is running. Tap below to load the federated `education` remote.
      </Text>
      <Button title="Load education remote" onPress={() => setShowRemote(true)} />
      {showRemote ? (
        <View style={styles.remoteContainer}>
          <RemoteBoundary onRetry={() => setShowRemote(false)}>
            <EducationRemoteApp />
          </RemoteBoundary>
        </View>
      ) : null}
    </View>
  );
}

function AppTree() {
  return (
    <AppStack.Navigator>
      <AppStack.Screen name="Home" component={HomeScreen} options={{ title: 'Liga Mundial' }} />
    </AppStack.Navigator>
  );
}

export function RootNavigator() {
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
