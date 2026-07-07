import { useTranslation } from 'react-i18next';
import { XStack, YStack } from 'tamagui';
import type { ScoreBreakdown } from '@/shared/scoring';
import { BodyText, MutedText } from '@/shared/design/primitives';

type ScoreBreakdownExplainerProps = {
  breakdown: ScoreBreakdown;
};

const EXPLANATION_KEY: Record<ScoreBreakdown['explanationKey'], string> = {
  EXACT: 'breakdown.exact',
  RESULT: 'breakdown.result',
  PARTIAL: 'breakdown.partial',
  MISS: 'breakdown.miss',
};

/**
 * EDU-1/EDU-2's data-agnostic breakdown display (design.md §3/§4, ADR-054)
 * — education's OWN presentational twin of
 * `src/host/predictions/components/score-breakdown-panel.tsx`, richer
 * (separate `resultPoints`/`homeGoalPoints`/`awayGoalPoints` rows when not
 * `EXACT`), mirroring betmeet-clone's own `ScoreBreakdownExplainer`. Given a
 * computed `ScoreBreakdown` it renders the explanation, component breakdown,
 * penalty bonus, and total — no data fetching, no pool context.
 */
export function ScoreBreakdownExplainer({ breakdown }: ScoreBreakdownExplainerProps) {
  const { t } = useTranslation();

  return (
    <YStack gap="$2" testID="score-breakdown" accessibilityLiveRegion="polite">
      <MutedText>
        {t(EXPLANATION_KEY[breakdown.explanationKey])}
        {breakdown.penaltyApplied ? ` ${t('breakdown.penaltyApplied')}` : ''}
      </MutedText>
      <YStack gap="$1">
        {breakdown.components && breakdown.explanationKey !== 'EXACT' ? (
          <XStack justifyContent="space-between">
            <MutedText>{t('breakdown.resultPoints')}</MutedText>
            <BodyText>{`+${breakdown.components.resultPoints}`}</BodyText>
          </XStack>
        ) : null}
        {breakdown.components && breakdown.components.homeGoalPoints > 0 ? (
          <XStack justifyContent="space-between">
            <MutedText>{t('breakdown.homeGoalPoints')}</MutedText>
            <BodyText>{`+${breakdown.components.homeGoalPoints}`}</BodyText>
          </XStack>
        ) : null}
        {breakdown.components && breakdown.components.awayGoalPoints > 0 ? (
          <XStack justifyContent="space-between">
            <MutedText>{t('breakdown.awayGoalPoints')}</MutedText>
            <BodyText>{`+${breakdown.components.awayGoalPoints}`}</BodyText>
          </XStack>
        ) : null}
        <XStack justifyContent="space-between">
          <MutedText>{t('breakdown.base')}</MutedText>
          <BodyText>{breakdown.basePoints}</BodyText>
        </XStack>
        {breakdown.penaltyApplied ? (
          <XStack justifyContent="space-between">
            <MutedText>{t('breakdown.penalty')}</MutedText>
            <BodyText>{`+${breakdown.penaltyPoints}`}</BodyText>
          </XStack>
        ) : null}
        <XStack justifyContent="space-between" borderTopWidth={1} borderTopColor="$borderColor" paddingTop="$1">
          <BodyText fontWeight="700">{t('breakdown.total')}</BodyText>
          <BodyText fontWeight="700" testID="score-breakdown-total">
            {breakdown.totalPoints}
          </BodyText>
        </XStack>
      </YStack>
    </YStack>
  );
}
