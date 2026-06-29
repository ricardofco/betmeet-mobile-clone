import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { lazy, useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { RemoteBoundary } from '@/host/remote-boundary';

/**
 * ADR-003: React Navigation (native-stack) is the navigation library.
 * This is a placeholder root — unit-01-auth's AUTH-7 bolt replaces `HomeScreen`
 * with the real navigation-guard-gated tree (sign-in / onboarding / app).
 * Bolt 0's job is only to prove: (a) a native-stack navigator mounts, and
 * (b) a Module-Federation remote (education) can be loaded on demand with a
 * graceful fallback if it can't.
 */
const Stack = createNativeStackNavigator();

// Loaded lazily so the host bundle never pays for the remote's code until
// the user actually requests it (ADR-002).
const EducationRemoteApp = lazy(() => import('education/App'));

function HomeScreen() {
  const [showRemote, setShowRemote] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Platform scaffolding — Bolt 0</Text>
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

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Liga Mundial' }} />
      </Stack.Navigator>
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
