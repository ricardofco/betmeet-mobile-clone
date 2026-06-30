import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { useOnboardingWizardContext } from '@/host/profile/screens/onboarding-wizard-screen';
import type { OnboardingStackParamList } from '@/host/profile/navigation/onboarding-stack-params';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingNotifications'>;

/**
 * PROFILE-4's `notifications` step — skippable, never blocks completion
 * (model.md §2.7, §5). The actual push-permission/subscription logic is
 * owned by `unit-08-notifications` (future) — this screen only models the
 * step's skip/done transition and surfaces the "opts into all 5
 * notification types if completed, not skipped" fact for that future
 * capability to consume (model.md §5) — not implemented here.
 */
export function OnboardingNotificationsScreen({ navigation }: Props) {
  const wizard = useOnboardingWizardContext();

  const goToNext = useCallback(() => {
    const next = wizard.advance();
    if (next && next !== 'complete') {
      navigation.navigate('OnboardingSecondFactor');
    }
  }, [navigation, wizard]);

  const handleEnable = useCallback(() => {
    wizard.markDone('notifications');
    goToNext();
  }, [wizard, goToNext]);

  const handleSkip = useCallback(() => {
    wizard.markSkipped('notifications');
    goToNext();
  }, [wizard, goToNext]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Stay in the loop</Text>
      <Text style={styles.body}>
        Notification preferences are coming soon (unit-08-notifications). You can manage them anytime from
        Settings.
      </Text>
      <Button title="Enable notifications" onPress={handleEnable} />
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
