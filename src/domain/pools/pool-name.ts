/**
 * POOLS-1/POOLS-4 — name rule (model.md §3, domain-overview.md §5.3): 3-60
 * chars, trimmed. Public-pool uniqueness is inherently backend-only (needs
 * a DB round-trip) — this module only owns the length/trim shape check;
 * uniqueness is surfaced to the UI as a save-time `NAME_TAKEN` error, never
 * a live-typing check.
 */

export const MIN_POOL_NAME_LENGTH = 3;
export const MAX_POOL_NAME_LENGTH = 60;

export function validatePoolName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length >= MIN_POOL_NAME_LENGTH && trimmed.length <= MAX_POOL_NAME_LENGTH;
}

export function normalizePoolName(name: string): string {
  return name.trim();
}
