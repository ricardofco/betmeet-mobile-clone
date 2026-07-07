import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TextInput } from 'react-native';
import { XStack, YStack } from 'tamagui';
import { derivePenaltyWinner } from '@/shared/scoring';
import { validateForceResultReason, validateForceResultScoreBounds } from '@/domain/admin';
import type { AdminMatchRow } from '@/domain/admin';
import type { ForceMatchResultInput } from '@/platform/backend-api/admin-api';
import { BodyText, Card, MutedText, PrimaryButton } from '@/shared/design/primitives';

function clampScore(text: string): number {
  const parsed = Number.parseInt(text, 10);
  if (Number.isNaN(parsed) || parsed < 0) return 0;
  return parsed;
}

type ScoreInputProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
};

/** Mirrors EDU-2's `GoalInput` (`scoring-calculator.tsx`) — a Tamagui-wrapped
 * `TextInput`, no new dependency, duplicated rather than imported across the
 * host/remote boundary (same class of deliberate duplication as ADR-037). */
function ScoreInput({ label, value, onChange }: ScoreInputProps) {
  const handleChangeText = useCallback((text: string) => onChange(clampScore(text)), [onChange]);

  return (
    <YStack alignItems="center" gap="$1">
      <MutedText fontSize="$1">{label}</MutedText>
      <TextInput
        value={String(value)}
        onChangeText={handleChangeText}
        keyboardType="number-pad"
        maxLength={2}
        accessibilityLabel={label}
        style={scoreInputStyle}
      />
    </YStack>
  );
}

const scoreInputStyle = {
  width: 48,
  height: 44,
  borderWidth: 1,
  borderColor: '#D1D5DB',
  borderRadius: 6,
  textAlign: 'center' as const,
  fontSize: 16,
  fontWeight: '600' as const,
};

export type ForceResultFormValues = Omit<ForceMatchResultInput, 'matchId'>;

type ForceResultFormProps = {
  match: AdminMatchRow;
  onSubmit: (values: ForceResultFormValues) => void;
  isSubmitting: boolean;
};

/**
 * ADMIN-4 (design.md §5.2/§6.2, model.md §5) — score/penalty-score
 * `TextInput`s, a penalty-winner display that is DERIVED, never entered
 * (reuses `@/shared/scoring`'s `derivePenaltyWinner()` for a live preview,
 * same pattern as EDU-2's calculator — BR-7.16's own invariant: the admin
 * cannot supply a winner that disagrees with the shootout score they
 * themselves entered), and a mandatory multiline `reason` field (1-500
 * chars). Client-side validation here is a UX nicety ONLY — the backend
 * independently re-validates and re-derives everything regardless
 * (ADR-059).
 */
export function ForceResultForm({ match, onSubmit, isSubmitting }: ForceResultFormProps) {
  const { t } = useTranslation();
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [homePenaltyScore, setHomePenaltyScore] = useState(0);
  const [awayPenaltyScore, setAwayPenaltyScore] = useState(0);
  const [reason, setReason] = useState('');

  const showPenalty = match.isKnockout && homeScore === awayScore;
  const derivedWinner = showPenalty ? derivePenaltyWinner(homePenaltyScore, awayPenaltyScore) : null;
  const penaltyWinnerTeamId =
    derivedWinner === 'home' ? match.homeTeamId : derivedWinner === 'away' ? match.awayTeamId : null;

  const canSubmit = useMemo(() => {
    if (!validateForceResultScoreBounds(homeScore, awayScore)) return false;
    if (!validateForceResultReason(reason)) return false;
    if (showPenalty && derivedWinner === null) return false;
    return true;
  }, [homeScore, awayScore, reason, showPenalty, derivedWinner]);

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    onSubmit({
      homeScore,
      awayScore,
      homePenaltyScore: showPenalty ? homePenaltyScore : null,
      awayPenaltyScore: showPenalty ? awayPenaltyScore : null,
      penaltyWinnerTeamId: showPenalty ? penaltyWinnerTeamId : null,
      reason: reason.trim(),
    });
  }, [canSubmit, onSubmit, homeScore, awayScore, homePenaltyScore, awayPenaltyScore, showPenalty, penaltyWinnerTeamId, reason]);

  return (
    <Card gap="$4">
      <BodyText fontWeight="600">
        {match.fifaHome ?? '???'} vs {match.fifaAway ?? '???'}
      </BodyText>

      <XStack gap="$4">
        <ScoreInput label={t('admin.forceResult.homeScore')} value={homeScore} onChange={setHomeScore} />
        <ScoreInput label={t('admin.forceResult.awayScore')} value={awayScore} onChange={setAwayScore} />
      </XStack>

      {showPenalty ? (
        <YStack gap="$2" borderWidth={1} borderColor="$borderColor" borderRadius="$3" padding="$3">
          <BodyText fontWeight="600">{t('admin.forceResult.penaltyShootout')}</BodyText>
          <XStack gap="$4">
            <ScoreInput
              label={t('admin.forceResult.homePenaltyScore')}
              value={homePenaltyScore}
              onChange={setHomePenaltyScore}
            />
            <ScoreInput
              label={t('admin.forceResult.awayPenaltyScore')}
              value={awayPenaltyScore}
              onChange={setAwayPenaltyScore}
            />
          </XStack>
          <MutedText testID="force-result-penalty-winner">
            {derivedWinner === null
              ? t('admin.forceResult.penaltyShootout')
              : `${t('admin.forceResult.penaltyWinner')}: ${
                  derivedWinner === 'home' ? match.fifaHome : match.fifaAway
                }`}
          </MutedText>
        </YStack>
      ) : null}

      <YStack gap="$1">
        <MutedText>{t('admin.forceResult.reasonLabel')}</MutedText>
        <TextInput
          value={reason}
          onChangeText={setReason}
          placeholder={t('admin.forceResult.reasonPlaceholder')}
          multiline
          numberOfLines={3}
          maxLength={500}
          accessibilityLabel={t('admin.forceResult.reasonLabel')}
          style={reasonInputStyle}
        />
      </YStack>

      <PrimaryButton onPress={handleSubmit} disabled={!canSubmit || isSubmitting}>
        {t('admin.forceResult.submitButton')}
      </PrimaryButton>
    </Card>
  );
}

const reasonInputStyle = {
  minHeight: 72,
  borderWidth: 1,
  borderColor: '#D1D5DB',
  borderRadius: 6,
  padding: 10,
  fontSize: 14,
  textAlignVertical: 'top' as const,
};
