import { useTranslation } from 'react-i18next';
import { XStack, YStack } from 'tamagui';
import { computeScore, type ScoringExample } from '@/shared/scoring';
import { ScoreBreakdownExplainer } from '@/remotes/education/components/score-breakdown-explainer';
import { BodyText, Card, Heading } from '@/shared/design/primitives';

type DemoCase = {
  label: string;
  example: ScoringExample;
};

/**
 * EDU-1's static worked examples (design.md §3, model.md §2) — the same 3
 * literal constants betmeet-clone hardcodes (`score-breakdown-demo.tsx`), fed
 * through the single-source `computeScore()` (`@/shared/scoring`, ADR-016) so
 * these can never drift from the real engine. Compile-time constants, not
 * fetched or configurable.
 */
const DEMOS: DemoCase[] = [
  {
    label: '2-1 / 2-1',
    example: {
      predictedHome: 2,
      predictedAway: 1,
      actualHome: 2,
      actualAway: 1,
      isKnockout: false,
    },
  },
  {
    label: '2-0 / 3-1',
    example: {
      predictedHome: 2,
      predictedAway: 0,
      actualHome: 3,
      actualAway: 1,
      isKnockout: false,
    },
  },
  {
    label: '1-1 / 1-1',
    example: {
      predictedHome: 1,
      predictedAway: 1,
      actualHome: 1,
      actualAway: 1,
      isKnockout: true,
      predictedPenaltyWinner: 'home',
      actualPenaltyWinner: 'home',
    },
  },
];

export function ScoreBreakdownDemo() {
  const { t } = useTranslation();

  return (
    <YStack gap="$3" testID="score-breakdown-demo">
      <Heading fontSize="$4">{t('rules.demoTitle')}</Heading>
      <XStack flexWrap="wrap" gap="$3">
        {DEMOS.map(demo => (
          <Card key={demo.label} flexGrow={1} flexBasis={0} minWidth={140}>
            <BodyText fontWeight="600">{demo.label}</BodyText>
            <ScoreBreakdownExplainer breakdown={computeScore(demo.example)} />
          </Card>
        ))}
      </XStack>
    </YStack>
  );
}
