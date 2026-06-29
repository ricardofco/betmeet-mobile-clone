# ADR-002 — Zustand auth-session store: shape and the no-raw-tokens boundary

## Context

ADR-004 (Bolt 0) fixed Zustand as the local/client-state library and named the auth-session mirror as its first real consumer, without specifying that store's shape. AUTH-7's guard (ADR-001) needs a reactive, app-wide read of the current session's claims; AUTH-8 requires that "no feature module touches token storage directly" — only the `SupabaseAdapter` may read/write tokens (`system-context.md §2`). Because a Zustand store is global and trivially over-readable from anywhere in the app, its shape is itself a control that can either preserve or accidentally violate that boundary.

## Decision

One store, `src/host/auth/auth-session-store.ts`:

```ts
type AuthSessionStoreState = {
  status: 'loading' | 'ready';
  claims: AuthClaims;
  pendingDestination: Destination | null;
  setSession: (session: AuthSession | null) => void;
  setPendingDestination: (destination: Destination | null) => void;
};
```

- `status` starts `'loading'` and flips to `'ready'` on the **first** `SupabaseAdapter.onSessionChange` emission since app launch (whether that emission is `null` or a real session) — there is no separate "restoring" domain state (`model.md §3`); this is purely "have we heard from the adapter yet."
- `claims` is **derived only** — `setSession` extracts `session.claims` (or `UNAUTHENTICATED_CLAIMS` if `session` is `null`) and discards everything else; the store never stores `accessToken`/`refreshToken`.
- `pendingDestination` is the intended-destination memory consumed by `AuthGatedNavigator` (ADR-001).
- Wiring: a single effect mounted once near the host's root (above/inside `AppProviders`) subscribes `getSupabaseAdapter().onSessionChange(session => useAuthSessionStore.getState().setSession(session))` and returns the unsubscribe function on unmount.

## Consequences

- **The no-raw-tokens boundary is structural, not a code-review convention**: even though the store is globally readable (any screen/hook in the app could call `useAuthSessionStore()`), there is no token field to read. A screen that needs to make an authenticated API call still goes through `BackendApiClient`/`SupabaseAdapter` directly (which manage the bearer token internally), never through this store — `AuthSessionStoreState`'s type itself makes the violation impossible to write by accident, the same design move `model.md` already made for the tri-state claim shape.
- `evaluateGuard` (the pure domain function, ADR-001) is never put into the store itself — it stays an imported function, called by `AuthGatedNavigator` each render. The store holds state, not behavior, keeping it trivially testable/mockable in isolation from the guard logic.
- `pendingMfa` and any other guard-relevant derived boolean are **not** separately stored — they are computed inline from `claims.aal` at the point of use (currently only `AuthGatedNavigator`). Adding a second derived field to keep in sync with `claims` was judged to be more risk (staleness bugs) than the one-line computation it would save.
- This store is the pattern later bolts/units copy when they need their own piece of local/client state (per ADR-004's original framing) — e.g. an onboarding-wizard-step store in `unit-02-profile`'s bolt. The "derive, don't duplicate; never store raw secrets" discipline established here is the precedent, not just this store's own internal detail.
