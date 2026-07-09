import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type PoolScoreStepperProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
};

const MIN_SCORE = 0;
const MAX_SCORE = 20;

/**
 * Bolt 8 (POOLS-6, ADR-037) — a small, deliberately-duplicated score
 * stepper for the grid's own-row inline editor. Genuinely the same shape
 * as `src/host/predictions/components/prediction-score-input.tsx`, but
 * physically separate (not imported across the host/remote boundary) —
 * see ADR-037 for the full "why duplicate this one widget" reasoning.
 */
function PoolScoreStepperComponent({ label, value, onChange }: PoolScoreStepperProps) {
  const { t } = useTranslation();
  const handleDecrement = useCallback(() => onChange(Math.max(MIN_SCORE, value - 1)), [value, onChange]);
  const handleIncrement = useCallback(() => onChange(Math.min(MAX_SCORE, value + 1)), [value, onChange]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('pools.scoreStepper.decrease', { label })}
          onPress={handleDecrement}
          style={styles.button}
        >
          <Text style={styles.buttonText}>–</Text>
        </Pressable>
        <Text style={styles.value}>{value}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('pools.scoreStepper.increase', { label })}
          onPress={handleIncrement}
          style={styles.button}
        >
          <Text style={styles.buttonText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export const PoolScoreStepper = memo(PoolScoreStepperComponent);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  label: {
    fontSize: 11,
    color: '#6B7280',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  button: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontWeight: '700',
  },
  value: {
    fontSize: 16,
    fontWeight: '700',
    minWidth: 20,
    textAlign: 'center',
  },
});
