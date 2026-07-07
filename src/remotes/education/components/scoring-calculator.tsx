import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TextInput } from 'react-native';
import { XStack, YStack } from 'tamagui';
import { computeScore, derivePenaltyWinner, type ScoringExample } from '@/shared/scoring';
import { ScoreBreakdownExplainer } from '@/remotes/education/components/score-breakdown-explainer';
import { BodyText, Card, Heading, MutedText } from '@/shared/design/primitives';

function clampGoals(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 0) return 0;
  return parsed;
}

type GoalInputProps = {
  visibleLabel: string;
  accessibilityLabel: string;
  value: number;
  onChange: (value: number) => void;
};

/**
 * EDU-2's numeric input (design.md §4) — a Tamagui-wrapped `TextInput`, no
 * native stepper component, no new dependency. Mirrors
 * `src/host/predictions/components/prediction-score-input.tsx`'s clamp
 * discipline.
 */
function GoalInput({ visibleLabel, accessibilityLabel, value, onChange }: GoalInputProps) {
  const handleChangeText = useCallback(
    (text: string) => onChange(clampGoals(text)),
    [onChange],
  );

  return (
    <YStack alignItems="center" gap="$1">
      <MutedText fontSize="$1">{visibleLabel}</MutedText>
      <TextInput
        value={String(value)}
        onChangeText={handleChangeText}
        keyboardType="number-pad"
        maxLength={2}
        accessibilityLabel={accessibilityLabel}
        style={goalInputStyle}
      />
    </YStack>
  );
}

const goalInputStyle = {
  width: 44,
  height: 40,
  borderWidth: 1,
  borderColor: '#D1D5DB',
  borderRadius: 6,
  textAlign: 'center' as const,
  fontSize: 16,
  fontWeight: '600' as const,
};

/**
 * EDU-2 — the interactive scoring calculator (model.md §3, design.md §4).
 * Pure client-side preview that reuses `computeScore()`/`derivePenaltyWinner()`
 * (`@/shared/scoring`) — never redefines the algorithm (ADR-016's gate).
 * Non-mutating: no `BackendApiClient` call anywhere in this component tree
 * (model.md §7).
 */
