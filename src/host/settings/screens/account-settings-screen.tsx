import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, StyleSheet } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';
import type { SettingsStackParamList } from '@/host/auth/navigation/auth-stack-params';
import { useProfileQuery } from '@/host/profile/hooks/use-profile-query';
import { useAdminAccessQuery } from '@/host/settings/hooks/use-admin-access-query';
import { Heading, MutedText, Screen } from '@/shared/design/primitives';

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
 *
 * Bolt 9 (NFR-10.4/10.5): strings extracted to `i18next`; rows composed from
 * `shared/design/primitives.tsx`'s themed Tamagui primitives + tokens
 * (never a literal hex/px value) — this drawer-hosted screen is one of this
 * bolt's in-scope retrofit targets (`implement-and-test.md §5`).
 */
export function AccountSettingsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { data: profile } = useProfileQuery();
  // ADMIN-1 (design.md §2.2 point 1, ADR-059) — advisory-only visibility
  // check; while loading, the row simply isn't rendered (no flash of a
  // wrong state), same "don't show, don't guess" discipline
  // `pool-detail-screen.tsx`'s conditional-button pattern already uses.
  const { data: adminAccess } = useAdminAccessQuery();

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

  const handleDeleteAccount = useCallback(() => {
    navigation.navigate('DeleteAccount');
  }, [navigation]);

  const handleOpenAdmin = useCallback(() => {
    navigation.navigate('Admin');
  }, [navigation]);

  return (
    <Screen gap="$0" padding="$0">
      <YStack padding="$4" gap="$0">
        <Heading marginBottom="$4">{t('settings.title')}</Heading>

        <SectionLabel>{t('settings.sections.profile')}</SectionLabel>

        <Row label={t('settings.rows.nickname')} onPress={handleChangeNickname}>
          <MutedText>{profile?.nickname ?? '—'}</MutedText>
        </Row>

        <Row label={t('settings.rows.avatar')} onPress={handleChangeAvatar}>
          {profile?.avatar.url ? (
            <Image source={{ uri: profile.avatar.url }} style={styles.avatarThumb} />
          ) : null}
        </Row>

        <Row label={t('settings.rows.language')} onPress={handleChangeLocale}>
          <MutedText>{profile?.locale ?? '—'}</MutedText>
        </Row>

        <SectionLabel>{t('settings.sections.account')}</SectionLabel>

        <Row label={t('settings.rows.changePassword')} onPress={handleChangePassword} />
        <Row label={t('settings.rows.changeEmail')} onPress={handleChangeEmail} />
        <Row label={t('settings.rows.twoFactor')} onPress={handleTotpEnrollment} />
        <Row label={t('settings.rows.deleteAccount')} onPress={handleDeleteAccount} danger />

        {/* ADMIN-1 (design.md §10) — genuinely invisible to the ~100% of
            users who aren't the seeded ADMIN account; not rendered at all
            while the check is pending or resolves false. */}
        {adminAccess?.isAdmin ? (
          <Row label={t('settings.rows.admin')} onPress={handleOpenAdmin} />
        ) : null}
      </YStack>
    </Screen>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <MutedText marginTop="$4" marginBottom="$1" fontSize="$1" fontWeight="600" textTransform="uppercase">
      {children}
    </MutedText>
  );
}

function Row({
  label,
  onPress,
  danger,
  children,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <XStack
      accessibilityRole="button"
      onPress={onPress}
      alignItems="center"
      justifyContent="space-between"
      paddingVertical="$3"
      borderBottomWidth={1}
      borderBottomColor="$borderColor"
    >
      <Text fontSize="$3" color={danger ? '$danger' : '$color'}>
        {label}
      </Text>
      <XStack alignItems="center" gap="$2">
        {children}
        <Text fontSize="$5" color="$colorMuted">
          ›
        </Text>
      </XStack>
    </XStack>
  );
}

const styles = StyleSheet.create({
  avatarThumb: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
});
