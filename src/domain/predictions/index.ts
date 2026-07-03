export type {
  PredictionLockReason,
  PredictionEligibility,
  EligibilityMatchInput,
} from '@/domain/predictions/prediction-eligibility';
export { getPredictionEligibility, describeLockReason } from '@/domain/predictions/prediction-eligibility';

export type {
  PredictionEntry,
  PredictionEntryError,
  PredictionEntryValidation,
  PenaltyWinner,
} from '@/domain/predictions/prediction-entry-validation';
export {
  validatePredictionEntry,
  shouldShowPenaltyWinnerSelector,
  derivePenaltyWinner,
} from '@/domain/predictions/prediction-entry-validation';

export type { MyPrediction, MatchWithMyPrediction } from '@/domain/predictions/prediction-with-match';

export type { ScoreDisplayInput } from '@/domain/predictions/prediction-score-display';
export { canShowScoreBreakdown, buildScoreBreakdown } from '@/domain/predictions/prediction-score-display';

export type { ExistingPredictionsForMatch } from '@/domain/predictions/pool-override';
export { shouldOfferDualSave } from '@/domain/predictions/pool-override';
