import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { PoolScoreStepper } from '@/remotes/pools/components/pool-score-stepper';
import type { PoolMemberPredictionCell } from '@/platform/backend-api/pools-api';

type PredictionGridCellProps = {
  cell: PoolMemberPredictionCell | undefined;
  nickname: string | null;
  isViewer: boolean;
  /** True only for the viewer's own row on a still-editable match
   * (model.md §5 — masking never applies to the viewer's own row; edit
   * eligibility is the separate kickoff-lock rule, PREDICTIONS-1). */
  canEdit: boolean;
  onSave: (homeScore: number, awayScore: number) => void;
  onReset: () => void;
  isSaving: boolean;
  isResetting: boolean;
};

/**
 * POOLS-6 — one member's row for one match (model.md §5/§8). Renders one
 * of: hidden (`cell.hidden`), no prediction (`cell` absent), a read-only
 * score, or — only for the viewer's own editable row — an inline editor
 * using the deliberately-duplicated `PoolScoreStepper` (ADR-037).
 *
 * @invariant Never renders `cell.predictedHome`/`predictedAway`/
 * `totalPoints`/`matchedCase` when `cell.hidden` is true — those fields are
 * already `null` on the wire by the time they reach this component
 * (ADR-038), this is presentational-only, not a second masking layer.
 */
function PredictionGridCellComponent({
  cell,
  nickname,
  isViewer,
  canEdit,
  onSave,
  onReset,
  isSaving,
  isResetting,
}: PredictionGridCellProps) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [draftHome, setDraftHome] = useState(cell?.predictedHome ?? 0);
  const [draftAway, setDraftAway] = useState(cell?.predictedAway ?? 0);

  const handleStartEdit = useCallback(() => {
    setDraftHome(cell?.predictedHome ?? 0);
    setDraftAway(cell?.predictedAway ?? 0);
    setIsEditing(true);
  }, [cell]);

  const handleCancel = useCallback(() => setIsEditing(false), []);

  const handleSave = useCallback(() => {
    onSave(draftHome, draftAway);
    setIsEditing(false);
  }, [onSave, draftHome, draftAway]);

  const hasPrediction = cell !== undefined && cell.predictedHome !== null && cell.predictedAway !== null;
  const canReset = isViewer && cell?.isOverride === true && cell?.hasGlobal === true;

  if (isEditing) {
    return (
      <View style={styles.row} testID="prediction-grid-cell-editing">
        <Text style={styles.nickname}>{nickname ?? t('pools.gridCell.unnamedMember')}</Text>
        <View style={styles.editRow}>
          <PoolScoreStepper label={t('pools.gridCell.home')} value={draftHome} onChange={setDraftHome} />
          <PoolScoreStepper label={t('pools.gridCell.away')} value={draftAway} onChange={setDraftAway} />
        </View>
        <View style={styles.editActions}>
          <Pressable accessibilityRole="button" onPress={handleCancel} disabled={isSaving}>
            <Text style={styles.cancelText}>{t('pools.gridCell.cancel')}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={handleSave} disabled={isSaving} style={styles.saveButton}>
            {isSaving ? <ActivityIndicator size="small" /> : <Text style={styles.saveButtonText}>{t('pools.gridCell.save')}</Text>}
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <Text style={styles.nickname}>{nickname ?? t('pools.gridCell.unnamedMember')}</Text>
      {cell?.hidden ? (
        <Text style={styles.mutedText}>{t('pools.gridCell.hiddenUntilKickoff')}</Text>
      ) : hasPrediction ? (
        <View style={styles.scoreRow}>
          <Text style={styles.scoreText}>
            {cell!.predictedHome} - {cell!.predictedAway}
          </Text>
          {cell!.isOverride ? <Text style={styles.overrideBadge}>{t('pools.gridCell.override')}</Text> : null}
          {cell!.totalPoints !== null ? (
            <Text style={styles.pointsBadge}>{t('pools.gridCell.points', { count: cell!.totalPoints })}</Text>
          ) : null}
        </View>
      ) : (
        <Text style={styles.mutedText}>{t('pools.gridCell.noPrediction')}</Text>
      )}
      {isViewer && canEdit ? (
        <View style={styles.viewerActions}>
          <Pressable accessibilityRole="button" onPress={handleStartEdit}>
            <Text style={styles.editText}>{hasPrediction ? t('pools.gridCell.edit') : t('pools.gridCell.predict')}</Text>
          </Pressable>
          {canReset ? (
            <Pressable accessibilityRole="button" onPress={onReset} disabled={isResetting}>
              <Text style={styles.resetText}>{isResetting ? t('pools.gridCell.resetting') : t('pools.gridCell.useGlobal')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export const PredictionGridCell = memo(PredictionGridCellComponent);

const styles = StyleSheet.create({
  row: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EEE',
    gap: 4,
  },
  nickname: {
    fontSize: 13,
    fontWeight: '600',
  },
  mutedText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '700',
  },
  overrideBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7C3AED',
  },
  pointsBadge: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
  },
  viewerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  editText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  resetText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  editRow: {
    flexDirection: 'row',
    gap: 12,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 12,
    color: '#6B7280',
  },
  saveButton: {
    backgroundColor: '#2563EB',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
});
