/**
 * ADMIN-4's mobile-side pre-check (design.md §5.3, model.md §5) — a UX
 * nicety that makes `ForceResultForm` feel responsive, **never** the actual
 * gate: the backend independently re-derives and re-validates everything
 * regardless of what this returns (ADR-059's "advisory client, authoritative
 * server" discipline, model.md §7's elevated risk register for this bolt).
 *
 * Deliberately 0-50, NOT predictions' 0-20 bound
 * (`src/domain/predictions/prediction-entry-validation.ts`) — an
 * admin-forced result is a materially wider input space than a user's
 * plausible-score guess. The two bounds are genuinely independent, not
 * accidentally shared; a score in the 21-50 range must pass here and would
 * fail predictions' own validation.
 *
 * Penalty-winner-iff-tied-knockout is NOT re-implemented here — it's the
 * same rule predictions already encodes
 * (`shouldShowPenaltyWinnerSelector`/`validatePredictionEntry`); the backend
 * independently re-derives the winner from the shootout score regardless
 * (BR-7.16), so this module only owns the score-bounds check.
 */
const MIN_SCORE = 0;
const MAX_SCORE = 50;

export function validateForceResultScoreBounds(homeScore: number, awayScore: number): boolean {
  return (
    Number.isInteger(homeScore) &&
    Number.isInteger(awayScore) &&
    homeScore >= MIN_SCORE &&
    homeScore <= MAX_SCORE &&
    awayScore >= MIN_SCORE &&
    awayScore <= MAX_SCORE
  );
}

/** Mandatory `reason` field (BR-7.2) — 1-500 chars, trimmed, same bound the
 * backend independently re-enforces. */
export function validateForceResultReason(reason: string): boolean {
  const trimmed = reason.trim();
  return trimmed.length >= 1 && trimmed.length <= 500;
}
