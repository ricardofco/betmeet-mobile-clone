import { useTranslation } from 'react-i18next';
import { XStack } from 'tamagui';
import { BodyText, Card, MutedText } from '@/shared/design/primitives';

/**
 * EDU-3's static rule→points table (design.md §5/§7, ADR-054) — host's OWN
 * independent twin of the `education` remote's `ScoringTable`
 * (`src/remotes/education/components/scoring-table.tsx`). Both render the
 * same 5-row list from the same `scoring.*` i18n copy, but neither imports
 * the other — they sit on opposite sides of a Module Federation boundary
 * (host vs. remote), same "independent twins" policy already applied to
 * `ScoreBreakdownPanel`/`ScoreBreakdownExplainer`.
 */
export function OnboardingScoringSummary() {
  const { t } = useTranslation();

  const rows = [
    { label: t('scoring.exact'), points: t('scoring.exactPoints') },
    { label: t('scoring.result'), points: t('scoring.resultPoints') },
    { label: t('scoring.partial'), points: t('scoring.partialPoints') },
    { label: t('scoring.miss'), points: t('scoring.missPoints') },
    { label: t('scoring.penaltyBonus'), points: t('scoring.penaltyBonusPoints') },
  ];

  return (
    <Card testID="onboarding-scoring-summary" gap="$1">
      {rows.map(row => (
        <XStack key={row.label} justifyContent="space-between" paddingVertical="$1">
          <MutedText flex={1}>{row.label}</MutedText>
          <BodyText fontWeight="600">{row.points}</BodyText>
        </XStack>
      ))}
    </Card>
  );
}
