import type { PoolVisibility } from '@/domain/pools/pool';

/**
 * POOLS-4 — visibility change rule (model.md §7, domain-overview.md §5.3):
 * owner-only (see pool-membership-permissions.ts), idempotent when the
 * target type matches the current type, PUBLIC→PRIVATE always allowed,
 * PRIVATE→PUBLIC re-checks public-name uniqueness. Members and the invite
 * token are preserved across a visibility change — no function here
 * touches membership rows or the token; documented since it's easy to
 * assume a visibility change resets something and it does not.
 */

export function isVisibilityChangeNoOp(currentType: PoolVisibility, targetType: PoolVisibility): boolean {
  return currentType === targetType;
}

/** True only when switching *to* PUBLIC — PUBLIC→PRIVATE never needs a uniqueness check. */
export function requiresNameUniquenessCheck(targetType: PoolVisibility): boolean {
  return targetType === 'PUBLIC';
}
