# Bolt 1 — Auth Core — Model Stage

> **Stage 1 of 5 (Model).** DDD domain modeling, framework-free, no UI. Checkpoint: pause for approval before Design.

## Scope recap

This bolt covers three stories: **AUTH-1** (email/password sign-up & sign-in), **AUTH-7** (the session/navigation guard — "the single most domain-critical story in the whole migration"), and **AUTH-8** (secure session persistence). Per `unit-brief.md`, OAuth (AUTH-2), TOTP MFA enrollment/challenge (AUTH-3), forgot/reset password (AUTH-4), change password/email (AUTH-5), and account deletion (AUTH-6) are **out of scope** — modeled here only as a recognized-but-inert state (the pending-MFA `aal1`/`aal2` case) or an explicit extension seam, never built out.

This bolt is the first real consumer of `AuthClaims`/`AuthSession` (Bolt 0 model.md) and of Zustand (ADR-004) — it does not redefine those types, it builds on them.

## 1. The session/auth domain model

### `Claim<T>` — the tri-state value type (ubiquitous, not new, reaffirmed here)

Bolt 0 already encodes each gating claim as `boolean | null` on `AuthClaims`, where `null` means "claim absent, fail open." This bolt is the first to build real logic on top of that type, so it is worth naming the pattern explicitly as a reusable value-object shape:

```ts
type Claim = true | false | null; // null = "absent" = fails open; true/false = explicit = strict
```

`AuthClaims` (from Bolt 0, unchanged, just exercised here):

```ts
type AuthClaims = {
  sub: string | null;
  emailVerified: Claim;
  onboardingCompleted: Claim;
  accountDeleted: Claim;
  aal: { current: 'aal1' | 'aal2'; next: 'aal1' | 'aal2' } | null;
};
```

