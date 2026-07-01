import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ScoreBreakdown } from '@/shared/scoring';

type ScoreBreakdownPanelProps = {
  breakdown: ScoreBreakdown;
};

const OUTCOME_LABEL: Record<ScoreBreakdown['matchedCase'], string> = {
  EXACT: 'Exact score',
  RESULT: 'Correct result',
  PARTIAL: 'Partially correct',
  MISS: 'Missed',
};

/**
 * PREDICTIONS-5's score-breakdown display. Purely presentational — all the
 * math already happened in `buildScoreBreakdown()` (domain, Model stage,
 * which itself only ever calls Bolt 4's `computeScore()`; ADR-016's
 * duplicate-detection gate applies — no scoring math is re-derived here).
 *
 * `React.memo`-wrapped since this renders once per finished match inside
 * `PredictionsFixtureList` — a `ScoreBreakdown` value is immutable once
 * computed for a given match/prediction pair, so this never needs to
 * re-render once mounted for that row.
 */
function ScoreBreakdownPanelComponent({ breakdown }: ScoreBreakdownPanelProps) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.outcome}>{OUTCOME_LABEL[breakdown.matchedCase]}</Text>
        <Text style={styles.totalPoints}>{breakdown.totalPoints} pts</Text>
      </View>
      {breakdown.components ? (
        <View style={styles.componentsRow}>
          <Text style={styles.componentText}>Result: +{breakdown.components.resultPoints}</Text>
          <Text style={styles.componentText}>Home goals: +{breakdown.components.homeGoalPoints}</Text>
          <Text style={styles.componentText}>Away goals: +{breakdown.components.awayGoalPoints}</Text>
        </View>
      ) : null}
      {breakdown.penaltyApplied ? (
        <Text style={styles.penaltyBonus}>Penalty-winner bonus: +{breakdown.penaltyPoints}</Text>
      ) : null}
    </View>
  );
}

export const ScoreBreakdownPanel = memo(ScoreBreakdownPanelComponent);

const styles = StyleSheet.create({
  container: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#F9FAFB',
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  outcome: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  totalPoints: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  componentsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  componentText: {
    fontSize: 11,
    color: '#6B7280',
  },
  penaltyBonus: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
  },
});
