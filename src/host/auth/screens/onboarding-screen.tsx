import { StyleSheet, Text, View } from 'react-native';

/**
 * Route reserved per AUTH-7's rule 5 (`screen-registry.ts`) so the guard's
 * rule table is complete — the real wizard is `unit-02-profile` (Bolt 3).
 * This bolt only owns the binary `onboarding_completed` gate check, not the
 * wizard UI (unit-brief.md). Placeholder only.
 */
export function OnboardingScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Onboarding is coming soon.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  text: {
    textAlign: 'center',
  },
});
