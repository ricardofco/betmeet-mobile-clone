import { getBackendApiClient } from '@/platform/backend-api/backend-api-client';

/**
 * Typed wrappers around `BackendApiClient.request()` for the `auth.*`
 * capability group beyond `resendConfirmation` (which stays a first-class
 * method on `BackendApiClient` itself, per Bolt 1 — unchanged). This is the
 * first `auth-api.ts` file, following the now-dominant `*-api.ts` pattern
 * every later bolt has used (`profile-api.ts`/`competition-api.ts`/
 * `predictions-api.ts`/`pools-api.ts`) rather than growing
 * `BackendApiClient`'s own interface further (design.md §4).
 */

export type OwnershipAssignmentInput = { poolId: string; newOwnerId: string };

export type DeleteAccountResponse =
  | { ok: true }
  | { ok: false; error: 'MISSING_ASSIGNMENT' | 'TRANSFER_FAILED' | 'DELETE_FAILED' };

export const authApi = {
  async deleteAccount(input: { poolOwnershipAssignments: OwnershipAssignmentInput[] }): Promise<DeleteAccountResponse> {
    return getBackendApiClient().request<DeleteAccountResponse, typeof input>({
      capability: 'auth.deleteAccount',
      body: input,
    });
  },
};
