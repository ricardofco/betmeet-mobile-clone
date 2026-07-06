/**
 * RANKINGS-4's per-prediction display status (model.md §6, design.md §2/§8).
 * The actual four-state resolution logic runs backend-side
 * (`backend/src/services/scoring/resolve-points.ts`) — this module only
 * gives mobile a typed constant to switch on for `PredictionMatchCard`'s
 * badge (design.md §8). Framework-free, zero React/RN import.
 */
export type PointsStatus = 'SCORED' | 'PENDING_SCORING' | 'NOT_SCORED';
