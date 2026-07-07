import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { XStack } from 'tamagui';
import { Card, Heading, MutedText, PrimaryButton, Screen } from '@/shared/design/primitives';
import type { HomeStackParamList } from '@/host/auth/navigation/auth-stack-params';

type Props = NativeStackScreenProps<HomeStackParamList, 'Home'>;

/**
 * Bolt 9 (ADR-042): the 3-button hub role (Predictions/Pools/Settings
 * buttons) is removed — redundant with the new tab bar/drawer. A minimal,
 * Tamagui-styled real landing screen.
 *
 * Bolt 12 (ADR-053): the Bolt-0 "load `education` remote" demo affordance
 * (an inline `showRemote` toggle rendering `RemoteBoundary` right here) is
 * replaced by a real `navigation.navigate('Education')` push — the lazy-
 * import + `RemoteBoundary` mechanism itself is relocated to
 * `education-screen.tsx`, not deleted (design.md §6.3). The still-open Layer
 * 2 item (kill the remote's dev server mid-session, confirm the retry UI)
 * now exercises against that new pushed screen instead of this inline block.
 */
export function HomeScreen({ navigation }: Props) {
  const { t } = useTranslation();

  const handleOpenRulesCenter = useCallback(() => {
    navigation.navigate('Education');
  }, [navigation]);

  return (
    <Screen>
      <Heading>{t('home.title')}</Heading>
      <Card>
        <MutedText>{t('home.subtitle')}</MutedText>
        <XStack justifyContent="flex-start">
          <PrimaryButton onPress={handleOpenRulesCenter}>{t('home.openRulesCenter')}</PrimaryButton>
        </XStack>
      </Card>
    </Screen>
  );
}
