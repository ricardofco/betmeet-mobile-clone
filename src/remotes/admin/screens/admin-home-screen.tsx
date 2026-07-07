import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { YStack } from 'tamagui';
import { useAdminAccessQuery } from '@/remotes/admin/hooks/use-admin-access-query';
import { Card, ErrorState, Heading, LoadingState, Screen } from '@/shared/design/primitives';
import type { AdminStackParamList } from '@/remotes/admin/navigation/admin-stack-params';

type Props = NativeStackScreenProps<AdminStackParamList, 'AdminHome'>;

/**
 * ADMIN-1's second enforcement point (design.md §2.2 point 2, ADR-059) —
 * this remote's own independent mount-time re-check against
 * `admin.checkAccess`, NOT reusing whatever cached result the host's
 * Settings screen already had. Renders `LoadingState` while pending, an
 * explicit access-denied `ErrorState` with no further navigation if
 * `false`, and the real dashboard (three Card-style nav buttons) only if
 * `true`.
 */
export function AdminHomeScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { data, isLoading } = useAdminAccessQuery();

  const handleOpenSweep = useCallback(() => navigation.navigate('SweepStatus'), [navigation]);
  const handleOpenForceResult = useCallback(() => navigation.navigate('ForceResult'), [navigation]);
  const handleOpenRevertOverride = useCallback(() => navigation.navigate('RevertOverride'), [navigation]);

  if (isLoading) {
    return <LoadingState label={t('admin.home.loading')} />;
  }

  if (!data?.isAdmin) {
    return <ErrorState label={t('admin.home.accessDenied')} />;
  }

  return (
    <Screen>
      <Heading>{t('admin.home.title')}</Heading>

      <Card onPress={handleOpenSweep} accessibilityRole="button">
        <Heading fontSize="$4">{t('admin.home.sweepButton')}</Heading>
      </Card>

      <Card onPress={handleOpenForceResult} accessibilityRole="button">
        <Heading fontSize="$4">{t('admin.home.forceResultButton')}</Heading>
      </Card>

      <Card onPress={handleOpenRevertOverride} accessibilityRole="button">
        <Heading fontSize="$4">{t('admin.home.revertOverrideButton')}</Heading>
      </Card>

      <YStack flex={1} />
    </Screen>
  );
}
