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

type PoolLeaderboardRowProps = {
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
 * RANKINGS-2's FlashList row, inside the `pools` remote. Plain `StyleSheet`
 * (same FlashList-perf exception as the host's `ranking-row.tsx`) — a
 * genuinely separate component (this bundle renders slightly differently
 * from the host's row, e.g. a future join-date affordance), but reuses the
 * exact same `@/domain/rankings/format-ranking-row.ts` formatting helpers so
 * the two screens can never silently drift on labeling (design.md §2/§7.2).
 */
function PoolLeaderboardRowComponent({ row, isLive, fallbackNicknameLabel }: PoolLeaderboardRowProps) {
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

export const PoolLeaderboardRow = memo(PoolLeaderboardRowComponent);

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
