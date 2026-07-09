import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BookOpen, ChevronRight } from 'lucide-react-native';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme, YStack } from 'tamagui';
import { BodyText, Heading, MutedText, PressableCard, Row, Screen } from '@/shared/design/primitives';
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
 *
 * Change-2026-07-08 (item 2, on-demand-load architecture kept per the user's
 * own confirmed decision — ADR-052/053 unchanged, only the visual treatment
 * changes here): the old plain `PrimaryButton` inside a `Card` read as an
 * afterthought. This is now a single tappable feature row (icon + title +
 * description + chevron), the same "affordance card" language `ActionCard`
 * established for My Pools. Also drops `home.subtitle`'s leftover Bolt-0
 * debug copy ("Host bundle is running.") — never real product copy, just
 * never replaced.
 */
export function HomeScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  // `lucide-react-native` icons need a resolved color string, not a Tamagui
  // `$token` — same seam `my-pools-screen.tsx`'s `ActionCard` icons use.
  const iconColor = theme.color?.val ?? '#000000';
  const mutedIconColor = theme.colorMuted?.val ?? '#6B7280';

  const handleOpenRulesCenter = useCallback(() => {
    navigation.navigate('Education');
  }, [navigation]);

  return (
    <Screen>
      <Heading>{t('home.title')}</Heading>
      <PressableCard accessibilityRole="button" onPress={handleOpenRulesCenter}>
        <Row gap="$3" alignItems="center">
          <BookOpen color={iconColor} size={28} />
          <YStack flex={1} gap="$1">
            <BodyText fontWeight="600">{t('home.openRulesCenter')}</BodyText>
            <MutedText>{t('home.rulesCenterDescription')}</MutedText>
          </YStack>
          <ChevronRight color={mutedIconColor} size={20} />
        </Row>
      </PressableCard>
    </Screen>
  );
}
