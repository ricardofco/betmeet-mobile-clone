# AUTH-7 — Session/navigation guard (the `proxy.ts` equivalent)

**Unit:** `unit-01-auth` · **Placement:** Host — this is the single most domain-critical story in the whole migration; build and verify it before any other unit relies on "being logged in."

## Story

As the app, I need a single, central gate that decides on every protected-screen entry whether the current session may proceed, be redirected, or be ejected — so that the access-control rules from the web app are preserved exactly, not reinvented per screen.

## Source rules

`domain-overview.md §6`, verbatim rule ordering (reproduce exactly, in this order):

1. A session whose `account_deleted` claim is **explicitly `true`** is ejected (forced sign-out), even if the JWT itself still cryptographically verifies.
2. An unauthenticated user may only reach public screens (sign-in/sign-up/forgot-password/reset-password/verify-email and equivalents); everything else routes to sign-in, remembering the originally intended destination.
3. An authenticated-but-unconfirmed-email user (`email_verified === false`, explicit-false only) is forced to a "verify your email" screen, with public screens (including any confirmation continuation screen) still reachable.
4. An authenticated+confirmed user on an auth-only screen (sign-in/sign-up/forgot-password/verify-email) is redirected to the app home — **unless** they have a pending MFA challenge (`aal1` with `nextLevel === "aal2"`), in which case they are let through to complete it.
5. An authenticated+confirmed user who hasn't finished onboarding (`onboarding_completed === false`, explicit-false only) is redirected to onboarding from anywhere else, carrying the original intended destination.
6. Otherwise, proceed.

**Critical nuance, must be preserved exactly:** each claim check (`account_deleted`, `email_verified`, `onboarding_completed`) **fails open** when the claim is simply *absent* — only an explicit `true`/`false` value triggers its gate. This avoids mass session bounces if a claim is introduced after some sessions were already issued.

## Acceptance criteria

- A table of claim combinations (each of the three claims: absent / true / false, crossed with authenticated/unauthenticated and current-screen-type) maps to the exact expected routing outcome per the rule ordering above — this table is written out and verified against, not just spot-checked.
- The guard runs on app launch and on every protected-screen navigation attempt (the mobile equivalent of "every request" — there is no per-request middleware on mobile, so this must be a navigator-level guard or an app-wide listener on session/claim changes).
- The "intended destination" is preserved through a sign-in → onboarding → final-destination chain, mirroring the web app's `next` parameter threading.
- A pending-MFA session (AUTH-3) is recognized as a distinct state and is not bounced by either the auth-only-screen redirect or the onboarding redirect.

## Out of scope

- The onboarding wizard's own internal step sequencing (`unit-02-profile`) — this story only owns the binary "has onboarding completed or not" gate.

## Dependencies

- Every other unit depends on this story being correct before its own screens can be meaningfully gated.
