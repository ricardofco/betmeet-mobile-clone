/**
 * PROFILE-1's nickname-change cooldown eligibility — the highest-risk logic
 * in this bolt (model.md §2.2). Corrected by ADR-011: there is exactly
 * **one** free post-onboarding nickname change, not two — confirmed against
 * `betmeet-clone`'s real `setNickname` server action, which gates on
 * `nicknameChangeCount >= 2` (counting the onboarding assignment itself as
 * change #1). This module's zero-based `postOnboardingChangeCount` excludes
 * the onboarding assignment, so the equivalent gate here is
 * `postOnboardingChangeCount >= 1` — see ADR-011 for the full mapping and
 * evidence trail.
 *
 * Pure function: `now` is injected, never read internally via `Date.now()`,
 * so this stays trivially testable (model.md §2.2).
 */
export type NicknameChangeEligibility =
  | { allowed: true }
  | { allowed: false; cooldownEndsAt: string };

const COOLDOWN_DAYS = 30;
const COOLDOWN_MS = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

export type NicknameCooldownInput = {
  onboardingCompleted: boolean;
  /**
   * Number of nickname changes made strictly after onboarding completed.
   * `0` = no post-onboarding change yet. Server-counted — the client never
   * keeps its own count across sessions.
   */
  postOnboardingChangeCount: number;
  /** ISO timestamp of the most recent *permitted* post-onboarding change, or null if none yet. */
  lastChangeAt: string | null;
  /** The "now" the eligibility is evaluated against — injected for testability. */
  now: string;
};

export function evaluateNicknameChangeEligibility(input: NicknameCooldownInput): NicknameChangeEligibility {
  // Unlimited while onboarding is incomplete — the gate condition simply
  // doesn't apply yet (mirrors the source's `existing?.onboardingCompleted`
  // check, ADR-011).
  if (!input.onboardingCompleted) {
    return { allowed: true };
  }

  // The one free post-onboarding grace change (ADR-011).
  if (input.postOnboardingChangeCount === 0) {
    return { allowed: true };
  }

  // From the second post-onboarding change onward, cooldown-gated by the
  // timestamp of the most recent permitted change.
  if (!input.lastChangeAt) {
    // Defensive: a non-zero count with no recorded timestamp shouldn't
    // happen against a correct backend, but fail open rather than block a
    // user on a malformed payload.
    return { allowed: true };
  }

  const lastChangeMs = Date.parse(input.lastChangeAt);
  const nowMs = Date.parse(input.now);
  const cooldownEndsMs = lastChangeMs + COOLDOWN_MS;

  if (nowMs >= cooldownEndsMs) {
    return { allowed: true };
  }

  return { allowed: false, cooldownEndsAt: new Date(cooldownEndsMs).toISOString() };
}
