# ADR-038 — Anti-bias masking is computed exclusively server-side, in one auditable handler, with a permanent API-response-level test requirement

## Status
Accepted (2026-07-02).

## Context

`domain-overview.md §5.3`: *"A league's member list shows another member's
prediction for a match only after that match has kicked off (anti-bias) —
the viewer always sees their own immediately."* `betmeet-clone`'s real
implementation (`queries.ts`'s `getPoolMemberPredictions`) computes this
rule server-side, inside the query that builds the response, nulling
`predictedHome`/`predictedAway`/`totalPoints`/`matchedCase` and forcing
`isOverride`/`hasGlobal` to `false` for any row where `hidden` is true —
never merely omitting those values from what the UI chooses to render.

This bolt's task brief calls this out explicitly as the one privacy-critical
risk: *"must be verified at the API-response level, not just the UI — a
masking bug here is a real privacy regression."* A client-side-only
implementation (server sends the real values, the UI component decides not
to render them) would look identical in a screenshot but would be a real
data leak to anyone inspecting network traffic or a slightly different
client build.

## Decision

- The masking computation (`design.md §3.1`'s rule: `hidden = row.userId
  !== viewerUserId && !(kickoffAt != null && kickoffAt <= now)`) lives
  **exclusively** in the `pools.getMemberPredictions` backend handler,
  applied as the last step before the response object is built, in one
  auditable code block.
- This is the **only** capability that ever reads or serializes another
  member's pool-scoped prediction content. `predictions.getMyPredictions`
  is, and remains, filtered to `userId: auth.userId` only — already
  un-leakable by construction, confirmed unchanged by this bolt.
- Mobile's `src/domain/pools/predictions-visibility.ts` mirrors the same
  predicate **only** for defense-in-depth UI copy ("Hidden until
  kickoff") — it is never the reason a value is or isn't visible, since by
  the time a response reaches the client, a masked cell's numeric fields
  are already `null`. This is the same "advisory client, authoritative
  server" split every other pools/predictions rule in this repo uses
  (ADR-023/ADR-035), applied here to a privacy rule instead of a
  business-state mutation guard — a new rule *category* for this pattern,
  not a new pattern.

## Consequences

- **Permanent instruction, not just this bolt's Test stage**: any future
  change to `pools.getMemberPredictions` (or any handler added later that
  touches pool-scoped prediction data) must be re-verified with a raw
  HTTP-response-body inspection (curl or equivalent, two real accounts,
  one predicts on a not-yet-kicked-off match, the other requests the
  grid) — not merely a passing Jest unit test and not merely "the UI looks
  right." A unit test alone cannot distinguish "value is null because a
  component chose not to render it" from "value is null because the
  server never sent it," which is exactly the distinction that matters
  here.
- This bolt's own Test stage performs that exact curl-level check as part
  of Layer 1 (ADR-030's real-backend-verification discipline), not
  deferred to a hypothetical future Layer 2 device pass.
- If a future bolt adds any new read path over pool-scoped predictions
  (e.g. an export, an admin view, a notification payload), that new path
  must independently apply this same masking rule or explicitly document
  why it's exempt (e.g. an admin-only, verification-status-gated view) —
  it does not inherit safety from this handler's correctness.
