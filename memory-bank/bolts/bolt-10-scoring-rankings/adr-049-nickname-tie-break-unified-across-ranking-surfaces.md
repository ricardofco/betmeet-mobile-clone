# ADR-049 — Nickname-ascending tie-break unified across every ranking surface (global, pool, live projection)

## Status
Accepted (2026-07-06).

## Context

`model.md §2/§3/§4` found a genuine, confirmed **internal inconsistency** in
`betmeet-clone`'s own real code, not a spec ambiguity:

- **Global ranking** (`queries.ts:50`) sorts by `totalPoints` desc, then
  `nickname` ascending (locale-aware compare) — a nickname tie-break exists.
- **Pool leaderboard, confirmed/non-live** (`queries.ts:144`) sorts by
  `totalPoints` desc **only** — no secondary tie-break at all.
- **Live projection, both scopes** (`project-leaderboard.ts:153`) sorts by
  `projectedPoints` desc, then nickname ascending — a nickname tie-break
  exists again.

So betmeet-clone itself is inconsistent: two of its three ranking sorts have
a nickname tie-break, one (the confirmed pool leaderboard) does not. This
project's standing discipline (established at Bolt 3's ADR-011 and reused
throughout) is to resolve spec/reality conflicts by reading the real code,
never by picking a doc's prose — but an *internal* inconsistency inside the
real code itself is a different situation: there is no single "real
behavior" to faithfully port, only a choice between faithfully reproducing
betmeet-clone's own asymmetry or fixing it. `model.md §3` explicitly declined
to resolve this silently, flagging it instead as an open question for Design
(`model.md §8`).

The task's human checkpoint (`model.md §8` item 2) confirmed: **UNIFY**.
Nickname-ascending tie-break applies consistently across all three ranking
surfaces this bolt builds. This is a deliberate mobile-side product
improvement over betmeet-clone's own inconsistency, not a faithful
reproduction of it — the same spirit and same class of decision as Bolt 8's
ADR-040 (ownership transfer shipping as a standalone mobile affordance
beyond what betmeet-clone itself offers), just applied to a display-ordering
rule instead of a workflow affordance.

## Decision

`compareByNicknameAscending` (`src/domain/rankings/nickname-tie-break.ts`) is
the **one** secondary-sort function used by every ranking sort in this bolt:

- Global ranking, confirmed (already had this tie-break in betmeet-clone —
  unchanged behavior, now just expressed as a shared, reusable function
  rather than an inline `.sort()` comparator).
- Pool leaderboard, confirmed/non-live (betmeet-clone had **none** — this is
  the one behavior actually being added/changed relative to source).
- Live projection, both scopes (already had this tie-break in
  betmeet-clone — unchanged behavior).

`rank-projection.ts`'s `buildRankedView` takes exactly one tie-break function
as a parameter, and every call site passes `compareByNicknameAscending` —
there is no code path that could accidentally diverge the way betmeet-clone's
own three independent call sites did. This is structural unification, not a
convention that depends on every future call site remembering to pass the
same comparator.

This only affects the ordering of users who are **already tied** on points —
dense ranking (`model.md §5`) already assigns tied users the same
`position`, so this decision never changes anyone's rank, points, or
prize/standing outcome, only which of two equal-point users is listed first.

## Consequences

- One new, small, pure, fully-tested function (`compareByNicknameAscending`)
  is the single point of truth for tie-break order across all of this
  bolt's ranking surfaces — no future ranking-related bolt work can
  introduce a second, differently-ordered tie-break without a deliberate,
  visible new parameter at a `buildRankedView` call site.
- This bolt's pool-leaderboard confirmed ordering is a genuine, intentional
  divergence from betmeet-clone's real behavior. Recorded here explicitly so
  a future `betmeet-clone`-vs-mobile parity audit does not mistake this for
  a porting gap (same precedent as ADR-040's own equivalent note in
  `activeContext.md`/`progress.md` for ownership transfer).
- If a future product decision wants a *different* secondary sort (e.g.
  join-date, or no tie-break at all for a specific new ranking surface), that
  is a new ADR, not a silent edit to this shared function.
