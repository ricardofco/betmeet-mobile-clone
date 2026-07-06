export type { PointsStatus } from '@/domain/rankings/points-status';

export type { RankingRow, RankedRow, ProjectedRow } from '@/domain/rankings/ranking-row';

export type { TieBreakComparator } from '@/domain/rankings/dense-ranking';
export { assignDensePositions } from '@/domain/rankings/dense-ranking';

export { compareByNicknameAscending } from '@/domain/rankings/nickname-tie-break';

export type { RankedView } from '@/domain/rankings/rank-projection';
export { buildRankedView } from '@/domain/rankings/rank-projection';

export type { PositionDeltaDirection, FormattedPositionDelta } from '@/domain/rankings/format-ranking-row';
export {
  getMedalGlyph,
  formatPositionLabel,
  formatPositionDelta,
  displayNickname,
  displayTotal,
} from '@/domain/rankings/format-ranking-row';
