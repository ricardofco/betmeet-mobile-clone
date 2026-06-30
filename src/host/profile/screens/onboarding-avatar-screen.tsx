import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AvatarPicker } from '@/host/profile/components/avatar-picker';
import { useOnboardingWizardContext } from '@/host/profile/screens/onboarding-wizard-screen';
import type { OnboardingStackParamList } from '@/host/profile/navigation/onboarding-stack-params';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingAvatar'>;

/**
 * PROFILE-4's second wizard step — required (model.md §2.7,
 * `isStepRequired('avatar') === true`). Reuses `AvatarPicker`.
 */
export function OnboardingAvatarScreen({ navigation }: Props) {
  const wizard = useOnboardingWizardContext();

  const handleSelected = useCallback(() => {
    wizard.markDone('avatar');
    const next = wizard.advance();
    if (next && next !== 'complete') {
      navigation.navigate('OnboardingRules');
    }
  }, [navigation, wizard]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pick an avatar</Text>
      <AvatarPicker mode="onboarding" onSelected={handleSelected} />
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
});
