import { memo, useCallback } from 'react';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { AdminMatchRow } from '@/domain/admin';

type AdminMatchListProps = {
  matches: readonly AdminMatchRow[];
  selectedMatchId: string | null;
  onSelect: (matchId: string) => void;
};

/**
 * ADMIN-4/5's shared match picker (design.md §5.2/§9) — reuses the same
 * `@shopify/flash-list` MF singleton `pools`/`rankings` already proved on a
 * real device build. Mirrors betmeet-clone's own `admin-match-list.tsx`
 * (FIFA-code labeling, BR-7.14/7.15, model.md §0.1) reimplemented fresh, not
 * imported (ADR-030-style convention, applied mobile-side here since this
 * is genuinely new UI, not a ported backend business rule).
 *
 * Plain `StyleSheet` rows, not Tamagui primitives (`vercel-react-native-
 * skills`) — this list can be as large as the full fixture list, the same
 * FlashList-perf rationale `ranking-row.tsx`'s own doc comment gives, not
 * the small-list exception `pool-list-item.tsx` uses.
 */
export function AdminMatchList({ matches, selectedMatchId, onSelect }: AdminMatchListProps) {
  const { t } = useTranslation();
  const knockoutLabel = t('admin.matchList.knockout');
  const unresolvedLabel = t('admin.matchList.unresolved');

  const renderItem = useCallback<ListRenderItem<AdminMatchRow>>(
    ({ item }) => (
      <AdminMatchListRow
        row={item}
        isSelected={item.id === selectedMatchId}
        onSelect={onSelect}
        knockoutLabel={knockoutLabel}
        unresolvedLabel={unresolvedLabel}
      />
    ),
    [selectedMatchId, onSelect, knockoutLabel, unresolvedLabel],
  );

  const keyExtractor = useCallback((item: AdminMatchRow) => item.id, []);

  return (
    <View style={styles.listContainer}>
      <FlashList data={matches as AdminMatchRow[]} renderItem={renderItem} keyExtractor={keyExtractor} />
    </View>
  );
}

type RowProps = {
  row: AdminMatchRow;
  isSelected: boolean;
  onSelect: (matchId: string) => void;
  knockoutLabel: string;
  unresolvedLabel: string;
};

function AdminMatchListRowComponent({ row, isSelected, onSelect, knockoutLabel, unresolvedLabel }: RowProps) {
  const handlePress = useCallback(() => onSelect(row.id), [onSelect, row.id]);
  const home = row.fifaHome ?? '???';
  const away = row.fifaAway ?? '???';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={handlePress}
      style={[styles.row, isSelected && styles.rowSelected]}
    >
      <View style={styles.rowMain}>
        <Text style={styles.matchLabel}>
          {home} vs {away}
        </Text>
        <Text style={styles.metaLabel}>
          {!row.bothTeamsResolved ? unresolvedLabel : row.isKnockout ? knockoutLabel : row.status}
        </Text>
      </View>
      {row.manualOverride ? <View style={styles.overrideDot} /> : null}
    </Pressable>
  );
}

const AdminMatchListRow = memo(AdminMatchListRowComponent);

const styles = StyleSheet.create({
  listContainer: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  rowSelected: {
    backgroundColor: '#EFF6FF',
  },
  rowMain: {
    flex: 1,
    gap: 2,
  },
  matchLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  metaLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  overrideDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
    marginLeft: 8,
  },
});
