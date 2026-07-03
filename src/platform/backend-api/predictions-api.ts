import { getBackendApiClient } from '@/platform/backend-api/backend-api-client';
import type { MyPrediction } from '@/domain/predictions';

/**
 * Typed wrappers around `BackendApiClient.request()` for the
 * `predictions.*` capability group (design.md §6, system-context.md §3
 * "Predictions" — "save (incl. pool-override + global dual-save), reset
 * override, eligibility/lock check, penalty-winner validation... Server
 * re-validates eligibility with its own clock regardless of what mobile
 * believes"). Mirrors `competition-api.ts`/`profile-api.ts`'s exact
 * pattern — same shared `getBackendApiClient()` singleton, no new
 * transport (ADR-003 precedent).
 *
 * This bolt (6) only implements the **global-prediction** save path
 * (`poolId: null`). Pool-scoped override + dual-save (PREDICTIONS-3) and
 * reset-override (PREDICTIONS-4) are Bolt 8's scope (model.md §7) — the
 * request/response shapes below include `poolId` now so Bolt 8 doesn't need
 * to widen them later, but this bolt's UI never sends a non-null `poolId`.
 *
 * `getMyPredictions()` returns a flat, match-agnostic list — joining it with
 * `competitionApi.getFixture()`'s match data happens client-side (design.md
 * §6), not via a combined `getFixtureWithMyPredictions`-style endpoint,
 * since this repo has no concrete contract for one yet.
 */

export type SavePredictionInput = {
  matchId: string;
  poolId: string | null;
  homeScore: number;
  awayScore: number;
  penaltyWinner: MyPrediction['penaltyWinner'];
  /**
   * Bolt 8 (PREDICTIONS-3, design.md §3/§5) — when `poolId` is set and no
   * global/override prediction exists yet for this match, write both the
   * pool override and the global prediction atomically in one request
   * (ADR-039). Ignored (never sent) when `poolId` is null.
   */
  alsoSaveAsGlobal?: boolean;
};

export type SavePredictionResponse =
  | { ok: true; prediction: MyPrediction }
  | { ok: false; error: 'LOCKED' | 'VALIDATION_FAILED' | 'NOT_MEMBER' };

/** Bolt 8 — PREDICTIONS-4 (design.md §3). */
export type ResetOverrideResponse = { ok: true } | { ok: false; error: 'NOT_MEMBER' };

export const predictionsApi = {
  async getMyPredictions(): Promise<MyPrediction[]> {
    return getBackendApiClient().request<MyPrediction[]>({
      capability: 'predictions.getMyPredictions',
    });
  },

  async savePrediction(input: SavePredictionInput): Promise<SavePredictionResponse> {
    return getBackendApiClient().request<SavePredictionResponse, SavePredictionInput>({
      capability: 'predictions.save',
      body: input,
    });
  },

  async resetOverride(input: { matchId: string; poolId: string }): Promise<ResetOverrideResponse> {
    return getBackendApiClient().request<ResetOverrideResponse, typeof input>({
      capability: 'predictions.resetOverride',
      body: input,
    });
  },
};
