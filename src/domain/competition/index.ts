export type { MatchStatus, MatchStatusDisplay } from '@/domain/competition/match-status';
export { describeMatchStatus, isLiveStatus } from '@/domain/competition/match-status';

export type {
  FifaTrigram,
  FlagAssetKey,
  TeamDisplayData,
  KnockoutPlaceholder,
  TeamSlot,
} from '@/domain/competition/fifa-team-display';
export { isKnockoutPlaceholder, isResolvedTeam, describeTeamSlot } from '@/domain/competition/fifa-team-display';

export type { Match, FixtureDayGroup, FixtureView, LingerDecision } from '@/domain/competition/fixture-day-grouping';
export {
  groupMatchesByDay,
  decidePastDayLingering,
  buildFixtureView,
} from '@/domain/competition/fixture-day-grouping';

export type { LiveUpdateRelevance, LiveSignal, LiveSubscriptionState } from '@/domain/competition/live-update-policy';
export { evaluateLiveUpdateRelevance, computeDebounceDeadline } from '@/domain/competition/live-update-policy';
