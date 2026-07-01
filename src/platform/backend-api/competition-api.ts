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
 */
export const competitionApi = {
  async getFixture(): Promise<Match[]> {
    return getBackendApiClient().request<Match[]>({
      capability: 'competition.getFixture',
    });
  },
};
