import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { TeamBadge, LiveIndicator } from '@/shared/competition';
import { PredictionScoreInput } from '@/host/predictions/components/prediction-score-input';
import { PenaltyWinnerSelector } from '@/host/predictions/components/penalty-winner-selector';
import { ScoreBreakdownPanel } from '@/host/predictions/components/score-breakdown-panel';
import { PoolOverridePicker } from '@/host/predictions/components/pool-override-picker';
import {
  buildScoreBreakdown,
  canShowScoreBreakdown,
  describeLockReason,
  getPredictionEligibility,
  shouldOfferDualSave,
  shouldShowPenaltyWinnerSelector,
  validatePredictionEntry,
  type MatchWithMyPrediction,
  type MyPrediction,
  type PenaltyWinner,
} from '@/domain/predictions';
import { isLiveStatus, describeMatchStatus, describeTeamSlot } from '@/domain/competition';
import type { PoolPickerEntry } from '@/domain/pools';
import type { SavePredictionInput } from '@/platform/backend-api/predictions-api';

type PredictionMatchCardProps = {
  row: MatchWithMyPrediction;
  now: string;
  onSave: (input: SavePredictionInput) => void;
  isSaving: boolean;
  /** Bolt 8 (PREDICTIONS-3) — the viewer's own pool memberships, for the
   * override picker. Empty for a viewer with no pools — the picker then
   * renders nothing (design.md §5). */
  pools: PoolPickerEntry[];
  /** This match's pool-scoped predictions (any pool), for pre-filling an
   * existing override's values and deciding whether "reset" applies. */
  poolOverrides: MyPrediction[];
  onResetOverride: (input: { matchId: string; poolId: string }) => void;
  isResettingOverride: boolean;
};

