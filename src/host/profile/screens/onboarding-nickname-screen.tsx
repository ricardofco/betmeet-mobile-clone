import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NicknameForm } from '@/host/profile/components/nickname-form';
import { useOnboardingWizardContext } from '@/host/profile/screens/onboarding-wizard-screen';
import type { OnboardingStackParamList } from '@/host/profile/navigation/onboarding-stack-params';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingNickname'>;

/**
 * PROFILE-4's first wizard step — required (model.md §2.7,
 * `isStepRequired('nickname') === true`). Reuses `NicknameForm` in
 * `'onboarding'` mode (never cooldown-gated — this is the very first
 * assignment, model.md §2.2 row 1).
 */
export function OnboardingNicknameScreen({ navigation }: Props) {
  const wizard = useOnboardingWizardContext();

  const handleSubmitted = useCallback(() => {
    wizard.markDone('nickname');
    const next = wizard.advance();
    if (next && next !== 'complete') {
      navigation.navigate('OnboardingAvatar');
    }
  }, [navigation, wizard]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose a nickname</Text>
      <Text style={styles.body}>This is how other players will see you across leagues and rankings.</Text>
      <NicknameForm mode="onboarding" onSubmitted={handleSubmitted} />
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
