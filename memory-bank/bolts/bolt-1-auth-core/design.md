# Bolt 1 — Auth Core — Design Stage

> **Stage 2 of 5 (Design).** Component/data-flow design, host-vs-remote placement, navigation/state boundaries. Checkpoint: pause for approval before ADRs (where these proposals get formally decided/recorded).

This bolt is **host-placed** (`unit-brief.md`, `system-context.md §4`) — nothing here is a federated remote concern. The design below builds directly on Bolt 0's folders (`domain/platform/shared/host/remotes`, ADR-001), Bolt 0's existing `src/domain/auth/auth-claims.ts` and `src/platform/supabase/supabase-adapter.ts` (read in full before writing this), and `model.md`'s types from the previous stage.

## 1. File/module placement

```
src/
  domain/
    auth/
      auth-claims.ts            # (Bolt 0, unchanged) AuthClaims, AuthSession, TriStateClaim, isAuthenticated, isExplicitlyTrue/False
      screen-class.ts           # NEW — ScreenClass union (model.md §1)
      auth-guard.ts              # NEW — AuthGuardState pure function: evaluateGuard(claims, screenClass, destination) -> GuardOutcome (model.md §1, AUTH-7's 6 rules)
      sign-in.ts                  # NEW — SignInResult type + classifySignInError(...) pure mapper (model.md §2)
      sign-up.ts                  # NEW — SignUpResult type + classifySignUpError(...) pure mapper
      resend-cooldown.ts          # NEW — ResendCooldown, ResendAttemptResult, evaluateResendAttempt(...) pure function (model.md §2)
      __tests__/
        auth-guard.test.ts        # the AUTH-7 decision table, encoded as parametrized test cases — the AC's "table is written out and verified against" requirement lives here
        sign-in.test.ts
        resend-cooldown.test.ts

  platform/
    supabase/
      supabase-adapter.ts         # (Bolt 0, extended) add signUp/signInWithPassword/signOut/resendConfirmation method signatures + impls
      keychain-session-storage.ts # (Bolt 0, unchanged) AUTH-8's storage backing — already keychain, already the sole token-touching file
      config.ts                    # (Bolt 0, extended) real env-var injection wired for real this bolt (per activeContext.md's open item)
    backend-api/
      backend-api-client.ts        # (Bolt 0, unchanged this bolt) resend-cooldown server enforcement is a candidate consumer, see open question §2 below

  host/
    auth/
      auth-session-store.ts        # NEW — Zustand store (see §3)
      use-screen-class.ts           # NEW — small hook: given a route name, look up its declared ScreenClass (see §4)
      navigation/
        auth-gated-navigator.tsx    # NEW — the navigator-level guard component (see §2's chosen mechanism)
        screen-registry.ts          # NEW — the ScreenClass → route-name table every screen declares itself into
      screens/
        sign-in-screen.tsx           # NEW
        sign-up-screen.tsx           # NEW
        pending-confirmation-screen.tsx # NEW (AUTH-1's waiting state)
        verify-email-screen.tsx       # NEW (AUTH-7's rule-3 destination; also covers the "confirmation continuation" public sub-state structurally, see §4)
        unconfirmed-email-panel.tsx    # NEW — shared inline affordance (resend/change-email), used by both sign-in and verify-email screens (see §4, §5)
    navigation/
      root-navigator.tsx            # (Bolt 0, replaced) Home placeholder removed; now composes `AuthGatedNavigator` + the protected app stack
```

**Why `auth-guard.ts`/`screen-class.ts`/etc. live in `domain/auth/`, not `host/auth/`:** per ADR-001's inward-dependency rule, the guard's evaluation logic (`evaluateGuard`) has zero RN/React Navigation/Zustand imports — it is a pure function of plain data (`AuthClaims`, `ScreenClass`, `Destination`) to a plain `GuardOutcome` value, exactly like `model.md` specified. This is what makes the AUTH-7 decision table testable as fast, framework-free unit tests (Implement/Test stage) without mounting any navigator. Only the *wiring* of that pure function to React Navigation's actual screen tree is a `host/` concern.

