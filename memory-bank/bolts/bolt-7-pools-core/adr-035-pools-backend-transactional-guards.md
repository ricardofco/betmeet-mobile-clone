# ADR-035 — Capacity and public-name-uniqueness races are closed transactionally/at the DB layer, never trusted to client-side pre-checks

## Status
Accepted (2026-07-01).

## Context

Two of `domain-overview.md §5.3`'s business rules are inherently
race-prone if enforced only as an application-level read-then-write:

- **Capacity** (2-100 members): if two users tap "join" on a
  `capacity: 2` pool with 1 existing member at nearly the same instant, a
  naive "count members, then insert if count < capacity" sequence run twice
  concurrently can both read `count = 1`, both pass the check, and both
  insert — leaving 3 members in a 2-capacity pool.
- **Public-name uniqueness**: two users renaming/creating pools to the same
  public name at nearly the same instant can both pass a naive "does this
  name already exist" pre-check before either write lands.

This is the same category of problem the kickoff-lock's
`prediction_lock_guard` Postgres trigger (Bolt 6, ADR-023) already solved
for a different resource — client-side/application-level checks are
advisory, and the actual guard must live where concurrent writes are
serialized.

## Decision

- **Capacity**: `pools.joinByToken` and `pools.joinPublic` wrap the
  membership-count read and the `poolMembership.create` insert inside one
  `prisma.$transaction`, so the count-then-insert sequence is atomic against
  concurrent joins on the same pool — reimplemented fresh (per
  `requirements.md §7.3`) against the same shape `betmeet-clone`'s real
  `joinPublicPool`/`joinPoolByToken` actions already use (read for reference
  behavior, not imported).
- **Public-name uniqueness**: the DB's existing partial unique index
  (`pools_public_name_unique` on `Pool.name` where `type = 'PUBLIC'`,
  already present in `schema.prisma`, provisioned in backend-phase1) is the
  **final** guard. `pools.create`/`pools.rename`/`pools.updateVisibility`
  each do a `findFirst` pre-check first (for a friendly, specific
  `NAME_TAKEN` error before attempting a write), then wrap the actual
  write in a `try/catch` that maps any unique-constraint violation to the
  same `NAME_TAKEN` error — closing the TOCTOU gap between the pre-check and
  the write without needing an explicit transaction (the index itself is
  the serialization point).
- Mobile's domain-layer equivalents (`hasCapacityFor`,
  `requiresNameUniquenessCheck`) remain **advisory-only** — they exist so
  the UI can show/hide an affordance or a fast client-side error before a
  round-trip, exactly the same "advisory client, authoritative server"
  discipline ADR-023 established for predictions' kickoff-lock, now applied
  to a second, structurally different resource (pools membership/naming
  rather than a single DB trigger on one table).

## Consequences

- No new Postgres trigger or migration is needed — the partial unique index
  already exists (backend-phase1 provisioning); this bolt only needs the
  transactional membership-insert pattern and the pre-check + catch-and-map
  pattern in the new handlers, both pure application-code decisions.
- The Test stage's real backend verification (curl + DB) must include an
  explicit **concurrent-join** check against a `capacity: 2` pool with 1
  existing member (two near-simultaneous `pools.joinByToken`/
  `pools.joinPublic` calls, or a manual second-caller scenario) and an
  explicit **concurrent-rename-to-same-public-name** check — not just the
  sequential happy/sad path, since the whole point of this ADR is a
  concurrency guarantee that a sequential test alone cannot prove.
- If a future load-test or production incident shows the transaction
  isolation level needs tightening (e.g. explicit `SERIALIZABLE` instead of
  Prisma's default), that is a follow-up, evidence-driven change — not
  something this bolt pre-emptively over-engineers without a measured
  problem, consistent with this project's "reach for
  `react-native-best-practices`-style diagnostics only on a measured
  problem" discipline applied to the backend side too.
