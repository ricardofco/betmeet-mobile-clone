import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { AvatarPicker } from '@/host/profile/components/avatar-picker';
import { useInvalidateProfileQuery } from '@/host/profile/hooks/use-profile-query';
import type { SettingsStackParamList } from '@/host/auth/navigation/auth-stack-params';

type Props = NativeStackScreenProps<SettingsStackParamList, 'ChangeAvatar'>;

/** PROFILE-5 — Settings' avatar-change screen. Reuses `AvatarPicker` (design.md §5.2). */
export function ChangeAvatarScreen({ navigation }: Props) {
  const invalidateProfile = useInvalidateProfileQuery();

  const handleSelected = useCallback(() => {
    invalidateProfile();
    navigation.goBack();
  }, [invalidateProfile, navigation]);

  return (
    <View style={styles.container}>
      <AvatarPicker mode="settings" onSelected={handleSelected} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
});