**Why `sign-in.ts`/`sign-up.ts`/`resend-cooldown.ts` are similarly domain, not platform:** classifying a Supabase SDK error into `SignInResult`/`SignUpResult`/`ResendAttemptResult` is domain logic (a pure mapping/decision, per `model.md §2`), even though the *call* that produces the raw error is a platform (`SupabaseAdapter`) concern. The adapter's new auth methods (`signInWithPassword`, etc.) return the raw classified result already — the adapter is extended to call the domain classifier internally, so it returns `SignInResult` directly rather than a raw SDK error/`Session` object. This keeps "domain never imports platform" intact (ADR-001) while still keeping the classification logic itself testable as domain code: `platform/supabase/supabase-adapter.ts` imports `domain/auth/sign-in.ts`, never the reverse.

## 2. Navigation-guard wiring — the concrete mechanism

**Decision (proposed for next stage's ADR): a single top-level "auth-gated navigator" component that conditionally renders one of four screen-tree branches, driven by an app-wide listener on the Zustand auth-session store — not React Navigation's `state`/`onStateChange` interception.**

### Why not navigator-level interception (`onStateChange` / `beforeRemove` / per-screen `listeners`)

React Navigation has no per-request "middleware" concept (confirmed against AUTH-7's own framing — "there is no per-request middleware on mobile"). The two candidate mechanisms it does expose are:

- **(a) Intercepting navigation actions** (a custom `navigationRef` wrapper around `dispatch`, or `state`/`onStateChange` on `NavigationContainer`) — reactively inspect *every* navigation action after it already happened and dispatch a correction. This means the guard runs **after** React Navigation has already rendered the (unauthorized) screen for at least one frame, then has to programmatically reset/redirect — a flash-then-correct pattern. It also means re-deriving "which rule applies" inside an action-interception callback, duplicated against whatever drives the *initial* screen choice on cold launch (since `onStateChange` doesn't fire on first mount).
- **(b) Conditional rendering of the screen tree itself** (the official React Navigation "authentication flows" pattern: the screens available to `Stack.Navigator` are an `if`-branched list, swapped wholesale when auth state changes) — the guard becomes the **gate that decides which screen tree exists at all**, not a corrector that runs after a bad navigation already happened. An unauthenticated user's navigator literally does not contain `Home`/`Pools`/etc. as registered screens, so there is no "wrong screen" to flash — it cannot be reached, full stop.

**(b) is the chosen mechanism.** It matches AUTH-7's own framing exactly ("a navigator-level guard or an app-wide listener on session/claim changes" — picking the listener-driven variant of the navigator-level guard, not the action-interception variant) and it satisfies the AC's "runs on app launch and on every protected-screen navigation attempt" more naturally: it runs on every render of the gated tree, which **is** every navigation attempt, because an unreachable screen was never registered into the tree to begin with — there is nothing to "attempt" into.

### Concrete shape

`AuthGatedNavigator` (`host/auth/navigation/auth-gated-navigator.tsx`) is the new root of `RootNavigator`:

1. Reads `claims` and `status` (`'loading' | 'ready'`, see §3) from the Zustand auth-session store.
2. While `status === 'loading'` (no `onSessionChange` emission yet received since launch — there is no special domain state for this per `model.md §3`, it's purely a UI concern), renders a minimal splash/loading view — **not** a `ScreenClass`-routed decision, just "we don't know yet."
3. Once `status === 'ready'`, calls `evaluateGuard(claims, currentScreenClass, intendedDestination)` for the **current** declared screen class (read via `screen-registry.ts` + whatever route React Navigation's own state currently points at, or the default entry screen on cold launch) and renders exactly one of four screen-tree branches:
   - `EjectedTree` — fires `SupabaseAdapter`'s sign-out, then falls through to `UnauthenticatedTree` on the next render (eject is a one-shot side effect, not a persistent branch).
   - `UnauthenticatedTree` — registers only `public`-classed screens (sign-in, sign-up, forgot-password, reset-password, verify-email-as-public-continuation).
   - `VerifyEmailTree` — registers only the `verify-email`-classed screen plus all `public`-classed screens (rule 3's "public screens ... still reachable").
   - `OnboardingTree` — registers only the `onboarding`-classed screen.
   - `AppTree` — registers every `protected`/`auth-only` screen (rule 4's exception for pending-MFA is handled **inside** `AppTree`: `auth-only` screens stay registered and reachable only when `pendingMfa` is true; otherwise omitted, which is the render-level equivalent of "redirect home" — there is nothing to redirect *away from* if it was never rendered).
4. **Intended-destination memory**: when `evaluateGuard` returns a `redirect`-with-`rememberDestination` outcome (rules 2 and 5), the destination is written into the Zustand store (not React Navigation's own state) as `pendingDestination: Destination | null`. After a subsequent guard re-evaluation lets the user into `AppTree` (or `OnboardingTree` completing and re-running the guard), the consuming tree reads `pendingDestination`, navigates there once via `navigationRef.navigate(...)`, and clears it. This is the mobile equivalent of the web app's `next` query param — a single piece of state threaded through, not a navigation-stack trick.

### Why this is a strong ADR candidate

This decision trades a small "flash of a loading screen on cold launch" (acceptable, no public route can be "wrongly" reached during it) for eliminating an entire class of flash-then-correct bugs and for keeping `evaluateGuard` callable from exactly one place. The alternative (action interception) was seriously considered and rejected for the reasons above — this asymmetry, plus the fact that every later unit's screens must register their `ScreenClass` into `screen-registry.ts` to be gated at all, makes this exactly the kind of decision `system-architecture.md`'s ADR rule calls for ("each non-trivial architectural decision"). Flagging explicitly for the next stage.

## 3. Zustand store shape

`host/auth/auth-session-store.ts` — **one store**, the first real Zustand consumer (ADR-004):

```ts
type AuthSessionStoreState = {
  status: 'loading' | 'ready';   // 'loading' until the first onSessionChange emission since launch
  claims: AuthClaims;             // UNAUTHENTICATED_CLAIMS until ready+authenticated
  pendingDestination: Destination | null; // intended-destination memory, see §2
  setSession: (session: AuthSession | null) => void; // called by the onSessionChange listener
  setPendingDestination: (destination: Destination | null) => void;
};
```

**What it holds vs. what it doesn't:**
- Holds: `claims` (the derived shape `evaluateGuard` needs) and the loading/ready flag. **Does not hold raw tokens** (`accessToken`/`refreshToken`) — those stay inside `AuthSession` as returned by `SupabaseAdapter.getSession()`/`onSessionChange`, are read once by the store's `setSession` callback to extract `claims`, and are otherwise discarded by the store. This is AUTH-8's boundary rule (`model.md §3`) enforced structurally: even the Zustand store, which is global and easy to over-read from, never has a token to leak. Any caller needing a token for an actual API call goes through `BackendApiClient`/`SupabaseAdapter` directly, never through this store.
- Does not hold a derived `ScreenClass` lookup — that is a pure function of the *route*, not of session state, so it lives in `screen-registry.ts`/`use-screen-class.ts` (read at the point of use inside `AuthGatedNavigator`), not duplicated into the store.
- Does not hold `pendingMfa` as a separately computed boolean — `AuthGatedNavigator` derives it inline from `claims.aal` each render (one-line check, not worth a third piece of store state to keep in sync).

**Wiring to `SupabaseAdapter.onSessionChange` (AUTH-8):** a single effect, run once at the host's top level (inside `AppProviders` or immediately above `AuthGatedNavigator` — exact mount point is an Implement-stage detail, not re-decided here), subscribes:

```ts
useEffect(() => {
  const unsubscribe = getSupabaseAdapter().onSessionChange(session => {
    useAuthSessionStore.getState().setSession(session);
  });
  return unsubscribe;
}, []);
```

`setSession(null)` sets `claims: UNAUTHENTICATED_CLAIMS, status: 'ready'`. `setSession(session)` sets `claims: session.claims, status: 'ready'`. The very first emission (whether `null` or a real session) is what flips `loading → ready`; this matches `model.md §3`'s point that there is no separate "restoring" domain state to model — it's just "haven't received the first emission yet."

**What screens/the guard read vs. compute themselves:**
- `AuthGatedNavigator` reads `status`, `claims`, `pendingDestination` from the store; computes `pendingMfa` and calls `evaluateGuard` itself (the guard function is not itself stored — it's imported and called, keeping the store free of behavior).
- Individual screens (sign-in, sign-up, etc.) **do not read `claims` directly** for their own rendering logic — they call `SupabaseAdapter` auth methods and render based on the *local* `SignInResult`/`SignUpResult`/`ResendAttemptResult` returned, exactly as `model.md §2` shapes them. The only thing a screen reads from the global store is `setPendingDestination` (if it needs to record where a deep link was trying to go) — auth screens otherwise have no reason to read global claims, since by construction (per §2) they only ever render while the guard has already decided they're allowed to.

## 4. Screen/component breakdown

All components below are **presentation + local state only** — none of them call the Supabase SDK directly; all go through `SupabaseAdapter`/the domain classifiers per §1.

| Component | Responsibility | Notes |
|---|---|---|
| `SignInScreen` | Email + password form → `SupabaseAdapter.signInWithPassword()` → branches on `SignInResult`: `signed-in` does nothing itself (the guard's next render handles routing); `unconfirmed-email` renders `UnconfirmedEmailPanel` inline; `invalid-credentials` renders one generic error string. | `ScreenClass: 'auth-only'` (also reachable while unauthenticated, i.e. `'public'` — see open question below). |
| `SignUpScreen` | Email + password (≥8 chars, client-side pre-check mirroring the domain rule, not replacing server validation) → `SupabaseAdapter.signUp()` → on `pending-confirmation` result, navigates to `PendingConfirmationScreen`; on `validation-error`, inline field error; on generic `error`, one generic message. | `ScreenClass: 'auth-only'`/`'public'`. |
| `PendingConfirmationScreen` | The AUTH-1 AC's "email-verification waiting state" after sign-up. Shows the email address, a resend-confirmation affordance (reuses `UnconfirmedEmailPanel`'s resend half), and waits passively — actual confirmation arrives via deep link (out of this bolt's design scope per `model.md`'s "explicitly not modeled" list) and is observed through the same `onSessionChange` → guard re-evaluation path, not polled by this screen. | `ScreenClass: 'public'`. |
| `VerifyEmailScreen` | AUTH-7 rule 3's destination for an *already-authenticated* unconfirmed user (distinct from `PendingConfirmationScreen`, which is reachable pre/post-sign-up regardless of auth state — see open question below on whether these two should actually be the same screen). Renders `UnconfirmedEmailPanel`. | `ScreenClass: 'verify-email'`. |
| `UnconfirmedEmailPanel` | Shared, reusable: "resend confirmation" button (calls `evaluateResendAttempt`/the adapter's resend method, renders `sent` or `throttled` with remaining-seconds countdown per `model.md §2`'s AC) + a "change email" affordance (stub/disabled in this bolt — AUTH-5 is Bolt 2; leave the seam, per the unit brief's explicit instruction not to build it, but the button can exist and be visibly inert or absent — Implement-stage detail). | Not a screen — a composed panel embedded in both `SignInScreen`'s unconfirmed branch and `VerifyEmailScreen`. |
| `AuthGatedNavigator` | Non-visual-ish (renders a loading view in one branch, otherwise delegates) — the guard wiring itself, §2. | Lives in `host/auth/navigation/`, not `host/auth/screens/`. |
| `screen-registry.ts` | Not a component — the `routeName → ScreenClass` table every screen above (and every future protected screen in later bolts) registers into. | This is what keeps `evaluateGuard` callable without hardcoding screen names inside domain code. |

**Resolved by registry, not by new screen components:** "forgot-password" and "reset-password" screens are named in AUTH-7's rule 2 as reachable public screens, but their actual UI is AUTH-4 (Bolt 2, out of scope). This bolt reserves their route names + `ScreenClass: 'public'` in `screen-registry.ts` (so the guard's table is already complete) without building the screens themselves — consistent with `model.md`'s extension-seam instruction.

## 5. `vercel-react-native-skills` / `vercel-composition-patterns` — apply-now flags

- **Avoid boolean-prop proliferation on the auth forms.** `SignInScreen`/`SignUpScreen` should not grow `isLoading`/`hasError`/`isUnconfirmed`/`isThrottled` as separate boolean props/state slots on one component — model the `SignInResult`/`SignUpResult`/`ResendAttemptResult` discriminated unions (already designed in `model.md`) as the *single* piece of local state each screen branches a `switch`/exhaustive check on, not a pile of independent booleans. This is a direct application of `vercel-composition-patterns`' "avoid boolean-prop hell" guidance to local component state, not just props.
- **`UnconfirmedEmailPanel` as a small composed unit, not a copy-pasted block.** Since it's reused verbatim between `SignInScreen` and `VerifyEmailScreen` (§4), design it as one component taking `{ email, onResend }` rather than duplicating the resend-button/countdown logic in both screens — straightforward composition, no need for a render-prop/compound-component pattern given how small it is.
- **No list virtualization concerns in this bolt** (no FlashList candidate — auth screens are forms, not lists), so that rule is not applicable here; flagging only to confirm it was checked, not skipped.
- **Memoization**: the resend-cooldown countdown (likely a `setInterval`-driven remaining-seconds display) is the one place in this bolt with a ticking re-render — keep the countdown's interval/state scoped to `UnconfirmedEmailPanel` itself, not lifted into the Zustand store or a parent screen, so the 1-second tick doesn't cause `SignInScreen`/`VerifyEmailScreen` (or worse, `AuthGatedNavigator`) to re-render. This is a `vercel-react-native-skills` "don't cause unrelated re-renders" application, worth deciding now rather than retrofitting in Implement.
- **Native navigators**: already satisfied — `AuthGatedNavigator`'s branches all still resolve to `@react-navigation/native-stack` screens (ADR-003); the conditional-tree pattern in §2 is a standard, documented React Navigation pattern, not a custom JS-driven router.

## Open questions for the checkpoint

1. **`SignInScreen`/`SignUpScreen`'s `ScreenClass`**: are `auth-only` and `public` the same set of routes, or does `auth-only` need to be a *subset* of `public` modeled as two separate tags on one screen? Per AUTH-7 rules 2 and 4, every `auth-only` screen is also reachable while unauthenticated (rule 2's public set explicitly lists sign-in/sign-up/forgot-password/verify-email) — so in practice `auth-only ⊆ public`. Proposing in this design that a screen can declare **two** classes (e.g. `['public', 'auth-only']`) rather than `ScreenClass` being a strict enum a screen picks exactly one of — this is a refinement of `model.md`'s `ScreenClass` type that surfaced only once wiring it to concrete screens. Flagging for explicit sign-off before Implement encodes it one way or the other.
2. **`PendingConfirmationScreen` vs. `VerifyEmailScreen`**: are these genuinely two screens (one pre-auth post-signup, one for an authenticated-but-unconfirmed session reached some other way, e.g. signing in again before confirming) or should they collapse into one screen that the guard simply makes reachable from two different entry states? Leaning toward keeping them distinct per AUTH-7's literal rule-3 wording ("forced to a verify-your-email screen") vs. AUTH-1's literal wording ("taken to an email-verification waiting state") suggesting two named UX moments, but this is a judgment call worth a quick checkpoint confirmation, not a unilateral Implement-stage decision.
3. **Resend-cooldown's backend capability**: §1 notes `BackendApiClient` as a candidate path for the server-enforced cooldown (`system-context.md §3`), but the adapter boundary (§2 of `system-context.md`) is Supabase-only — cooldown enforcement is explicitly *not* a Supabase Auth built-in. Need to confirm in Implement whether this goes through `BackendApiClient.request({ capability: 'auth.resendConfirmation' })` (consistent with Bolt 0's `model.md` capability-naming convention) or is itself a Supabase Edge Function called via the adapter. Not blocking Design, but flagging so Implement doesn't have to re-derive this.

## Checkpoint

Pausing here for approval before the ADR stage, which will formally record: (a) the conditional-screen-tree guard-wiring mechanism over action-interception (§2 — the strongest ADR candidate), (b) the Zustand auth-session store's shape and its no-raw-tokens boundary (§3), (c) the domain/platform split for sign-in/sign-up/resend classification logic (§1), and any resolution of the open questions above.
