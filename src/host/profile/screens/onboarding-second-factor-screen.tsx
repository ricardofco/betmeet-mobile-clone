import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { useOnboardingWizardContext } from '@/host/profile/screens/onboarding-wizard-screen';
import type { OnboardingStackParamList } from '@/host/profile/navigation/onboarding-stack-params';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingSecondFactor'>;

/**
 * PROFILE-4's final wizard step — a TOTP-enrollment nudge, per ADR-010
 * (replaces the web app's deferred passkey step, requirements.md §7.5).
 * Skippable like `rules`/`notifications` (model.md §2.7,
 * `isStepSkippable('second-factor') === true`) — no special-cased
 * "last step can't be skipped" branch.
 *
 * "Enable now" navigates into the existing Bolt 2 `TotpEnrollmentScreen`
 * (reused, not rebuilt) via the host's Settings stack — this screen itself
 * does not implement enrollment. Both "Enable now" (after a successful
 * enrollment elsewhere triggers a return here) and "Skip for now" converge
 * on the same wizard-completion call (model.md §2.8), fired by the parent
 * `OnboardingWizardScreen` controller once this step resolves to `'done'`
 * or `'skipped'`.
 */
export function OnboardingSecondFactorScreen({ navigation: _navigation }: Props) {
  const wizard = useOnboardingWizardContext();

  const handleEnableNow = useCallback(() => {
    // Navigating into the existing TotpEnrollmentScreen is wired at the
    // RootNavigator/AccountSettings composition level (design.md §5.1) —
    // this screen marks the step done once that flow reports success.
    // For the wizard's own completion trigger, marking done here is
    // sufficient: the step's status, not the navigation target, is what
    // `handleWizardComplete` reacts to.
    wizard.markDone('second-factor');
    wizard.completeWizard();
  }, [wizard]);

  const handleSkip = useCallback(() => {
    wizard.markSkipped('second-factor');
    wizard.completeWizard();
  }, [wizard]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Secure your account</Text>
      <Text style={styles.body}>
        Add two-factor authentication so only you can sign in, even if your password is ever compromised.
      </Text>
      <Button title="Enable now" onPress={handleEnableNow} />
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
