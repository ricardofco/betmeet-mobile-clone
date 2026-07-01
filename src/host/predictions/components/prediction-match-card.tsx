import { memo, useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { TeamBadge, LiveIndicator } from '@/shared/competition';
import { PredictionScoreInput } from '@/host/predictions/components/prediction-score-input';
import { PenaltyWinnerSelector } from '@/host/predictions/components/penalty-winner-selector';
import { ScoreBreakdownPanel } from '@/host/predictions/components/score-breakdown-panel';
import {
  buildScoreBreakdown,
  canShowScoreBreakdown,
  describeLockReason,
  getPredictionEligibility,
  shouldShowPenaltyWinnerSelector,
  validatePredictionEntry,
  type MatchWithMyPrediction,
  type PenaltyWinner,
} from '@/domain/predictions';
import { isLiveStatus, describeMatchStatus, describeTeamSlot } from '@/domain/competition';
import type { SavePredictionInput } from '@/platform/backend-api/predictions-api';

type PredictionMatchCardProps = {
  row: MatchWithMyPrediction;
  now: string;
  onSave: (input: SavePredictionInput) => void;
  isSaving: boolean;
};

function formatKickoffTime(kickoffAt: string | null): string {
  if (!kickoffAt) return 'TBD';
  return new Date(kickoffAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

/**
 * One prediction-capable match row (PREDICTIONS-1/2/5). This is the
 * prediction-entry equivalent of Bolt 5's read-only `MatchCard` — see
 * ADR-025 for why it is a separate component rather than an extension of
 * `MatchCard` itself.
 *
 * Per-row edit-draft state (`homeScore`/`awayScore`/`penaltyWinner`) is
 * local `useState`, not Zustand and not cached in a query (design.md §5 —
 * mirrors ADR-020's reasoning for `LiveSubscriptionState`: single-owner,
 * single-consumer, ephemeral UI state). This also means typing in one row
 * never re-renders sibling rows (`vercel-react-native-skills` hot-path
 * discipline, ADR-022/ADR-025 precedent) since the draft never lives above
 * this component.
 *
 * `getPredictionEligibility()` is evaluated on every render against the
 * caller-supplied `now` (ADR-023: advisory-only, never the actual gate —
 * the backend/DB trigger are the real enforcement).
 */
function PredictionMatchCardComponent({ row, now, onSave, isSaving }: PredictionMatchCardProps) {
  const { match, prediction, isKnockout } = row;

  const [homeScore, setHomeScore] = useState<number | null>(prediction?.homeScore ?? null);
  const [awayScore, setAwayScore] = useState<number | null>(prediction?.awayScore ?? null);
  const [penaltyWinner, setPenaltyWinner] = useState<PenaltyWinner>(prediction?.penaltyWinner ?? null);

  const eligibility = useMemo(() => getPredictionEligibility(match, now), [match, now]);
  const editable = eligibility.editable;

  const showPenaltySelector = useMemo(
    () =>
      editable &&
      homeScore !== null &&
      awayScore !== null &&
      shouldShowPenaltyWinnerSelector(homeScore, awayScore, isKnockout),
    [editable, homeScore, awayScore, isKnockout],
  );

  const validation = useMemo(() => {
    if (homeScore === null || awayScore === null) {
      return { valid: false as const, errors: [] };
    }
    return validatePredictionEntry({ homeScore, awayScore, penaltyWinner }, isKnockout);
  }, [homeScore, awayScore, penaltyWinner, isKnockout]);

  const canSave = editable && homeScore !== null && awayScore !== null && validation.valid;

  const handleSave = useCallback(() => {
    if (!canSave || homeScore === null || awayScore === null) return;
    onSave({
      matchId: match.id,
      poolId: null,
      homeScore,
      awayScore,
      penaltyWinner,
    });
  }, [canSave, homeScore, awayScore, penaltyWinner, match.id, onSave]);

  const showBreakdown = canShowScoreBreakdown(match) && prediction !== null;
  const breakdown = showBreakdown
    ? buildScoreBreakdown({ match, prediction: prediction!, isKnockout })
    : null;

  const statusDisplay = describeMatchStatus(match.status);
  const live = isLiveStatus(match.status);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.kickoff}>{formatKickoffTime(match.kickoffAt)}</Text>
        {live ? <LiveIndicator /> : <Text style={styles.statusLabel}>{statusDisplay.label}</Text>}
      </View>

      <View style={styles.teams}>
        <TeamBadge team={match.homeTeam} align="home" />
        <View style={styles.inputsRow}>
          <PredictionScoreInput label="Home" value={homeScore} onChange={setHomeScore} editable={editable} />
          <Text style={styles.separator}>–</Text>
          <PredictionScoreInput label="Away" value={awayScore} onChange={setAwayScore} editable={editable} />
        </View>
        <TeamBadge team={match.awayTeam} align="away" />
      </View>

      {showPenaltySelector ? (
        <PenaltyWinnerSelector
          homeLabel={describeTeamSlot(match.homeTeam)}
          awayLabel={describeTeamSlot(match.awayTeam)}
          value={penaltyWinner}
          onChange={setPenaltyWinner}
          editable={editable}
        />
      ) : null}

      {!editable ? (
        <Text style={styles.lockCopy}>{describeLockReason(eligibility.reason)}</Text>
      ) : (
        <Pressable
          accessibilityRole="button"
          disabled={!canSave || isSaving}
          onPress={handleSave}
          style={[styles.saveButton, (!canSave || isSaving) && styles.saveButtonDisabled]}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>{prediction ? 'Update prediction' : 'Save prediction'}</Text>
          )}
        </Pressable>
      )}

      {breakdown ? <ScoreBreakdownPanel breakdown={breakdown} /> : null}
    </View>
  );
}

export const PredictionMatchCard = memo(PredictionMatchCardComponent);

const styles = StyleSheet.create({
  card: {
    padding: 12,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kickoff: {
    fontSize: 12,
    color: '#6B7280',
  },
  statusLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  teams: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  separator: {
    fontSize: 16,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  lockCopy: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  saveButton: {
    backgroundColor: '#2563EB',
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
