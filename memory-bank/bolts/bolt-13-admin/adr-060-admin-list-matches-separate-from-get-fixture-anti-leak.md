# ADR-060 — `admin.listMatches` ships as its own capability, never an extension of `competition.getFixture`

## Status
Accepted (2026-07-06).

## Context

ADMIN-4/5's match pickers need `AdminMatchRow`s carrying
`manualOverride`/`manualOverrideReason`/`overriddenByNickname`/`overriddenAt`
alongside the usual match/team/score fields (`design.md §6`).
`competition.getFixture` is the existing, **public**, unauthenticated-
content-shaped read that every authenticated user's Predictions/Rankings
screens already call on every visit. Adding admin-audit fields there would
leak another admin's identity plus their free-text override justification to
every regular user's fixture fetch, unless carefully filtered client-side —
exactly the class of risk ADR-038 (anti-bias masking, Bolt 8) already taught
this repo to avoid: masking/access-control decisions must be computed
server-side, never bolted onto an already-public capability and filtered on
the client.

## Decision

`admin.listMatches` is a fully separate, admin-gated capability
(`{ ok: true; matches: AdminMatchRow[] } | { ok: false; error: 'FORBIDDEN' }`),
independently `requireAdmin()`-checked (ADR-059), never an extension of
`competition.getFixture`'s response shape or query. `competition.getFixture`
itself is untouched by this bolt — no new optional fields, no new query
parameter, no conditional serialization branch based on caller identity.

This is accepted at the cost of a small amount of duplicated match-fetching
logic between `admin.listMatches` and `competition.getFixture` — a
deliberate, not accidental, duplication, the same trade-off this repo has
already made elsewhere to keep a security/privacy-relevant read fully
separate from a general-purpose one (ADR-038's `pools.getMemberPredictions`
staying fully separate from `predictions.getMyPredictions`).

## Consequences

- `competition.getFixture`'s public contract is provably unaffected by this
  bolt — a future reviewer diffing that handler will find zero changes from
  Admin's own work, which is itself evidence the anti-leak property holds
  structurally, not just by policy.
- If a future bolt needs any other admin-only view over match/fixture data
  (e.g. a second admin screen, an export, a reporting view), it should follow
  this same pattern — a fully separate, admin-gated capability — rather than
  bolting admin-only fields onto an already-public read and relying on
  client-side filtering to hide them. That new path does not inherit safety
  from this ADR automatically; it must independently apply the same
  server-side-only discipline or explicitly document why it's exempt (same
  closing instruction ADR-038 gives for any future pool-scoped-prediction
  read path).
- `admin-match-filters.ts`'s two pure array filters
  (`matchesEligibleForForceResult`/`matchesWithActiveOverride`,
  `design.md §5.3`) operate on `admin.listMatches`' own `AdminMatchRow`
  shape only — they are not, and must not become, a mechanism for deriving
  admin-only visibility from `competition.getFixture`'s public data
  client-side.
