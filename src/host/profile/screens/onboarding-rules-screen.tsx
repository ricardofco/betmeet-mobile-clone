import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { useOnboardingWizardContext } from '@/host/profile/screens/onboarding-wizard-screen';
import type { OnboardingStackParamList } from '@/host/profile/navigation/onboarding-stack-params';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingRules'>;

/**
 * PROFILE-4's `rules` step — skippable, never blocks completion
 * (model.md §2.7, §5). The actual rules content is owned by
 * `unit-09-education` (future remote) — this screen models only the
 * step's skip/done transition, mirroring Bolt 0/Bolt 1's established
 * "reserve the seam, don't build the feature early" placeholder pattern.
 */
export function OnboardingRulesScreen({ navigation }: Props) {
  const wizard = useOnboardingWizardContext();

  const goToNext = useCallback(() => {
    const next = wizard.advance();
    if (next && next !== 'complete') {
      navigation.navigate('OnboardingNotifications');
    }
  }, [navigation, wizard]);

  const handleAcknowledge = useCallback(() => {
    wizard.markDone('rules');
    goToNext();
  }, [wizard, goToNext]);

  const handleSkip = useCallback(() => {
    wizard.markSkipped('rules');
    goToNext();
  }, [wizard, goToNext]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>League rules</Text>
      <Text style={styles.body}>
        Rules content is coming soon (unit-09-education). You can review it anytime from the app.
      </Text>
      <Button title="Got it" onPress={handleAcknowledge} />
      <Button title="Skip for now" onPress={handleSkip} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  body: {
    color: '#555',
  },
});