**Domain rule, restated precisely because AUTH-7 depends on it being unambiguous:** "explicit `true`" and "explicit `false`" are the *only* two values that ever trigger a gate. `null` (absent) always means "treat as if this gate does not apply," for all three of `accountDeleted`, `emailVerified`, `onboardingCompleted` — independently per claim. A session can simultaneously have `emailVerified: null` (fail open, gate doesn't fire) and `onboardingCompleted: false` (gate fires) — the three claims are evaluated independently, not as a single combined flag.

### `ScreenClass` (value object) — what AUTH-7 routes against

The guard's rules 2–5 talk about screen *categories*, not individual screen names. Modeling the category as its own value object keeps the guard's rule table closed and finite, rather than a per-screen `if` chain that drifts as new screens are added:

```ts
type ScreenClass =
  | 'public'              // sign-in, sign-up, forgot-password, reset-password, verify-email, and equivalents (rule 2's reachable set)
  | 'auth-only'            // sign-in, sign-up, forgot-password, verify-email (rule 4's redirect-away set — NOTE: overlaps with 'public', see open question below)
  | 'verify-email'         // the "verify your email" screen itself (rule 3's destination, also a 'public'-reachable screen)
  | 'onboarding'           // the onboarding gate/wizard entry (rule 5's destination)
  | 'protected';           // everything else — home, predictions, pools, profile, etc.
```

Every concrete screen the navigator registers declares exactly one `ScreenClass`. This is metadata the guard consumes; it is not UI.

### `AuthGuardState` (the navigation-guard state machine) — AUTH-7's six rules, reproduced verbatim and in order

The guard is a **pure function** of `(claims: AuthClaims | null, currentScreenClass: ScreenClass, intendedDestination: Destination)` → `GuardOutcome`. `claims === null` means unauthenticated (no session at all — distinct from an authenticated session whose claims happen to be all-`null`/absent).

```ts
type Destination = { screenClass: ScreenClass; route: string; params?: unknown };

type GuardOutcome =
  | { type: 'eject' }                                                       // rule 1
  | { type: 'redirect'; to: 'sign-in'; rememberDestination: Destination }   // rule 2
  | { type: 'redirect'; to: 'verify-email' }                                // rule 3
  | { type: 'redirect'; to: 'home' }                                        // rule 4
  | { type: 'redirect'; to: 'onboarding'; rememberDestination: Destination }// rule 5
  | { type: 'proceed' };                                                    // rule 6 (incl. rule 4's pending-MFA exception)
```

**Rule ordering — reproduced exactly as AUTH-7 states it, in this order, first match wins:**

1. A session whose `account_deleted` claim is **explicitly `true`** is ejected (forced sign-out), even if the JWT itself still cryptographically verifies.
2. An unauthenticated user may only reach public screens (sign-in/sign-up/forgot-password/reset-password/verify-email and equivalents); everything else routes to sign-in, remembering the originally intended destination.
3. An authenticated-but-unconfirmed-email user (`email_verified === false`, explicit-false only) is forced to a "verify your email" screen, with public screens (including any confirmation continuation screen) still reachable.
4. An authenticated+confirmed user on an auth-only screen (sign-in/sign-up/forgot-password/verify-email) is redirected to the app home — **unless** they have a pending MFA challenge (`aal1` with `nextLevel === "aal2"`), in which case they are let through to complete it.
5. An authenticated+confirmed user who hasn't finished onboarding (`onboarding_completed === false`, explicit-false only) is redirected to onboarding from anywhere else, carrying the original intended destination.
6. Otherwise, proceed.

**Pending-MFA as a distinct recognized state (not built, but not bounced either):** a session is "pending MFA" exactly when `claims.aal !== null && claims.aal.current === 'aal1' && claims.aal.next === 'aal2'`. This bolt does not build the MFA challenge screen (AUTH-3, Bolt 2) — it only ensures the guard's rule 4 exception evaluates this condition correctly so that when AUTH-3 ships, the guard does not need to be touched again. A pending-MFA session is still "authenticated" for rules 2/3/5 (it has a `sub`, it can have `emailVerified`/`onboardingCompleted` claims independently of `aal`) — `aal` is an orthogonal axis, not a fourth value of "authenticated-ness."

**Decision table (the AUTH-7 acceptance-criteria deliverable: every claim combination × screen class × auth state → outcome).** Columns: `accountDeleted` / `emailVerified` / `onboardingCompleted` each take `absent (∅) | true (T) | false (F)`; `authenticated` is `no | yes`; `pendingMfa` only meaningful when `authenticated = yes`.

| # | authenticated | accountDeleted | emailVerified | onboardingCompleted | pendingMfa | screenClass | Outcome (rule fired) |
|---|---|---|---|---|---|---|---|
| 1 | yes | **T** | any | any | any | any | `eject` (rule 1) |
| 2 | no | n/a | n/a | n/a | n/a | public | `proceed` (rule 2) |
| 3 | no | n/a | n/a | n/a | n/a | auth-only / verify-email / onboarding / protected | `redirect sign-in` (rule 2) |
| 4 | yes | ∅/F | **F** | any | any | public / verify-email | `proceed` (rule 3) |
| 5 | yes | ∅/F | **F** | any | any | auth-only / onboarding / protected | `redirect verify-email` (rule 3) |
| 6 | yes | ∅/F | ∅/T | any | yes | auth-only | `proceed` (rule 4 exception) |
| 7 | yes | ∅/F | ∅/T | any | no | auth-only | `redirect home` (rule 4) |
| 8 | yes | ∅/F | ∅/T | **F** | any | public / verify-email / protected (not auth-only) | `redirect onboarding` (rule 5) |
| 9 | yes | ∅/F | ∅/T | ∅/T | any | protected | `proceed` (rule 6) |
| 10 | yes | ∅/F | ∅/T | ∅/T | any | public / verify-email | `proceed` (rule 6 — already-onboarded user revisiting a public screen that isn't auth-only, e.g. a stray deep link to forgot-password) |
| 11 | yes | ∅/F | ∅/T | ∅/T | any | onboarding | `proceed` (rule 6 — already-onboarded user can still reach the onboarding screen class directly; nothing in rules 1–5 redirects them away from it) |

Rows 4–5 and 8 deliberately collapse `accountDeleted ∈ {∅, F}` into one row each — since rule 1 only fires on explicit `true`, `∅` and `F` are behaviorally identical for every later rule; this is the fail-open semantic doing exactly its job. Same logic applies to `emailVerified ∈ {∅, T}` in rows 6–11 and `onboardingCompleted ∈ {∅, T}` in rows 9–11.

**Open question flagged for Design, not resolved here:** row 5 says an unconfirmed-email user on the `onboarding` screen class is redirected to verify-email by rule 3 (it fires before rule 5 ever runs, since rule 3 is strictly earlier in the order) — this is correct per the rule ordering, but it means an unconfirmed user can never reach onboarding even transiently, which matches AUTH-7's own ordering and needs no design change; flagging only so Design doesn't "fix" it as a perceived bug.

## 2. AUTH-1's sign-up/sign-in domain states

### `SignUpState` / `SignInOutcome`

```ts
type SignUpResult =
  | { type: 'pending-confirmation'; email: string }   // success path — AC: "taken to an email-verification waiting state"
  | { type: 'validation-error'; field: 'email' | 'password'; reason: string }
  | { type: 'error' };                                 // generic, no account-enumeration signal

type SignInResult =
  | { type: 'signed-in' }                               // guard (AUTH-7) decides where to land next
  | { type: 'unconfirmed-email'; email: string }        // distinct outcome, AC: "not a generic credential error"
  | { type: 'invalid-credentials' };                    // generic — deliberately indistinguishable from "no such account"
```

**Domain rule — password shape:** minimum length 8 (`domain-overview.md §5.1`); no further composition rule is specified (no forced uppercase/symbol), and this bolt does not invent one beyond the source rule.

**Domain rule — unconfirmed-email sign-in is a first-class outcome, not an error path.** `unconfirmed-email` is structurally distinct from `invalid-credentials` precisely so the UI can offer resend/change-email inline (AUTH-1 AC) — collapsing the two into one generic "sign-in failed" would lose information the domain explicitly wants preserved. At the same time, `invalid-credentials` must stay generic (no "no such email" vs. "wrong password" split) to avoid account enumeration — this is the same "fails open / strict on explicit" discipline applied to a different axis: **explicit unconfirmed state gets a specific outcome; everything else collapses to one generic outcome.**

### Domain state progression (the lifecycle AUTH-1 walks through)

```
unauthenticated
   │ sign-up (valid email + password ≥8 chars)
   ▼
pending-confirmation ──(user confirms via email link / deep link, AUTH-7 out of this bolt's UI scope)──▶ confirmed (≡ emailVerified: true) ──▶ guard decides: onboarding | home
   │
   │ sign-in attempt while still pending-confirmation
   ▼
unconfirmed-email-sign-in (distinct outcome, loops back to pending-confirmation with resend/change-email affordances)
```

`confirmed` here is not a new domain type — it is simply the moment `AuthClaims.emailVerified` transitions from `false`/absent to `true` server-side, observed via `SupabaseAdapter.onSessionChange`. AUTH-1 does not own that transition's mechanics (deep-link confirmation continuation is flagged in `unit-brief.md` as needing new design, not modeled further in this bolt — it is a recognized future seam, not built here); AUTH-1 only owns the sign-up/sign-in *initiation* and outcome classification.

### `ResendCooldown` (value object) — the 60-second-per-email domain rule

```ts
type ResendCooldown = {
  email: string;            // keyed by email, not user id — unconfirmed accounts may have no profile row yet (domain-overview.md §5.1)
  windowStartedAt: number;  // epoch ms of the last accepted resend
  windowSeconds: 60;        // fixed per source rule, not configurable per this bolt
};

type ResendAttemptResult =
  | { type: 'sent' }
  | { type: 'throttled'; remainingSeconds: number }; // AC: surfaces remaining wait time, never a silent failure
```

**Domain rule, restated to avoid it collapsing into a UI debounce:** this cooldown is **server-enforced** (`system-context.md §3`: "Backend: cooldown enforcement for resend" is in the capability-group table as a needed beyond-Supabase-Auth piece, and AUTH-1's own "Dependencies" section names it explicitly). The mobile client may *also* disable the resend button locally for UX smoothness, but the authoritative `ResendCooldown` state is server-side and keyed by email; the client-side debounce is a courtesy mirror of it, exactly the same relationship the kickoff-lock countdown has to its DB-enforced lock (`domain-overview.md §4.2`) — client state is advisory, server state is authoritative. This bolt models the *shape* of the rule (`ResendCooldown`, `ResendAttemptResult`) that the as-yet-unbuilt backend capability returns; it does not invent the backend's enforcement mechanism.

## 3. AUTH-8 — secure session persistence as a domain concept

There is no new business entity here — "secure persistence" is a **boundary rule**, not a value object with its own lifecycle. Stated precisely as the domain rule this bolt must hold:

- **Only the `SupabaseAdapter` (Bolt 0's seam) ever reads or writes a refresh/access token.** No store (including the Zustand auth-session mirror), no screen, no hook touches a token value directly — they only ever see the *derived* `AuthClaims`/`AuthSession.claims` shape, never the raw token strings, except transiently inside the adapter's own implementation.
- The adapter's storage backing is `react-native-keychain` (AUTH-8 AC), configured as the Supabase RN client's custom storage adapter — this is an **implementation detail of the adapter**, invisible to the domain model above. The domain model doesn't change shape based on what the storage backend is; if the backend were swapped later (different secure-storage library), `AuthSession`/`AuthClaims`/the guard/the sign-in flow would not need to change at all. That invisibility is the point of the boundary.
- **Restart-restores-session** and **sign-out-clears-completely** are not new states; they are two existing transitions on `AuthSession` observed through `onSessionChange`: app launch re-hydrates `AuthSession | null` from the adapter (a `null` initial emission means "no valid persisted session," which the guard already handles via rule 2 — no special "restoring" state needs to be modeled, since until the adapter resolves, the app simply has not yet received its first `onSessionChange` emission). Sign-out is the adapter clearing its keychain entry and emitting `null`.
- **Cross-account leak prevention** ("no stale token survives sign-out + sign-in-as-different-user") is a correctness property of the adapter's own clear-on-sign-out behavior, not a separate domain concept to define — flagged here as a property the adapter's Implement-stage tests must assert, not something Model needs its own type for.

## 4. Ubiquitous language glossary

| Term | Precise meaning in this bolt (binding for Design/ADR/Implement/Test) |
|---|---|
| **Claim** | One of the three tri-state (`true \| false \| null`) values decoded from the session JWT: `accountDeleted`, `emailVerified`, `onboardingCompleted`. `null` always means "absent," never "false." |
| **Fails open** | A claim's gate does not fire when the claim is `null` (absent) — the opposite of "strict." Applies independently per claim. |
| **Strict (on explicit value)** | A claim's gate fires only on an explicit `true` or `false`, never inferred from absence. |
| **Gate** | One of the six numbered checks in the guard's rule table; "a gate fires" means that rule's outcome is returned and no later rule is evaluated. |
| **Guard** | The single pure function (`AuthGuardState` logic) that evaluates the six gates in order on every protected-screen entry — the mobile equivalent of `proxy.ts`. |
| **Screen class** | The `ScreenClass` category (`public` / `auth-only` / `verify-email` / `onboarding` / `protected`) a registered screen declares, which the guard routes against instead of individual screen names. |
| **Intended destination** | The `Destination` the user was trying to reach when a redirect-with-memory rule (2 or 5) fired; threaded through sign-in → (possibly) onboarding → the final destination, mirroring the web app's `next` param. |
| **Eject** | Rule 1's outcome: forced sign-out of a session whose `accountDeleted` claim is explicitly `true`, regardless of JWT cryptographic validity. |
| **Pending MFA** | The `aal.current === 'aal1' && aal.next === 'aal2'` session state — recognized by the guard's rule 4 exception in this bolt, but not otherwise built (AUTH-3 is Bolt 2). |
| **Session** | The pair of `AuthClaims` + raw tokens (`AuthSession`, Bolt 0) representing the current Supabase Auth state; `null` means unauthenticated. Distinct from "claims," which is the decoded/derived part of a session. |
| **Confirmed (email)** | Shorthand for `emailVerified === true` — the state a sign-up's `pending-confirmation` outcome eventually transitions to. |
| **Unconfirmed-email sign-in** | The distinct `SignInResult` outcome returned when credentials are valid but the email is not yet confirmed — never collapsed into the generic invalid-credentials outcome. |
| **Cooldown window** | The 60-second-per-email server-enforced interval (`ResendCooldown`) during which a repeat resend-confirmation request is throttled, not silently dropped — keyed by email, not user id. |
| **Adapter** (in this bolt's context) | Shorthand for `SupabaseAdapter` (Bolt 0) — the only module permitted to read/write tokens; "going through the adapter" is the same sentence as "the only legal way to touch auth/session state." |
| **Account-enumeration signal** | Any sign-in response detail (timing, message wording) that would let an attacker distinguish "no such account" from "wrong password" — AUTH-1 requires this to never leak, hence the generic `invalid-credentials` outcome. |

## Explicitly not modeled in this bolt

- OAuth (AUTH-2), TOTP MFA enrollment/challenge mechanics (AUTH-3), forgot/reset password (AUTH-4), change password/email (AUTH-5), account deletion (AUTH-6) — recognized only where AUTH-7's rule table requires a seam (the pending-MFA `aal` check); nothing beyond that seam is built.
- The onboarding wizard's own step sequencing (`unit-02-profile`) — this bolt only owns the binary `onboardingCompleted` gate input, not the wizard.
- The email-confirmation deep-link continuation's concrete mechanics (PKCE/token_hash-as-deep-link redesign, flagged as needing new design in `unit-brief.md`) — recognized as a transition trigger (`pending-confirmation → confirmed`) but not designed here.
- Concrete navigator/route names, Zustand store shape, or React Navigation wiring — those are Design-stage decisions about *where these types live and how they're wired*, not what they *mean*.
- The backend capability contract for resend-cooldown enforcement (exact request/response shape) — `system-context.md §3` fixes that this capability must exist server-side; this bolt models only the cooldown's domain shape (`ResendCooldown`, `ResendAttemptResult`), not the wire contract.

## Checkpoint

Pausing here for approval before Design (component/data-flow design: where `AuthGuardState`/`ScreenClass`/`SignInResult`/`ResendCooldown` physically live in `src/domain/auth/`, how the guard attaches to React Navigation, and how the Zustand auth-session store is shaped/wired to `SupabaseAdapter.onSessionChange`).
