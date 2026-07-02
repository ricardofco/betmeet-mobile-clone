# ADR-033 — No "tournament freeze" gate on any pools membership action (explicit, permanent record)

## Status
Accepted (2026-07-01).

## Context

`domain-overview.md §5.3` states: *"Joining, leaving, kicking, and deleting
a league are allowed at any time — including after the competition has
started. An earlier 'freeze' rule (no membership changes mid-tournament)
was explicitly removed; do not reintroduce it without checking whether that
decision still holds."* `bolt-plan.md`'s Bolt 7 section repeats this as the
bolt's single named risk: *"the one subtlety is that no 'tournament freeze'
gate should be (re)introduced on any membership action — call this out
explicitly in review."*

This is easy to get wrong by analogy: this repo already has one very
similar-looking, **still-valid** time-based gate — predictions' kickoff
lock (`getPredictionEligibility`, Bolt 6, `domain-overview.md §4.2`). A
reviewer or a future contributor skimming both features could reasonably
(but incorrectly) assume pools has an equivalent "competition in progress"
gate, since predictions clearly does. `betmeet-clone`'s own action files
(`join-public-pool.ts`, `join-pool-by-token.ts`, `leave-pool.ts`,
`kick-member.ts`, `delete-pool.ts`) all carry an explicit code comment
flagging this exact removal (`"FR-REFINE-23: no longer gated by the
competition freeze"`), which is itself evidence the web team hit real
confusion or regression risk on this point historically.

## Decision

None of this bolt's pools mutation logic — mobile domain predicates
(`src/domain/pools/pool-membership-permissions.ts`) or backend handlers
(`pools.joinByToken`, `pools.joinPublic`, `pools.leave`, `pools.kickMember`,
`pools.delete`) — reads any competition/match/kickoff state. This was
verified explicitly during Model and Design stages (`model.md §6`,
`design.md §2.2`), not merely "happened to pass tests":

- No function signature in `pool-membership-permissions.ts` accepts a
  `Match`, `Competition`, or "now" parameter.
- No `pools.*` backend handler queries `Match`/`Competition`/
  `CompetitionPhase` tables.
- The Test stage includes an explicit regression test per membership
  action, asserting the action **succeeds** against a fixture pool
  associated with a competition/match state that is "in progress" or
  "finished" — proving the absence of a gate, not just the absence of a
  bug report.

## Consequences

- A code reviewer checking this bolt's PR should specifically look for the
  **absence** of any competition-state read in the five membership-mutating
  handlers as the actual passing condition for this review item — not just
  "did the happy path work."
- If a future bolt (or a future product decision) genuinely needs to
  reintroduce a freeze-style gate, that is a new, deliberate product
  decision requiring its own ADR that explicitly supersedes this one — it
  must never be reintroduced silently by a contributor pattern-matching
  against predictions' kickoff lock.
- This ADR exists specifically so the "don't reintroduce it" instruction in
  `domain-overview.md §5.3` has a permanent, named architectural record
  beyond a single line of prose — the same durability `ADR-023` gave
  predictions' "advisory-only, backend-authoritative" kickoff-lock
  discipline.
