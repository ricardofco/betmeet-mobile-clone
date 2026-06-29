# ADR-004 — `ScreenClass` as a tag array (not a single enum pick), and one merged pending-confirmation/verify-email screen

## Context

Two Design-stage open questions were resolved at the Design checkpoint and are recorded here as binding amendments to `model.md`'s original modeling and `design.md`'s screen breakdown:

1. `model.md §1` originally modeled `ScreenClass` as a single-pick union (`'public' | 'auth-only' | 'verify-email' | 'onboarding' | 'protected'`). Wiring it to concrete screens in Design surfaced that AUTH-7's rule 2 explicitly lists sign-in/sign-up/forgot-password/verify-email as `public`-reachable, while rule 4 separately calls the *same* screens `auth-only` for the purpose of bouncing an already-confirmed user away from them. A screen is simultaneously a member of both sets — a single-pick enum cannot express that without either duplicating screens under two different names or picking one tag and special-casing the other rule's check against route name instead of tag.
2. `design.md §4` originally proposed two screens — `PendingConfirmationScreen` (AUTH-1's post-signup waiting state) and `VerifyEmailScreen` (AUTH-7 rule 3's destination for an authenticated-but-unconfirmed session reached some other way) — and flagged as an open question whether they should be one screen or two.

## Decision

**1. `ScreenClass` becomes an array of tags, not a single enum value.** Each registered screen declares one or more tags from the same five-member vocabulary (`public`, `auth-only`, `verify-email`, `onboarding`, `protected`):

```ts
type ScreenClassTag = 'public' | 'auth-only' | 'verify-email' | 'onboarding' | 'protected';
type ScreenClass = ScreenClassTag[];
```

`screen-registry.ts` (ADR-001) stores `routeName → ScreenClass` (now a tag array). `evaluateGuard`'s rule checks change from `screenClass === 'public'` (equality) to `screenClass.includes('public')` (membership) wherever a rule reads the current screen's class — rules 2, 3, and 4 each check membership of exactly one tag they care about; a screen can satisfy more than one rule's "is this screen reachable" condition simultaneously, which is the actual AUTH-7 semantics, not an approximation of it. Concretely: sign-in/sign-up/forgot-password/verify-email-as-continuation are each tagged `['public', 'auth-only']`; the verify-email-as-rule-3-destination screen is tagged `['verify-email', 'public']` (also publicly reachable per rule 3's own wording, "with public screens ... still reachable"); the onboarding screen is tagged `['onboarding']`; everything else is `['protected']`.

This is a refinement of `model.md §1`'s `ScreenClass` definition, recorded here rather than silently edited into `model.md` after the fact — `model.md` is left as originally written (the single-pick version was a reasonable first modeling pass; the array shape is what survived contact with real screen wiring).

**2. `PendingConfirmationScreen` and `VerifyEmailScreen` merge into one screen component**, `src/host/auth/screens/verify-email-screen.tsx` (the `design.md §1` file list's name wins; `pending-confirmation-screen.tsx` is removed from the file plan). It is reachable from two distinct guard states — AUTH-1's post-signup `pending-confirmation` outcome (user not yet required to be "authenticated" in the rule-3 sense — depending on Supabase's actual sign-up behavior, the user may already have a session at this point) and AUTH-7 rule 3's authenticated-but-unconfirmed gate — and renders the same `UnconfirmedEmailPanel` (resend/change-email) either way. If the copy needs to differ slightly between the two entry states (e.g. "check your email to finish signing up" vs. "please verify your email to continue"), the screen branches internally on a navigation param (`{ reason: 'post-signup' | 'unconfirmed-session' }`) rather than being two components — an Implement-stage detail, not a new design decision.

## Consequences

- `evaluateGuard`'s implementation and its decision-table tests (`model.md`'s 11-row table) must be re-expressed against tag-membership checks, not equality checks, before Implement — flagged so the table itself doesn't need re-deriving, only the comparison operator each row's check uses.
- Every future screen registered into `screen-registry.ts` (this bolt's and every later one) declares an **array**, even if it's a single-element array (e.g. `['protected']`) — this is now the fixed shape, not a special case only auth screens use.
- One fewer screen component to build/maintain than originally planned in `design.md §4`; the two-entry-state branching is a navigation-param concern internal to one component, not a routing concern the guard needs to know about (the guard only ever routes to "the verify-email screen," singular, regardless of which state triggered it).
- `model.md` is intentionally left unamended (per Construction's own convention of recording refinements as ADRs rather than rewriting closed Model-stage artifacts) — anyone reading `model.md` in isolation should cross-reference this ADR for the as-built `ScreenClass` shape and the as-built screen count.
