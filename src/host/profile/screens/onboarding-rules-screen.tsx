import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { OnboardingScoringSummary } from '@/host/profile/components/onboarding-scoring-summary';
import { useOnboardingWizardContext } from '@/host/profile/screens/onboarding-wizard-screen';
import { Heading, MutedText, PrimaryButton, Screen } from '@/shared/design/primitives';
import type { OnboardingStackParamList } from '@/host/profile/navigation/onboarding-stack-params';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingRules'>;

/**
 * EDU-3's onboarding rules step (model.md §4, design.md §5) — skippable,
 * never blocks completion. Bolt 3's wizard skip/done/advance machinery
 * (`useOnboardingWizardContext`) is untouched; this bolt only replaces the
 * placeholder body with real content: title/description, a static
 * `OnboardingScoringSummary` (host's own twin of the education remote's
 * `ScoringTable`, ADR-054), and an informational (non-tappable) line about
 * the full Rules Center — **not** a live deep link into the `education`
 * remote (design.md §5.1): while the onboarding guard branch is mounted,
 * `AuthGatedNavigator` never mounts the `HomeStack`/`Education` route at all
 * (ADR-001), so there is no screen to navigate into yet.
 */
export function OnboardingRulesScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const wizard = useOnboardingWizardContext();

  const goToNext = useCallback(() => {
    const next = wizard.advance();
    if (next && next !== 'complete') {
      navigation.navigate('OnboardingNotifications');
    }
  }, [navigation, wizard]);

  const handleAcknowledge = useCallback(() => {
    wizard.markDone('rules');
    goToNext();
  }, [wizard, goToNext]);

  const handleSkip = useCallback(() => {
    wizard.markSkipped('rules');
    goToNext();
  }, [wizard, goToNext]);

  return (
    <Screen>
      <Heading>{t('onboarding.rulesStepTitle')}</Heading>
      <MutedText>{t('onboarding.rulesStepDescription')}</MutedText>
      <OnboardingScoringSummary />
      <MutedText>{t('onboarding.rulesStepReviewLater')}</MutedText>
      <PrimaryButton onPress={handleAcknowledge}>{t('common.continue')}</PrimaryButton>
      <PrimaryButton onPress={handleSkip}>{t('common.skipForNow')}</PrimaryButton>
    </Screen>
  );
}
