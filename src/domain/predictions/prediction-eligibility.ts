import type { Match } from '@/domain/competition';

/**
 * PREDICTIONS-1's kickoff-lock state machine — `getPredictionEligibility`
 * (model.md §1, domain-overview.md §4.2). Mirrors the backend's own state
 * machine exactly (same branch order, same reasons) because the client's
 * result here is **advisory only**: the backend re-checks eligibility with
 * its own clock on every save, and the `prediction_lock_guard` Postgres
 * trigger rejects any UPDATE to a locked prediction's score fields
 * independent of the application layer. This client-side copy exists purely
 * so the UI can show/hide the edit affordance and a countdown *before* a
 * doomed request round-trip — never to be trusted as the actual gate.
 *
 * @invariant Branch order matters and must not be reordered — later branches
 * are only reached if all earlier ones fall through, exactly matching the
 * backend's documented precedence (domain-overview.md §4.2's ASCII table).
 */

export type PredictionLockReason =
  | 'MATCH_NOT_EDITABLE'
  | 'KICKOFF_REACHED'
  | 'CANCELLED'
  | 'POSTPONED'
  | 'MATCH_STATUS_LOCKED';

export type PredictionEligibility =
  | { editable: true }
  | { editable: false; reason: PredictionLockReason };

/**
 * The subset of `Match` this check needs — kept narrow (not the full `Match`
 * type) so this function can be unit-tested and reused without needing to
 * fabricate an entire fixture row.
 */
export type EligibilityMatchInput = Pick<Match, 'status' | 'kickoffAt' | 'homeTeam' | 'awayTeam'>;

/**
 * Evaluates whether a prediction for `match` can still be created/edited at
 * instant `now`. Pure function — no hidden `Date.now()` call (same
 * discipline as `domain/competition/fixture-day-grouping.ts`'s ADR-019
 * precedent), so callers and tests control "now" explicitly.
 *
 * Rule order (domain-overview.md §4.2), evaluated top-to-bottom:
 * 1. No home/away team assigned (unresolved knockout slot) → MATCH_NOT_EDITABLE.
 * 2. No kickoff time → MATCH_NOT_EDITABLE.
 * 3. `now >= kickoffAt` → KICKOFF_REACHED (the lock cutoff; **no grace period**).
 * 4. `status === 'CANCELLED'` → CANCELLED.
 * 5. `status === 'POSTPONED'` → POSTPONED.
 * 6. `status` not `SCHEDULED` (e.g. LIVE/FINISHED/LOCKED) → MATCH_STATUS_LOCKED.
 * 7. Otherwise (SCHEDULED, now < kickoffAt, both teams resolved) → editable.
 */
export function getPredictionEligibility(match: EligibilityMatchInput, now: string): PredictionEligibility {
  if (match.homeTeam === null || match.awayTeam === null) {
    return { editable: false, reason: 'MATCH_NOT_EDITABLE' };
  }

  if (!match.kickoffAt) {
    return { editable: false, reason: 'MATCH_NOT_EDITABLE' };
  }

  const nowMs = new Date(now).getTime();
  const kickoffMs = new Date(match.kickoffAt).getTime();
  if (nowMs >= kickoffMs) {
    return { editable: false, reason: 'KICKOFF_REACHED' };
  }

  if (match.status === 'CANCELLED') {
    return { editable: false, reason: 'CANCELLED' };
  }

  if (match.status === 'POSTPONED') {
    return { editable: false, reason: 'POSTPONED' };
  }

  if (match.status !== 'SCHEDULED') {
    return { editable: false, reason: 'MATCH_STATUS_LOCKED' };
  }

  return { editable: true };
}

const REASON_LABEL: Record<PredictionLockReason, string> = {
  MATCH_NOT_EDITABLE: 'Not available yet',
  KICKOFF_REACHED: 'Locked — kickoff has passed',
  CANCELLED: 'Match cancelled',
  POSTPONED: 'Match postponed',
  MATCH_STATUS_LOCKED: 'Locked',
};

/**
 * The only place `PredictionLockReason` display copy is defined
 * (mirrors `describeMatchStatus`'s single-source-of-labels pattern in
 * `domain/competition/match-status.ts`).
 */
export function describeLockReason(reason: PredictionLockReason): string {
  return REASON_LABEL[reason];
}
