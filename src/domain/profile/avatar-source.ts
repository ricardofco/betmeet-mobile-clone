/**
 * PROFILE-2's avatar-source value object (model.md §2.3). Avatar-source
 * state transitions (e.g. the "custom upload is sticky, never silently
 * overwritten by a Google photo refresh" rule) are entirely backend-owned
 * (system-context.md §3) — this file holds only the shape, no transition
 * logic, per model.md §4's "PROFILE-2 — Avatar precedence on Google
 * re-sign-in" note.
 */
export type AvatarSourceKind = 'google' | 'default' | 'custom';

export type AvatarState = {
  source: AvatarSourceKind;
  url: string;
};
