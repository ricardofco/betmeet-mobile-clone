import { StyleSheet, Text, View } from 'react-native';
import { LocaleSwitch } from '@/host/profile/components/locale-switch';

/** PROFILE-5 / PROFILE-3 — Settings' locale-change screen. Reuses `LocaleSwitch` (design.md §5.2). */
export function ChangeLocaleScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Language</Text>
      <LocaleSwitch />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
});
