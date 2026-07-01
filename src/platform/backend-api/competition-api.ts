import { getBackendApiClient } from '@/platform/backend-api/backend-api-client';
import type { Match } from '@/domain/competition';

/**
 * Typed wrappers around `BackendApiClient.request()` for the
 * `competition.*` capability group (design.md §5, system-context.md §3
 * "Competition (read)" — "fixture/team/match read model, equivalent to
 * `getFixture`/`getFixtureWithMyPredictions`... Read-only from mobile").
 * Mirrors `profile-api.ts`'s exact pattern — same shared
 * `getBackendApiClient()` singleton, no new transport.
 *
 * `getFixture()` returns a plain, prediction-agnostic `Match[]` —
 * `getFixtureWithMyPredictions`'s prediction-joined variant is explicitly
 * `unit-05-predictions` (Bolt 6)'s concern, not this bolt's
 * (unit-brief.md "Out of scope").
 *
 * `getKnockoutPhaseIds()` — added in Bolt 6 (predictions core), not a
 * modification of any Bolt 5 behavior. Bolt 5's `Match` type carries
 * `phaseId` but COMPETITION-1/2/3 never needed to distinguish
 * group/knockout/league phases (`project-inventory.md`'s
 * `CompetitionPhase.type`), so no phase-type lookup was exposed. Predictions
 * needs exactly that one bit (PREDICTIONS-2's penalty-winner selector only
 * applies to knockout-phase matches) — exposed as a small, additive
 * capability here rather than widening `Match` itself or duplicating
 * `competition`'s domain modeling inside `src/domain/predictions/`.
 */
export const competitionApi = {
  async getFixture(): Promise<Match[]> {
    return getBackendApiClient().request<Match[]>({
      capability: 'competition.getFixture',
    });
  },

  async getKnockoutPhaseIds(): Promise<string[]> {
    return getBackendApiClient().request<string[]>({
      capability: 'competition.getKnockoutPhaseIds',
    });
  },
};