export function ScoringCalculator() {
  const { t } = useTranslation();
  const [predictedHome, setPredictedHome] = useState(2);
  const [predictedAway, setPredictedAway] = useState(2);
  const [actualHome, setActualHome] = useState(2);
  const [actualAway, setActualAway] = useState(2);
  const [isKnockout, setIsKnockout] = useState(true);
  const [predictedPenaltyHome, setPredictedPenaltyHome] = useState(4);
  const [predictedPenaltyAway, setPredictedPenaltyAway] = useState(3);
  const [actualPenaltyHome, setActualPenaltyHome] = useState(4);
  const [actualPenaltyAway, setActualPenaltyAway] = useState(2);

  // Penalties are only available for a knockout tied at full time.
  const showPenalty = isKnockout && actualHome === actualAway;

  const derivedPredictedPenaltyWinner = derivePenaltyWinner(predictedPenaltyHome, predictedPenaltyAway);
  const derivedActualPenaltyWinner = derivePenaltyWinner(actualPenaltyHome, actualPenaltyAway);
  const predictedPenaltyTie = showPenalty && derivedPredictedPenaltyWinner === null;
  const actualPenaltyTie = showPenalty && derivedActualPenaltyWinner === null;

  const breakdown = useMemo(() => {
    const example: ScoringExample = {
      predictedHome,
      predictedAway,
      actualHome,
      actualAway,
      isKnockout,
      predictedPenaltyWinner: showPenalty ? derivedPredictedPenaltyWinner : null,
      actualPenaltyWinner: showPenalty ? derivedActualPenaltyWinner : null,
    };
    return computeScore(example);
  }, [
    predictedHome,
    predictedAway,
    actualHome,
    actualAway,
    isKnockout,
    showPenalty,
    derivedPredictedPenaltyWinner,
    derivedActualPenaltyWinner,
  ]);

  const toggleKnockout = useCallback(() => setIsKnockout(current => !current), []);

  return (
    <Card testID="scoring-calculator" gap="$4">
      <YStack gap="$1">
        <Heading fontSize="$4">{t('calculator.title')}</Heading>
        <MutedText>{t('calculator.description')}</MutedText>
      </YStack>

      <XStack gap="$6" flexWrap="wrap">
        <YStack gap="$2">
          <BodyText fontWeight="600">{t('calculator.prediction')}</BodyText>
          <XStack gap="$3">
            <GoalInput
              visibleLabel={t('calculator.home')}
              accessibilityLabel={`${t('calculator.prediction')} – ${t('calculator.home')}`}
              value={predictedHome}
              onChange={setPredictedHome}
            />
            <GoalInput
              visibleLabel={t('calculator.away')}
              accessibilityLabel={`${t('calculator.prediction')} – ${t('calculator.away')}`}
              value={predictedAway}
              onChange={setPredictedAway}
            />
          </XStack>
        </YStack>
        <YStack gap="$2">
          <BodyText fontWeight="600">{t('calculator.actual')}</BodyText>
          <XStack gap="$3">
            <GoalInput
              visibleLabel={t('calculator.home')}
              accessibilityLabel={`${t('calculator.actual')} – ${t('calculator.home')}`}
              value={actualHome}
              onChange={setActualHome}
            />
            <GoalInput
              visibleLabel={t('calculator.away')}
              accessibilityLabel={`${t('calculator.actual')} – ${t('calculator.away')}`}
              value={actualAway}
              onChange={setActualAway}
            />
          </XStack>
        </YStack>
      </XStack>

      <XStack
        accessible
        accessibilityRole="switch"
        accessibilityState={{ checked: isKnockout }}
        accessibilityLabel={t('calculator.knockout')}
        testID="calculator-knockout"
        onPress={toggleKnockout}
        alignItems="center"
        gap="$2"
      >
        <BodyText>{isKnockout ? '☑' : '☐'}</BodyText>
        <BodyText>{t('calculator.knockout')}</BodyText>
      </XStack>

      {showPenalty ? (
        <YStack gap="$2" borderWidth={1} borderColor="$borderColor" borderRadius="$3" padding="$3">
          <BodyText fontWeight="600">{t('calculator.penaltyShootout')}</BodyText>
          <MutedText>{t('calculator.penaltyBonusHint')}</MutedText>
          <XStack gap="$6" flexWrap="wrap">
            <YStack gap="$2">
              <MutedText>{t('calculator.prediction')}</MutedText>
              <XStack gap="$3">
                <GoalInput
                  visibleLabel={t('calculator.home')}
                  accessibilityLabel={`${t('calculator.penaltyShootout')} ${t('calculator.prediction')} – ${t('calculator.home')}`}
                  value={predictedPenaltyHome}
                  onChange={setPredictedPenaltyHome}
                />
                <GoalInput
                  visibleLabel={t('calculator.away')}
                  accessibilityLabel={`${t('calculator.penaltyShootout')} ${t('calculator.prediction')} – ${t('calculator.away')}`}
                  value={predictedPenaltyAway}
                  onChange={setPredictedPenaltyAway}
                />
              </XStack>
              {predictedPenaltyTie ? (
                <MutedText accessibilityRole="alert" testID="calculator-predicted-penalty-tie">
                  {t('calculator.penaltyTie')}
                </MutedText>
              ) : (
                <MutedText testID="calculator-predicted-penalty-winner">
                  {t('calculator.penaltyDerivedWinner')}{' '}
                  {derivedPredictedPenaltyWinner === 'home' ? t('calculator.home') : t('calculator.away')}
                </MutedText>
              )}
            </YStack>
            <YStack gap="$2">
              <MutedText>{t('calculator.actual')}</MutedText>
              <XStack gap="$3">
                <GoalInput
                  visibleLabel={t('calculator.home')}
                  accessibilityLabel={`${t('calculator.penaltyShootout')} ${t('calculator.actual')} – ${t('calculator.home')}`}
                  value={actualPenaltyHome}
                  onChange={setActualPenaltyHome}
                />
                <GoalInput
                  visibleLabel={t('calculator.away')}
                  accessibilityLabel={`${t('calculator.penaltyShootout')} ${t('calculator.actual')} – ${t('calculator.away')}`}
                  value={actualPenaltyAway}
                  onChange={setActualPenaltyAway}
                />
              </XStack>
              {actualPenaltyTie ? (
                <MutedText accessibilityRole="alert" testID="calculator-actual-penalty-tie">
                  {t('calculator.penaltyTie')}
                </MutedText>
              ) : (
                <MutedText testID="calculator-actual-penalty-winner">
                  {t('calculator.penaltyDerivedWinner')}{' '}
                  {derivedActualPenaltyWinner === 'home' ? t('calculator.home') : t('calculator.away')}
                </MutedText>
              )}
            </YStack>
          </XStack>
        </YStack>
      ) : null}

      <YStack borderWidth={1} borderColor="$borderColor" borderRadius="$3" padding="$3" gap="$2">
        <BodyText fontWeight="600">{t('calculator.total')}</BodyText>
        <ScoreBreakdownExplainer breakdown={breakdown} />
      </YStack>
    </Card>
  );
}
