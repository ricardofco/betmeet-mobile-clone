# ADR-008 — MFA Guard Branch: Extending AuthGatedNavigator

**Date:** 2026-06-29
**Status:** Accepted
**Bolt:** 2 — Auth Secondary Flows

---

## Context

Bolt 1's `AuthGatedNavigator` renders one of five branches based on the `evaluateGuard` outcome (ADR-001). AUTH-3 adds a new state: the user has completed password sign-in (establishing an `aal1` session) but their account has an active TOTP factor requiring an `aal2` challenge before they can access the app.

The guard must detect this state and render `MfaChallengeScreen` — but without violating ADR-001 (conditional screen-tree rendering, not navigation action interception).

A key tension: Bolt 1's rule 4 (`auth-only` redirect for signed-in users) already has an `isPendingMfa` exception — it calls `isPendingMfa(claims)` and returns `proceed` if true, allowing the existing `auth-only` screens (like `SignInScreen`) to remain mounted. This was a placeholder for Bolt 2; Bolt 2 now fills it in properly.

---

## Decision

### How the branch is added

A new `GuardOutcome` literal is added:
```ts
| { type: 'redirect'; to: 'mfa-challenge' }
```

A new rule is inserted in `evaluateGuard` **after rule 3** (unconfirmed email guard) and **before rule 4** (auth-only screen redirect). This position is correct because:
- The user IS authenticated (so rule 2 does not apply).
- The user's email IS confirmed (so rule 3 does not apply or they pass rule 3's `proceed`).
- The user has NOT yet elevated to `aal2` — they should not reach the app tree.

```ts
// Rule 3.5 — pending MFA elevation
if (authenticated && !isExplicitlyFalse(claims.emailVerified)) {
  if (claims.aal?.current === 'aal1' && claims.aal?.next === 'aal2') {
    if (hasScreenClass(currentScreenClass, 'mfa-challenge')) {
      return { type: 'proceed' };
    }
    return { type: 'redirect', to: 'mfa-challenge' };
  }
}
```

### Removing the Bolt 1 `isPendingMfa` exception in rule 4

With rule 3.5 inserted, rule 4's `isPendingMfa` exception is no longer needed — pending-MFA users are intercepted earlier. The `isPendingMfa` helper and its rule-4 exception are removed, keeping the guard clean.

### AuthGatedNavigator extension

`AuthGatedNavigator` handles the new outcome in its `switch` statement:
```ts
case 'redirect':
  if (outcome.to === 'mfa-challenge') {
    return <MfaChallengeTree />;
  }
  // ... existing redirect cases
```

`MfaChallengeTree` is a new function component (same pattern as `UnauthenticatedTree`, `VerifyEmailTree`, `OnboardingTree`) that mounts a single-screen native-stack navigator with `MfaChallengeScreen`.

### Why this is ADR-001 extended, not violated

ADR-001's core principle: "the unreachable screen is never registered into the tree to begin with." The MFA challenge branch follows this exactly:
- When the user is in pending-MFA state, `MfaChallengeTree` is the only tree rendered — the Home, Settings, and all other screens are not mounted.
- When the user elevates to `aal2` (via successful TOTP verification → `onSessionChange` fires the new session → Zustand store updates → `AuthGatedNavigator` re-renders), `MfaChallengeTree` is unmounted and `renderAppTree()` is mounted.
- No `navigation.navigate('MfaChallenge')` call; no `navigation.reset` call — only the component tree changes.

### New ScreenClass tag and registry entry

`ScreenClassTag` gains `'mfa-challenge'`.
`SCREEN_REGISTRY` gains: `MfaChallenge: ['mfa-challenge'] as ScreenClass`.

---

## Consequences

- The Bolt 1 `isPendingMfa` helper in `auth-guard.ts` is removed (it was a Bolt 2 seam-placeholder, its purpose now served by the explicit rule 3.5).
- `evaluateGuard`'s decision table grows by one row: `(authenticated, email-verified, aal1+aal2-pending) → redirect:mfa-challenge`.
- The `auth-guard.test.ts` decision table must be extended with the new row (done in Stage 5).
- `MfaChallengeScreen` has no back button — it is the root screen of its tree. The user's only exits are: successful MFA verification (guard re-renders to app tree) or signing out (guard re-renders to unauthenticated tree). This is intentional — leaving MFA challenge screen would leave the user in a half-authenticated `aal1` state.