function formatKickoffTime(kickoffAt: string | null, tbdLabel: string): string {
  if (!kickoffAt) return tbdLabel;
  return new Date(kickoffAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

/**
 * One prediction-capable match row (PREDICTIONS-1/2/5, extended by Bolt 8
 * for PREDICTIONS-3/4). This is the prediction-entry equivalent of Bolt 5's
 * read-only `MatchCard` — see ADR-025 for why it is a separate component
 * rather than an extension of `MatchCard` itself.
 *
 * Per-row edit-draft state (`homeScore`/`awayScore`/`penaltyWinner`, and now
 * `selectedPoolId`/`dualSaveChecked`) is local `useState`, not Zustand and
 * not cached in a query (design.md §5/§6 — mirrors ADR-020's reasoning:
 * single-owner, single-consumer, ephemeral UI state). This also means
 * picking a pool or typing in one row never re-renders sibling rows
 * (`vercel-react-native-skills` hot-path discipline, ADR-022/ADR-025
 * precedent) since the draft never lives above this component.
 *
 * `getPredictionEligibility()` is evaluated on every render against the
 * caller-supplied `now` (ADR-023: advisory-only, never the actual gate —
 * the backend/DB trigger are the real enforcement).
 */
function PredictionMatchCardComponent({
  row,
  now,
  onSave,
  isSaving,
  pools,
  poolOverrides,
  onResetOverride,
  isResettingOverride,
}: PredictionMatchCardProps) {
  const { t } = useTranslation();
  const { match, prediction, isKnockout } = row;

  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  const [dualSaveChecked, setDualSaveChecked] = useState(false);
  const [homeScore, setHomeScore] = useState<number | null>(prediction?.homeScore ?? null);
  const [awayScore, setAwayScore] = useState<number | null>(prediction?.awayScore ?? null);
  const [penaltyWinner, setPenaltyWinner] = useState<PenaltyWinner>(prediction?.penaltyWinner ?? null);

  const overrideForSelectedPool = useMemo(
    () => (selectedPoolId ? (poolOverrides.find(p => p.poolId === selectedPoolId) ?? null) : null),
    [selectedPoolId, poolOverrides],
  );

  const handleSelectPool = useCallback(
    (poolId: string | null) => {
      setSelectedPoolId(poolId);
      setDualSaveChecked(false);
      if (poolId === null) {
        setHomeScore(prediction?.homeScore ?? null);
        setAwayScore(prediction?.awayScore ?? null);
        setPenaltyWinner(prediction?.penaltyWinner ?? null);
        return;
      }
      // Pre-fill from the existing override if there is one, else from the
      // current global prediction (matches betmeet-clone's real
      // `handleStartEdit` pre-fill behavior — model.md §6).
      const override = poolOverrides.find(p => p.poolId === poolId) ?? null;
      const source = override ?? prediction;
      setHomeScore(source?.homeScore ?? null);
      setAwayScore(source?.awayScore ?? null);
      setPenaltyWinner(source?.penaltyWinner ?? null);
    },
    [prediction, poolOverrides],
  );

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

  // PREDICTIONS-3 (model.md §6): dual-save is only offered when neither a
  // global nor an override exists yet for the selected pool.
  const offerDualSave =
    selectedPoolId !== null &&
    shouldOfferDualSave({ hasGlobal: prediction !== null, hasOverride: overrideForSelectedPool !== null });

  // model.md §5's web-parity rule: "reset to global" only makes sense when
  // both an override AND a global prediction exist.
  const canReset = selectedPoolId !== null && overrideForSelectedPool !== null && prediction !== null;

  const handleSave = useCallback(() => {
    if (!canSave || homeScore === null || awayScore === null) return;
    onSave({
      matchId: match.id,
      poolId: selectedPoolId,
      homeScore,
      awayScore,
      penaltyWinner,
      ...(selectedPoolId !== null && offerDualSave && dualSaveChecked ? { alsoSaveAsGlobal: true } : {}),
    });
  }, [canSave, homeScore, awayScore, penaltyWinner, match.id, onSave, selectedPoolId, offerDualSave, dualSaveChecked]);

  const handleReset = useCallback(() => {
    if (!selectedPoolId) return;
    onResetOverride({ matchId: match.id, poolId: selectedPoolId });
  }, [selectedPoolId, match.id, onResetOverride]);

  const showBreakdown = canShowScoreBreakdown(match) && prediction !== null;
  const breakdown = showBreakdown
    ? buildScoreBreakdown({ match, prediction: prediction!, isKnockout })
    : null;

  const statusDisplay = describeMatchStatus(match.status);
  const live = isLiveStatus(match.status);

  // Bolt 10 (design.md §8) — additive-only: a small "Scored"/"Pending" badge
  // reading the backend-authoritative `pointsStatus`. NOT_SCORED renders no
  // badge (the common no-prediction-yet case, where a badge would be noise).
  // Does not touch `canShowScoreBreakdown`/`buildScoreBreakdown` above.
  const pointsStatusLabel =
    prediction?.pointsStatus === 'SCORED'
      ? t('predictions.matchCard.scored')
      : prediction?.pointsStatus === 'PENDING_SCORING'
        ? t('predictions.matchCard.pending')
        : null;

  const saveButtonLabel =
    selectedPoolId === null
      ? prediction
        ? t('predictions.matchCard.updatePrediction')
        : t('predictions.matchCard.savePrediction')
      : overrideForSelectedPool
        ? t('predictions.matchCard.updateOverride')
        : t('predictions.matchCard.saveOverride');

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.kickoff}>{formatKickoffTime(match.kickoffAt, t('predictions.matchCard.tbd'))}</Text>
        <View style={styles.headerBadges}>
          {pointsStatusLabel ? (
            <View style={styles.pointsStatusBadge}>
              <Text style={styles.pointsStatusBadgeText}>{pointsStatusLabel}</Text>
            </View>
          ) : null}
          {live ? (
            <LiveIndicator />
          ) : (
            <Text style={styles.statusLabel}>{t(`matchStatus.${statusDisplay.labelKey}`)}</Text>
          )}
        </View>
      </View>

      <View style={styles.teams}>
        <TeamBadge team={match.homeTeam} align="home" />
        <View style={styles.inputsRow}>
          <PredictionScoreInput
            label={t('predictions.matchCard.homeLabel')}
            value={homeScore}
            onChange={setHomeScore}
            editable={editable}
          />
          <Text style={styles.separator}>–</Text>
          <PredictionScoreInput
            label={t('predictions.matchCard.awayLabel')}
            value={awayScore}
            onChange={setAwayScore}
            editable={editable}
          />
        </View>
        <TeamBadge team={match.awayTeam} align="away" />
      </View>

      <PoolOverridePicker pools={pools} selectedPoolId={selectedPoolId} onSelect={handleSelectPool} />

      {showPenaltySelector ? (
        <PenaltyWinnerSelector
          homeLabel={describeTeamSlot(match.homeTeam)}
          awayLabel={describeTeamSlot(match.awayTeam)}
          value={penaltyWinner}
          onChange={setPenaltyWinner}
          editable={editable}
        />
      ) : null}

      {offerDualSave ? (
        <View style={styles.dualSaveRow}>
          <Text style={styles.dualSaveLabel}>{t('predictions.matchCard.alsoSaveGlobal')}</Text>
          <Switch
            accessibilityLabel="Also save as my global prediction"
            value={dualSaveChecked}
            onValueChange={setDualSaveChecked}
            disabled={!editable}
          />
        </View>
      ) : null}

      {canReset ? (
        <Pressable accessibilityRole="button" onPress={handleReset} disabled={isResettingOverride}>
          <Text style={styles.resetText}>
            {isResettingOverride ? t('predictions.matchCard.resetting') : t('predictions.matchCard.useGlobalPrediction')}
          </Text>
        </Pressable>
      ) : null}

      {!editable ? (
        <Text style={styles.lockCopy}>{t(`predictions.lockReason.${describeLockReason(eligibility.reason)}`)}</Text>
      ) : (
        <Pressable
          accessibilityRole="button"
          disabled={!canSave || isSaving}
          onPress={handleSave}
          style={[styles.saveButton, (!canSave || isSaving) && styles.saveButtonDisabled]}
        >
          {isSaving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveButtonText}>{saveButtonLabel}</Text>}
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
  headerBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  pointsStatusBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    backgroundColor: '#ECFDF5',
  },
  pointsStatusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
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
  dualSaveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dualSaveLabel: {
    fontSize: 12,
    color: '#374151',
    flexShrink: 1,
  },
  resetText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '600',
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
