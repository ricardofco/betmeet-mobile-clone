# ADR-001 — Navigation guard wiring: conditional screen-tree rendering, not action interception

## Context

AUTH-7 requires a single, central gate evaluated "on every protected-screen entry" — the mobile equivalent of `proxy.ts`'s Next.js Middleware (`domain-overview.md §6`). React Navigation (ADR-003, Bolt 0) has no per-request middleware concept. Two mechanisms were available to attach `evaluateGuard` (the pure function from `model.md §1`, reproducing AUTH-7's six rules verbatim and in order) to the navigator:

- **(a) Navigation-action interception**: wrap `navigationRef`/`dispatch`, or use `NavigationContainer`'s `state`/`onStateChange`, to inspect every navigation action *after* it occurs and dispatch a correction (reset/redirect) if the guard disallows it.
- **(b) Conditional screen-tree rendering**: the screens registered into `Stack.Navigator` are themselves an `if`-branched list, swapped wholesale whenever the guard's outcome changes (React Navigation's documented "authentication flows" pattern).

## Decision

Adopt **(b)**: a single top-level `AuthGatedNavigator` component (`src/host/auth/navigation/auth-gated-navigator.tsx`) reads `claims`/`status` from the Zustand auth-session store (ADR-002), calls `evaluateGuard` for the currently-targeted screen's declared `ScreenClass` (see ADR-004 for `ScreenClass`'s shape), and renders exactly one of five branches as the navigator's screen set:

- `EjectedTree` — fires sign-out as a one-shot side effect (rule 1), then falls through to `UnauthenticatedTree`.
- `UnauthenticatedTree` — registers only screens tagged `public` (rule 2).
- `VerifyEmailTree` — registers the `verify-email`-tagged screen plus every `public`-tagged screen (rule 3).
- `OnboardingTree` — registers only the `onboarding`-tagged screen (rule 5).
- `AppTree` — registers every `protected`-tagged screen, plus `auth-only`-tagged screens **only** when `claims.aal` indicates a pending MFA challenge (`current: 'aal1'`, `next: 'aal2'`) (rule 4 and its exception); otherwise `auth-only` screens are omitted entirely (rule 6 falls through to "otherwise proceed" for everything actually registered).

Intended-destination memory (rules 2 and 5's "remembering the originally intended destination") is a `pendingDestination` field on the same Zustand store (ADR-002), not React Navigation's own state — written when a `redirect`-with-`rememberDestination` outcome fires, read and cleared by whichever tree the user lands in once `evaluateGuard` lets them through.

## Alternatives considered and rejected

**(a) Action interception** was rejected because:
- It is structurally a "flash-then-correct" pattern: React Navigation renders the action's target screen for at least one frame before the interception callback can inspect and reverse it. A truly unauthorized screen could flicker into view, however briefly — unacceptable for a story explicitly framed around being "the single most domain-critical piece" of access control in the whole migration.
- `onStateChange` does not fire on cold launch (there is no prior state to change *from*), so the initial-screen decision would need a second, separately-maintained code path anyway — duplicating `evaluateGuard`'s call site rather than having one.
- It requires the guard to actively *correct* an already-dispatched navigation (calling `reset`/`navigate` reactively), which is harder to reason about and test than "this screen was never in the registered set to begin with."

## Consequences

- Every screen in the app — including ones added in later units/bolts — **must** register a `ScreenClass` tag (or tags, per ADR-004) into `src/host/auth/navigation/screen-registry.ts` to be reachable at all; an unregistered screen is, by construction, unreachable. This is a forcing function that keeps the guard's table complete as the app grows, not an optional convention.
- The guard runs on every render of `AuthGatedNavigator`, which is driven by Zustand store changes (session/claims changes) — not by a per-navigation-event hook. This satisfies AUTH-7's "runs on app launch and on every protected-screen navigation attempt" AC because an unauthorized screen is never in the tree to be navigated *into* — there is no discrete "attempt" event to hook in this design, by design.
- A brief loading/splash render is required between app launch and the first `onSessionChange` emission (`status: 'loading'` in the store) — this is not itself a `ScreenClass`-routed decision, just an explicit "we don't know yet" state, and is bounded to the time it takes Supabase/keychain to resolve the persisted session.
- If a future requirement needs true per-navigation-event correction (e.g. a rule that depends on transient navigation parameters the screen-tree branches can't express), revisiting this ADR is the correct path — not a silent parallel mechanism bolted on beside it.
