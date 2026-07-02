/**
 * POOLS-1/POOLS-2 — capacity rule (model.md §2, domain-overview.md §5.3):
 * "Capacity: 2-100 members, enforced both client-side and transactionally
 * at join time."
 *
 * `validatePoolCapacity` is a plain shape check, used at creation-form
 * validation time. `hasCapacityFor` is a UI-affordance preview (e.g.
 * disabling a "join" button when a cached member count already looks full)
 * — **advisory only**. The actual race-condition guard is the backend's
 * `prisma.$transaction`-wrapped count-then-insert (design.md §2.1,
 * ADR-035) — this client-side copy can be stale the instant another
 * member joins concurrently, and must never be trusted as the real gate.
 */

export const MIN_POOL_CAPACITY = 2;
export const MAX_POOL_CAPACITY = 100;

export function validatePoolCapacity(capacity: number): boolean {
  return Number.isInteger(capacity) && capacity >= MIN_POOL_CAPACITY && capacity <= MAX_POOL_CAPACITY;
}

/** Advisory only — see module doc comment. */
export function hasCapacityFor(memberCount: number, capacity: number): boolean {
  return memberCount < capacity;
}
