import { getBackendApiClient } from '@/platform/backend-api/backend-api-client';
import type { AdminMatchRow } from '@/domain/admin';

/**
 * Typed wrappers around `BackendApiClient.request()` for the `admin.*`
 * capability group (design.md §6, ADR-057..062). Mirrors
 * `rankings-api.ts`/`pools-api.ts`'s exact pattern — same shared
 * `getBackendApiClient()` singleton, no new transport. Reachable from both
 * the host (`src/host/settings/`, the Settings-row visibility check) and
 * the `admin` remote (`src/remotes/admin/`) — both go through the one
 * `getBackendApiClient()` instance, itself an MF shared singleton.
 *
 * Response shapes match design.md §6's table exactly —
 * `{ok:true,...}|{ok:false,error:...}`, same envelope convention every
 * other capability group uses. `checkAccess` is the one exception (never
 * an `{ok:false}` shape, design.md §3.1) — any authenticated user may call
 * it; the interesting information IS the boolean, not a rejection.
 */

export type CheckAccessResponse = { isAdmin: boolean };

export type SweepStatusResponse =
  | { ok: true; lastRunAt: string | null; lastSweptCount: number | null }
  | { ok: false; error: 'FORBIDDEN' };

export type TriggerSweepResponse =
  | { ok: true; sweptCount: number; ranAt: string }
  | { ok: false; error: 'FORBIDDEN' };

export type ListAdminMatchesResponse =
  | { ok: true; matches: AdminMatchRow[] }
  | { ok: false; error: 'FORBIDDEN' };

export type ForceMatchResultInput = {
  matchId: string;
  homeScore: number;
  awayScore: number;
  homePenaltyScore?: number | null;
  awayPenaltyScore?: number | null;
  penaltyWinnerTeamId?: string | null;
  reason: string;
};

export type ForceMatchResultResponse =
  | { ok: true }
  | {
      ok: false;
      error:
        | 'FORBIDDEN'
        | 'NOT_FOUND'
        | 'TEAMS_NOT_RESOLVED'
        | 'VALIDATION_FAILED'
        | 'PENALTY_WINNER_MISMATCH';
    };

export type RevertMatchOverrideResponse =
  | { ok: true }
  | { ok: false; error: 'FORBIDDEN' | 'NOT_FOUND' | 'NOT_OVERRIDDEN' };

export const adminApi = {
  async checkAccess(): Promise<CheckAccessResponse> {
    return getBackendApiClient().request<CheckAccessResponse>({
      capability: 'admin.checkAccess',
    });
  },

  async getScoringSweepStatus(): Promise<SweepStatusResponse> {
    return getBackendApiClient().request<SweepStatusResponse>({
      capability: 'admin.getScoringSweepStatus',
    });
  },

  async triggerScoringSweep(): Promise<TriggerSweepResponse> {
    return getBackendApiClient().request<TriggerSweepResponse>({
      capability: 'admin.triggerScoringSweep',
    });
  },

  async listMatches(): Promise<ListAdminMatchesResponse> {
    return getBackendApiClient().request<ListAdminMatchesResponse>({
      capability: 'admin.listMatches',
    });
  },

  async forceMatchResult(input: ForceMatchResultInput): Promise<ForceMatchResultResponse> {
    return getBackendApiClient().request<ForceMatchResultResponse, ForceMatchResultInput>({
      capability: 'admin.forceMatchResult',
      body: input,
    });
  },

  async revertMatchOverride(matchId: string): Promise<RevertMatchOverrideResponse> {
    return getBackendApiClient().request<RevertMatchOverrideResponse, { matchId: string }>({
      capability: 'admin.revertMatchOverride',
      body: { matchId },
    });
  },
};
