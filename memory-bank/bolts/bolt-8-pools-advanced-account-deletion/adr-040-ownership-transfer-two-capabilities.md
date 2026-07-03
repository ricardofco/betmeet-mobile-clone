# ADR-040 — Ownership transfer ships as two capabilities sharing one backend service function

## Status
Accepted (2026-07-02).

## Context

`model.md`'s opening section already recorded and got sign-off on a
deliberate, mobile-specific product deviation from `betmeet-clone`: the
web app only ever transfers pool ownership as a side-effect of account
deletion (`transferOwnedPoolsForAccountDeletion`) — there is no standalone
"transfer ownership" UI anywhere in its real code. This repo's bolt-plan
and Bolt 7's own `model.md`/`design.md` both treat POOLS-7 as its own
story, and Bolt 7's `pool-settings-screen.tsx` comment reads as
anticipating a settings-screen affordance, not only a deletion-time one.
That business-rule decision was made and approved at Model stage. This ADR
records the resulting **technical** shape, which is a genuine
code-organization decision, not just a restatement of the product choice.

## Decision

Two capabilities, one shared backend service function:

- **`pools.transferOwnership({ poolId, newOwnerId })`** — the new,
  voluntary, single-pool affordance surfaced in Pool Settings. Owner-only,
  target must be a current member who isn't already the owner. On success:
  `ownerId` reassigned and the outgoing owner's `PoolMembership` row
  removed, in one `prisma.$transaction`.
- **`auth.deleteAccount`**'s internal logic performs the same
  reassign-and-drop-membership operation, but as a **batch** across every
  pool the deleting user owns, inside the larger deletion transaction
  (ADR-039) — it does not call `pools.transferOwnership` as a sub-request
  (that would mean opening a nested/separate transaction per pool inside
  an already-transactional batch, and would require re-deriving the
  "am I still allowed to delete this account" context per call rather than
  once).
- Both call into one shared `backend/src/services/account-deletion.ts`
  (or a small shared helper within it) for the actual
  reassign-ownership-and-drop-membership write shape, so the *rule*
  ("transferring always drops the old owner's membership row") is defined
  once and both call sites stay behaviorally identical — not two
  independently-drifting implementations of "what transfer means."

## Consequences

- A single-pool voluntary transfer and a deletion-time batch transfer are
  guaranteed to behave identically (same membership-removal semantics) by
  construction, not by convention or by two authors remembering to keep
  them in sync.
- `pools.transferOwnership` has no story-mandated notification/event side
  effect in this bolt's scope (unlike `pools.createDirectedInvite`, which
  at least has a documented, deferred `POOL_INVITE` event hook) — none
  exists in `betmeet-clone` to port, and no story in this bolt's scope
  requests one.
- If a future bolt adds pool-transfer history/audit logging, it has one
  natural place to add it (the shared service function) rather than two.
