import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PenaltyWinner } from '@/domain/predictions';

type PenaltyWinnerSelectorProps = {
  homeLabel: string;
  awayLabel: string;
  value: PenaltyWinner;
  onChange: (winner: PenaltyWinner) => void;
  editable: boolean;
};

/**
 * PREDICTIONS-2's penalty-winner selector — only ever rendered by
 * `PredictionMatchCard` when `shouldShowPenaltyWinnerSelector()` (domain,
 * Model stage) says the match is a tied knockout match. This component does
 * not itself decide *whether* to render — that gate lives in the parent, so
 * this stays a plain, stateless controlled input.
 *
 * The value is always one of the two match teams (domain-overview.md
 * §5.4 — "the winner must be one of the two match teams"); there is no
 * third option and no `null` selection surfaced here once required (the
 * parent's validation, not this component, decides whether an unset value
 * blocks save).
 */
function PenaltyWinnerSelectorComponent({
  homeLabel,
  awayLabel,
  value,
  onChange,
  editable,
}: PenaltyWinnerSelectorProps) {
  const handleSelectHome = useCallback(() => onChange('home'), [onChange]);
  const handleSelectAway = useCallback(() => onChange('away'), [onChange]);

  return (
    <View style={styles.container}>
      <Text style={styles.prompt}>Penalty shootout winner</Text>
      <View style={styles.options}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: value === 'home' }}
          disabled={!editable}
          onPress={handleSelectHome}
          style={[styles.option, value === 'home' && styles.optionSelected]}
        >
          <Text style={[styles.optionText, value === 'home' && styles.optionTextSelected]}>{homeLabel}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: value === 'away' }}
          disabled={!editable}
          onPress={handleSelectAway}
          style={[styles.option, value === 'away' && styles.optionSelected]}
        >
          <Text style={[styles.optionText, value === 'away' && styles.optionTextSelected]}>{awayLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export const PenaltyWinnerSelector = memo(PenaltyWinnerSelectorComponent);

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  prompt: {
    fontSize: 12,
    color: '#6B7280',
  },
  options: {
    flexDirection: 'row',
    gap: 8,
  },
  option: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  optionSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  optionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  optionTextSelected: {
    color: '#2563EB',
  },
});
