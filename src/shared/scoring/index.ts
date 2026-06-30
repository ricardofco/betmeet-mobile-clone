/**
 * Public API for the scoring package.
 *
 * Import via: `import { computeScore, ScoringRuleSet } from '@/shared/scoring'`
 *
 * @see ADR-015 — why this is not registered in the Module Federation shared config
 * @see ADR-016 — the code-review gate preventing duplicate implementations
 */
export { ScoringRuleSet } from './scoring-rules';
export type { ScoringRuleSet as ScoringRuleSetType } from './scoring-rules';

export { computeScore, derivePenaltyWinner } from './compute-score';
export type {
  MatchedCase,
  PenaltyWinner,
  ScoringExample,
  ScoreBreakdown,
} from './compute-score';
