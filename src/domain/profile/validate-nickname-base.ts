/**
 * PROFILE-1's nickname base validation (model.md §2.1). Pure, client-side,
 * format-only — never decides "taken", which is always a backend round-trip
 * (`interpretAvailabilityResponse` below). Keeping format vs. uniqueness in
 * separate functions means the format check runs instantly before any
 * network call (PROFILE-1 AC: "rejected client-side before any network
 * call").
 */
export type NicknameAvailability =
  | { status: 'available' }
  | { status: 'taken' }
  | { status: 'invalid'; reason: 'too-short' | 'too-long' | 'invalid-characters' };

const MIN_BASE_LENGTH = 3;
const MAX_BASE_LENGTH = 20;
const BASE_PATTERN = /^[a-zA-Z0-9_-]+$/;

/**
 * Validates only the `base` portion of `base#NNNN` (domain-overview.md §5.2):
 * 3–20 chars, `^[a-zA-Z0-9_-]+$` only. Never returns `'taken'` — that status
 * only comes from interpreting a backend response.
 */
export function validateNicknameBase(base: string): NicknameAvailability {
  if (base.length < MIN_BASE_LENGTH) {
    return { status: 'invalid', reason: 'too-short' };
  }
  if (base.length > MAX_BASE_LENGTH) {
    return { status: 'invalid', reason: 'too-long' };
  }
  if (!BASE_PATTERN.test(base)) {
    return { status: 'invalid', reason: 'invalid-characters' };
  }
  return { status: 'available' };
}

/**
 * Maps the backend's `profile.checkNicknameAvailability` response
 * (design.md §3.1) onto the same `NicknameAvailability` shape, so callers
 * can render one unified "what's wrong" message regardless of which check
 * produced it.
 */
export function interpretAvailabilityResponse(raw: { available: boolean }): NicknameAvailability {
  return raw.available ? { status: 'available' } : { status: 'taken' };
}
