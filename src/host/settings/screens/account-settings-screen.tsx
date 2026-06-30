import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { SettingsStackParamList } from '@/host/auth/navigation/auth-stack-params';
import { useProfileQuery } from '@/host/profile/hooks/use-profile-query';

type Props = NativeStackScreenProps<SettingsStackParamList, 'AccountSettings'>;

/**
 * AUTH-5 / AUTH-3 / PROFILE-5 — entry point for authenticated
 * account-management flows. Bolt 3 adds a "Profile" section (nickname,
 * avatar, locale — PROFILE-1/2/3) above the existing auth-linked rows, all
 * composing PROFILE-1/2/3's reused flows rather than reimplementing them
 * (design.md §5.2, unit-brief.md's explicit composition-only rule):
 * - Nickname (PROFILE-1)
 * - Avatar (PROFILE-2)
 * - Locale (PROFILE-3)
 * - Change password / Change email (AUTH-5)
 * - Enable two-factor authentication / TOTP enrollment (AUTH-3)
 *
 * Screen class: `protected` — only reachable after full authentication
 * (aal1 + confirmed email, with no pending MFA challenge, and onboarding
 * complete).
 */
export function AccountSettingsScreen({ navigation }: Props) {
  const { data: profile } = useProfileQuery();

  const handleChangeNickname = useCallback(() => {
    navigation.navigate('ChangeNickname');
  }, [navigation]);

  const handleChangeAvatar = useCallback(() => {
    navigation.navigate('ChangeAvatar');
  }, [navigation]);

  const handleChangeLocale = useCallback(() => {
    navigation.navigate('ChangeLocale');
  }, [navigation]);

  const handleChangePassword = useCallback(() => {
    navigation.navigate('ChangePassword');
  }, [navigation]);

  const handleChangeEmail = useCallback(() => {
    navigation.navigate('ChangeEmail');
  }, [navigation]);

  const handleTotpEnrollment = useCallback(() => {
    navigation.navigate('TotpEnrollment');
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Account settings</Text>

      <Text style={styles.sectionLabel}>Profile</Text>

      <TouchableOpacity accessibilityRole="button" onPress={handleChangeNickname} style={styles.row}>
        <Text style={styles.rowLabel}>Nickname</Text>
        <View style={styles.rowValue}>
          <Text style={styles.rowValueText}>{profile?.nickname ?? '—'}</Text>
          <Text style={styles.rowChevron}>›</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity accessibilityRole="button" onPress={handleChangeAvatar} style={styles.row}>
        <Text style={styles.rowLabel}>Avatar</Text>
        <View style={styles.rowValue}>
          {profile?.avatar.url ? (
            <Image source={{ uri: profile.avatar.url }} style={styles.avatarThumb} />
          ) : null}
          <Text style={styles.rowChevron}>›</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity accessibilityRole="button" onPress={handleChangeLocale} style={styles.row}>
        <Text style={styles.rowLabel}>Language</Text>
        <View style={styles.rowValue}>
          <Text style={styles.rowValueText}>{profile?.locale ?? '—'}</Text>
          <Text style={styles.rowChevron}>›</Text>
        </View>
      </TouchableOpacity>

      <Text style={styles.sectionLabel}>Account</Text>

      <TouchableOpacity accessibilityRole="button" onPress={handleChangePassword} style={styles.row}>
        <Text style={styles.rowLabel}>Change password</Text>
        <Text style={styles.rowChevron}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity accessibilityRole="button" onPress={handleChangeEmail} style={styles.row}>
        <Text style={styles.rowLabel}>Change email</Text>
        <Text style={styles.rowChevron}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity accessibilityRole="button" onPress={handleTotpEnrollment} style={styles.row}>
        <Text style={styles.rowLabel}>Enable two-factor authentication</Text>
        <Text style={styles.rowChevron}>›</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 0,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  rowLabel: {
    fontSize: 16,
  },
  rowValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowValueText: {
    color: '#666',
  },
  avatarThumb: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  rowChevron: {
    fontSize: 20,
    color: '#999',
  },
});
