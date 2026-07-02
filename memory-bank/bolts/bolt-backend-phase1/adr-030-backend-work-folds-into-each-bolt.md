# ADR-030: From Bolt 7 onward, backend capability work folds into each bolt's Implement stage

## Status
Accepted (2026-07-01). Amends ADR-028's phased plan.

## Context
ADR-028 planned the backend as a separate track (Phase 1/2/3/4) independent of the mobile bolt-plan. Phase 1 had to retroactively cover capabilities for five already-built bolts (1, 2, 3, 5, 6) because the backend didn't exist when they were built — real catch-up work. Bolt 7 (Pools core) is next per the bolt-plan, and needs `pools.*` capabilities that no backend phase covers (Phase 1 explicitly deferred pools since no `pools-api.ts` existed on mobile yet).

## Decision
Starting with Bolt 7, each mobile bolt's **Implement** stage includes building its own matching backend capability handlers in `backend/` alongside the mobile UI/hooks — not as a separate, later "phase." A bolt that adds `X-api.ts` capabilities on the mobile side ships the corresponding `backend/src/routes/handlers.ts` entries (and any new Prisma model usage) in the same bolt, same Test stage.

ADR-028's Phase 2 (admin, → Bolt 12) / Phase 3 (sync+scoring, → Bolt 9) / Phase 4 (FCM/APNs, → Bolt 10) remain useful as a *reference* for which backend capability group maps to which future bolt, but are no longer scheduled as standalone work items — they'll be absorbed into those bolts when reached.

## Consequences
- No more backend/mobile drift — a bolt is only "done" when both sides work together, avoiding the kind of retroactive gap-filling Phase 1 required.
- Bolt 7's `model.md`/`design.md`/ADRs should explicitly plan the `pools.*` capability set (create/rename/delete/join-by-token/join-public/leave/kick/set-archived/update-visibility/update-members-can-invite/create-directed-invite/search-nicknames — see `betmeet-clone`'s real action inventory in the backend-phase1 audit for the reference behavior) alongside the mobile-side design.
- The `backend/` service's `README.md`/Prisma schema were already provisioned with `Pool`/`PoolMembership`/`PoolDirectedInvite` in Phase 1 (schema-only, unused) — Bolt 7 only needs to add handlers, no new migration.
