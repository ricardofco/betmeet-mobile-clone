import { StyleSheet, Text, View } from 'react-native';

/**
 * Placeholder for `unit-09-education`'s remote (Rules Center + scoring
 * calculator — bolt-plan.md Bolt 11). This bolt (0) only proves the
 * Module Federation host→remote wiring works end-to-end; the real content
 * (EDU-1 through EDU-4) lands when Bolt 11 opens. Do not add real Education
 * content here outside that bolt.
 */
export default function EducationRemoteEntry() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Education remote loaded successfully ✅</Text>
      <Text style={styles.subtext}>(placeholder — real content lands in Bolt 11)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
  },
  text: {
    fontWeight: '600',
  },
  subtext: {
    marginTop: 4,
    fontSize: 12,
    color: '#666',
  },
});
