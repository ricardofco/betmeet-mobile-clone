import { create } from 'zustand';
import { type AuthClaims, type AuthSession, UNAUTHENTICATED_CLAIMS } from '@/domain/auth/auth-claims';
import type { Destination } from '@/domain/auth/auth-guard';

/**
 * The first real Zustand consumer (ADR-002, ADR-004 in Bolt 0). Holds only
 * what `AuthGatedNavigator` needs to evaluate the guard — derived `claims`
 * and the loading/ready flag — plus the intended-destination memory rules 2
 * and 5 need. **Never holds raw tokens**: `setSession` extracts `claims` and
 * discards `accessToken`/`refreshToken`. Any caller needing a token for a
 * real API call goes through `SupabaseAdapter`/`BackendApiClient` directly,
 * never through this store — this is AUTH-8's boundary rule made structural.
 *
 * Bolt 2 addition: `mfaFactorId` — the Supabase factor ID for the user's
 * active TOTP factor, set when `MfaChallengeScreen` mounts and the guard
 * detects a pending `aal2` challenge. Cleared to `null` after sign-out or
 * successful MFA elevation (session-change fires updated `aal` claims).
 * Never holds the raw challenge ID — that is ephemeral state on the
 * MfaChallengeScreen itself (model.md §2.5).
 */
export type AuthSessionStoreState = {
  status: 'loading' | 'ready';
  claims: AuthClaims;
  pendingDestination: Destination | null;
  mfaFactorId: string | null;
  setSession: (session: AuthSession | null) => void;
  setPendingDestination: (destination: Destination | null) => void;
  setMfaFactorId: (id: string | null) => void;
};

export const useAuthSessionStore = create<AuthSessionStoreState>(set => ({
  status: 'loading',
  claims: UNAUTHENTICATED_CLAIMS,
  pendingDestination: null,
  mfaFactorId: null,
  setSession: session => {
    set({
      status: 'ready',
      claims: session ? session.claims : UNAUTHENTICATED_CLAIMS,
    });
  },
  setPendingDestination: destination => set({ pendingDestination: destination }),
  setMfaFactorId: id => set({ mfaFactorId: id }),
}));
