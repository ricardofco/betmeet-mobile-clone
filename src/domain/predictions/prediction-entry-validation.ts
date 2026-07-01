import { derivePenaltyWinner, type PenaltyWinner } from '@/shared/scoring';

/**
 * PREDICTIONS-1/PREDICTIONS-2's entry-validation rules (model.md §2,
 * domain-overview.md §5.4):
 *  - Score bounds: integers 0–20 per side (enforced client-side **and**
 *    re-enforced at the DB level via `predictions_scores_range` CHECK — this
 *    client copy is a UX nicety, never the actual gate).
 *  - Penalty-winner selector applies **only** to a tied knockout-phase
 *    match: if knockout and scores are equal, a winner pick is required;
 *    if not knockout-and-tied, supplying a penalty winner is itself an
 *    error (the server strips/rejects it — mirrored here so the client
 *    never even attempts to send one).
 *
 * @invariant The penalty winner is always **derived** from a shootout score
 * via `derivePenaltyWinner()` (scoring package), never accepted as a raw,
 * independently-chosen enum value — same rule as `computeScore`'s own
 * `predictedPenaltyWinner`/`actualPenaltyWinner` inputs. This module doesn't
 * duplicate that derivation; it re-exports the one function so a caller
 * never has to import both `@/shared/scoring` and `@/domain/predictions`
 * for a single "pick the shootout winner" interaction.
 */

export type PredictionEntry = {
  homeScore: number;
  awayScore: number;
  /** Only meaningful when the match is knockout and homeScore === awayScore. */
  penaltyWinner: PenaltyWinner;
};

export type PredictionEntryError =
  | 'HOME_SCORE_OUT_OF_RANGE'
  | 'AWAY_SCORE_OUT_OF_RANGE'
  | 'HOME_SCORE_NOT_INTEGER'
  | 'AWAY_SCORE_NOT_INTEGER'
  | 'PENALTY_WINNER_REQUIRED'
  | 'PENALTY_WINNER_NOT_APPLICABLE';

export type PredictionEntryValidation =
  | { valid: true }
  | { valid: false; errors: PredictionEntryError[] };

const MIN_SCORE = 0;
const MAX_SCORE = 20;

function isInRange(score: number): boolean {
  return score >= MIN_SCORE && score <= MAX_SCORE;
}

function isInteger(score: number): boolean {
  return Number.isInteger(score);
}

/**
 * Validates a single prediction entry before it is submitted.
 *
 * `isKnockout` must be supplied by the caller from the match's phase data
 * (never inferred here) — mirrors `computeScore`'s own `isKnockout` input
 * shape so the same fact travels unchanged from entry to eventual scoring.
 */
export function validatePredictionEntry(entry: PredictionEntry, isKnockout: boolean): PredictionEntryValidation {
  const errors: PredictionEntryError[] = [];

  if (!isInteger(entry.homeScore)) {
    errors.push('HOME_SCORE_NOT_INTEGER');
  } else if (!isInRange(entry.homeScore)) {
    errors.push('HOME_SCORE_OUT_OF_RANGE');
  }

  if (!isInteger(entry.awayScore)) {
    errors.push('AWAY_SCORE_NOT_INTEGER');
  } else if (!isInRange(entry.awayScore)) {
    errors.push('AWAY_SCORE_OUT_OF_RANGE');
  }

  const isTiedKnockout = isKnockout && entry.homeScore === entry.awayScore;

  if (isTiedKnockout && entry.penaltyWinner == null) {
    errors.push('PENALTY_WINNER_REQUIRED');
  }

  if (!isTiedKnockout && entry.penaltyWinner != null) {
    errors.push('PENALTY_WINNER_NOT_APPLICABLE');
  }

  return errors.length === 0 ? { valid: true } : { valid: false, errors };
}

/**
 * Whether the penalty-winner selector should even be shown for a given
 * prediction-in-progress — re-derives the same `isTiedKnockout` gate
 * `validatePredictionEntry` uses, so the UI can decide "show the selector"
 * independently of a full validation pass (e.g. while the user is still
 * typing scores and hasn't submitted yet).
 */
export function shouldShowPenaltyWinnerSelector(
  homeScore: number,
  awayScore: number,
  isKnockout: boolean,
): boolean {
  return isKnockout && isInteger(homeScore) && isInteger(awayScore) && homeScore === awayScore;
}

export { derivePenaltyWinner };
export type { PenaltyWinner };
