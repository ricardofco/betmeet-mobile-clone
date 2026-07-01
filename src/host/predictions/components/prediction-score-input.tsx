import { memo, useCallback } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

type PredictionScoreInputProps = {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  editable: boolean;
};

/**
 * One score field (home or away) inside `PredictionMatchCard`
 * (PREDICTIONS-1). `value === null` represents "not yet entered" (distinct
 * from `0`, a valid score) — the parent decides whether that blocks save.
 *
 * `React.memo`-wrapped and its `onChange` callback is expected to already be
 * `useCallback`-stabilized by the caller (`vercel-react-native-skills`' list
 * -item/hot-path memoization rule, same discipline as `TeamBadge`/`MatchCard`
 * in `@/shared/competition`).
 */
function PredictionScoreInputComponent({ label, value, onChange, editable }: PredictionScoreInputProps) {
  const handleChangeText = useCallback(
    (text: string) => {
      if (text === '') {
        onChange(null);
        return;
      }
      const parsed = Number(text);
      if (Number.isNaN(parsed)) return;
      onChange(parsed);
    },
    [onChange],
  );

  return (
    <View style={styles.column}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value === null ? '' : String(value)}
        onChangeText={handleChangeText}
        keyboardType="number-pad"
        editable={editable}
        maxLength={2}
        accessibilityLabel={`${label} score`}
        accessibilityRole="none"
      />
    </View>
  );
}

export const PredictionScoreInput = memo(PredictionScoreInputComponent);

const styles = StyleSheet.create({
  column: {
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: 11,
    color: '#6B7280',
  },
  input: {
    width: 44,
    height: 40,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
});
