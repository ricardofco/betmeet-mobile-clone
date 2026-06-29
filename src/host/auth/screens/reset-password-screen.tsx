import { StyleSheet, Text, View } from 'react-native';

/**
 * Route reserved per AUTH-7's rule 2 (`screen-registry.ts`) so the guard's
 * rule table is complete — the real flow is AUTH-4 (Bolt 2), explicitly out
 * of scope for this bolt. Placeholder only.
 */
export function ResetPasswordScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Password reset is coming soon.</Text>
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
