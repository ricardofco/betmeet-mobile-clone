import { useTranslation } from 'react-i18next';
import { XStack } from 'tamagui';
import { BodyText, Card, MutedText } from '@/shared/design/primitives';

/**
 * EDU-2's static scoring table (design.md §3/§4) — the calculator's
 * error-boundary fallback content. Reads only i18n copy (`scoring.*`), no
 * `ScoringRuleSet` values directly (the points are baked into the copy, same
 * as betmeet-clone's own `ScoringTable`). Education's OWN twin of
 * `OnboardingScoringSummary` (host, ADR-054) — no cross-boundary import.
 */
export function ScoringTable() {
  const { t } = useTranslation();

  const rows = [
    { label: t('scoring.exact'), points: t('scoring.exactPoints') },
    { label: t('scoring.result'), points: t('scoring.resultPoints') },
    { label: t('scoring.partial'), points: t('scoring.partialPoints') },
    { label: t('scoring.miss'), points: t('scoring.missPoints') },
    { label: t('scoring.penaltyBonus'), points: t('scoring.penaltyBonusPoints') },
  ];

  return (
    <Card testID="scoring-table" gap="$1">
      {rows.map(row => (
        <XStack key={row.label} justifyContent="space-between" paddingVertical="$1">
          <MutedText flex={1}>{row.label}</MutedText>
          <BodyText fontWeight="600">{row.points}</BodyText>
        </XStack>
      ))}
    </Card>
  );
}
