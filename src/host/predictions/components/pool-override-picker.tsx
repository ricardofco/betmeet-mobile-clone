import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import type { PoolPickerEntry } from '@/domain/pools';

type PoolOverridePickerProps = {
  pools: PoolPickerEntry[];
  selectedPoolId: string | null;
  onSelect: (poolId: string | null) => void;
};

/**
 * PREDICTIONS-3 (design.md §4/§9) — a plain chip row, not a native
 * `Picker`/dropdown: the viewer's own pool memberships are a small, bounded
 * list (same "plain component, not FlashList" precedent as ADR-014's
 * avatar picker), and this avoids adding a new native dependency for a
 * bounded, small selection surface (Bolt 7's `@react-native-clipboard`
 * deferral precedent — don't add a native module mid-bolt without being
 * asked).
 */
function PoolOverridePickerComponent({ pools, selectedPoolId, onSelect }: PoolOverridePickerProps) {
  const { t } = useTranslation();
  const handleSelectGlobal = useCallback(() => onSelect(null), [onSelect]);

  if (pools.length === 0) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container}>
      <Chip label={t('predictions.poolPickerGlobal')} selected={selectedPoolId === null} onPress={handleSelectGlobal} />
      {pools.map(pool => (
        <PoolChip key={pool.id} pool={pool} selected={selectedPoolId === pool.id} onSelect={onSelect} />
      ))}
    </ScrollView>
  );
}

function PoolChip({
  pool,
  selected,
  onSelect,
}: {
  pool: PoolPickerEntry;
  selected: boolean;
  onSelect: (poolId: string) => void;
}) {
  const handlePress = useCallback(() => onSelect(pool.id), [onSelect, pool.id]);
  return <Chip label={pool.name} selected={selected} onPress={handlePress} />;
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export const PoolOverridePicker = memo(PoolOverridePickerComponent);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  chip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D1D5DB',
    marginRight: 6,
  },
  chipSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
});
