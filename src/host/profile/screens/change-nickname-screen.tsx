import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NicknameForm } from '@/host/profile/components/nickname-form';
import { useProfileQuery, useInvalidateProfileQuery } from '@/host/profile/hooks/use-profile-query';
import type { SettingsStackParamList } from '@/host/auth/navigation/auth-stack-params';

type Props = NativeStackScreenProps<SettingsStackParamList, 'ChangeNickname'>;

/**
 * PROFILE-5 — Settings' nickname-change screen. Reuses `NicknameForm` in
 * `'settings'` mode (cooldown-gated, ADR-011), fed by the same `['profile']`
 * TanStack Query the wizard's nickname step would have populated had this
 * user changed their nickname from there instead (design.md §4).
 */
export function ChangeNicknameScreen({ navigation }: Props) {
  const { data, isLoading } = useProfileQuery();
  const invalidateProfile = useInvalidateProfileQuery();

  const handleSubmitted = useCallback(() => {
    invalidateProfile();
    navigation.goBack();
  }, [invalidateProfile, navigation]);

  if (isLoading || !data) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <NicknameForm mode="settings" cooldown={data.cooldown} onSubmitted={handleSubmitted} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
