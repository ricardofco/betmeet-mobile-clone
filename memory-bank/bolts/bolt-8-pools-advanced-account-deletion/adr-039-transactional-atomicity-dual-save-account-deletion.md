# ADR-039 — Dual-save and account-deletion's pool transfer batch use `prisma.$transaction` as the sole atomicity boundary

## Status
Accepted (2026-07-02).

## Context

Two flows in this bolt are explicitly named by the task brief as
all-or-nothing-or-it's-a-data-integrity-bug:

- **PREDICTIONS-3's dual-save**: writing a global prediction and a
  pool-scoped override together ("save as global too"). `betmeet-clone`'s
  own code comment on this is exact: *"Dual-save atómico: la global y el
  override del pool, todo o nada. Si la segunda escritura falla, la
  transacción revierte también la global."*
- **AUTH-6's account deletion**: reassigning or deleting every pool the
  user owns, in one batch, before the profile/auth-user deletion proceeds.
  A partial transfer (some pools reassigned, others left in a broken
  state) would corrupt pool ownership data and potentially strand a pool
  with no reachable owner.

This is a different risk category from Bolt 7's ADR-035 (concurrent
*races* between independent requests — capacity, name uniqueness). Here
the risk is a single request performing multiple related writes that must
either all succeed or all be rolled back — an atomicity problem, not a
concurrency problem, though both are closed the same structural way.

## Decision

- **`predictions.save`**: when `poolId` is set and `alsoSaveAsGlobal ===
  true`, both the global (`poolId: null`) and override (`poolId` set)
  upserts happen inside one `prisma.$transaction`. If either write throws
  (validation already happened before the transaction opens, but a DB-level
  failure — e.g. the `prediction_lock_guard` trigger rejecting a
  concurrently-locked row — can still occur inside it), the whole
  transaction rolls back; neither row is left in a half-written state.
  A regular (non-dual) pool-scoped save is a single-row write, unaffected.
- **`auth.deleteAccount`**: the entire per-pool transfer-or-delete batch,
  plus the removal of the user's remaining non-owner memberships, happens
  inside one `prisma.$transaction`. The handler re-derives which pools
  need an assignment **inside** this same logical unit of work (not
  trusting the client's assignment list as complete), and if any required
  assignment is missing, the transaction is never opened at all — the
  check happens before any write, so there is no partial-write case to roll
  back in that specific failure mode, only a clean rejection. If a DB-level
  failure occurs mid-transaction (e.g. a race with the target new owner
  leaving the pool between the read and the write), the whole batch rolls
  back and `auth.deleteAccount` returns `TRANSFER_FAILED` — the profile
  soft-delete and auth hard-delete steps that follow never run.
- No app-level compensating writes (e.g. "undo the global write if the
  override write fails") are used anywhere — the DB transaction is the
  only atomicity mechanism, extending ADR-035's "DB transaction/constraint
  as the real guard, mobile-side checks are advisory" pattern from a
  concurrency-race context to a multi-row-atomicity context.

## Consequences

- The Test stage must include an explicit **failure-path** test for each
  flow, not just the happy path (per the task brief's explicit
  instruction):
  - Dual-save: verify the transactional guarantee itself (both writes
    landing together on success), and verify that a rejected save (e.g.
    validation failure on the input before the transaction even opens)
    leaves neither row written — including the pre-existing global
    prediction, if any, provably unchanged.
  - Account deletion: submit a deletion request deliberately missing a
    required pool-ownership assignment, then assert via direct DB read
    that (a) every owned pool's `ownerId` is unchanged, (b) the profile's
    `deletedAt` is still `null`, and (c) the Supabase auth user still
    exists — proving the rejection happened *before* any destructive write,
    not partway through.
- This is the third distinct backend-side "authoritative guard, not
  trusted to the client" decision recorded in this repo (ADR-023 for
  kickoff-lock, ADR-035 for pools' races, this ADR for atomicity) — the
  pattern is now well-established enough that a future bolt introducing a
  new multi-row-write flow should default to a DB transaction without
  needing a fresh ADR to justify the choice, only to document its specific
  shape if it's non-obvious.
