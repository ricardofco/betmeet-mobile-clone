import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  displayNickname,
  displayTotal,
  formatPositionDelta,
  formatPositionLabel,
  getMedalGlyph,
  type PositionDeltaDirection,
  type ProjectedRow,
  type RankedRow,
} from '@/domain/rankings';

type RankingRowItemProps = {
  row: RankedRow | ProjectedRow;
  isLive: boolean;
  fallbackNicknameLabel: string;
};

function hasPositionDelta(row: RankedRow | ProjectedRow): row is ProjectedRow {
  return 'positionDelta' in row;
}

const DELTA_COLOR: Record<PositionDeltaDirection, string> = {
  up: '#059669',
  down: '#DC2626',
  same: '#6B7280',
  new: '#2563EB',
};

/**
 * RANKINGS-1's FlashList row (design.md §7.1/§10). Plain `StyleSheet`, not
 * Tamagui primitives — the one documented, narrow FlashList-perf exception
 * this repo's `renderItem` rows follow (Bolt 9 `implement-and-test.md §5`;
 * this list can be large, unlike the small pools list that earned Bolt 9's
 * own Tamagui exception). All display shaping (medal glyph, position label,
 * delta arrow) comes from `@/domain/rankings/format-ranking-row.ts` — this
 * component only lays it out, so it can never silently drift from
 * `pool-leaderboard-row.tsx`'s own formatting in the `pools` remote.
 */
function RankingRowItemComponent({ row, isLive, fallbackNicknameLabel }: RankingRowItemProps) {
  const medal = getMedalGlyph(row.position);
  const positionLabel = formatPositionLabel(row.position, row.isTied);
  const total = displayTotal(row, isLive);
  const delta = isLive && hasPositionDelta(row) ? formatPositionDelta(row.positionDelta) : null;

  return (
    <View style={[styles.row, row.isViewer && styles.viewerRow]}>
      <View style={styles.positionColumn}>
        <Text style={styles.positionText}>{medal ?? positionLabel}</Text>
      </View>
      <Text style={styles.nicknameText} numberOfLines={1}>
        {displayNickname(row.nickname, fallbackNicknameLabel)}
      </Text>
      {delta ? (
        <Text style={[styles.deltaText, { color: DELTA_COLOR[delta.direction] }]}>{delta.label}</Text>
      ) : null}
      <Text style={styles.totalText}>{total}</Text>
    </View>
  );
}

export const RankingRowItem = memo(RankingRowItemComponent);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  viewerRow: {
    backgroundColor: '#EFF6FF',
  },
  positionColumn: {
    width: 36,
    alignItems: 'center',
  },
  positionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  nicknameText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  deltaText: {
    fontSize: 12,
    fontWeight: '700',
  },
  totalText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
    minWidth: 32,
    textAlign: 'right',
  },
});
