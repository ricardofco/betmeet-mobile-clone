/**
 * Per-prediction points-status resolution (RANKINGS-4, model.md §6,
 * design.md §4.3), reimplemented fresh against betmeet-clone's
 * `resolve-points.ts` per ADR-030's convention. Mobile's typed equivalent
 * (`src/domain/rankings/points-status.ts`) only declares the `PointsStatus`
 * type — the actual resolution runs here, authoritatively, backend-side.
 *
 * Four-state resolution, evaluated in this order:
 *   1. No prediction at all -> NOT_SCORED.
 *   2. A `PredictionScore` row exists -> SCORED.
 *   3. The match is CANCELLED/POSTPONED (and therefore will never be scored) -> NOT_SCORED.
 *   4. Otherwise (a prediction exists, not yet finished/scored) -> PENDING_SCORING.
 */
export type PointsStatus = 'SCORED' | 'PENDING_SCORING' | 'NOT_SCORED';

export function resolvePointsStatus(input: {
  hasPrediction: boolean;
  hasScore: boolean;
  matchStatus: string;
}): PointsStatus {
  if (!input.hasPrediction) return 'NOT_SCORED';
  if (input.hasScore) return 'SCORED';
  if (input.matchStatus === 'CANCELLED' || input.matchStatus === 'POSTPONED') return 'NOT_SCORED';
  return 'PENDING_SCORING';
}
