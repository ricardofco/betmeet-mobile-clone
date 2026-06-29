# Unit Brief — `unit-02-profile`

> **Intent:** `liga-mundial-mobile-migration` · **Federation placement:** Host bundle (requirements.md §7.4 — onboarding-completion gating is a load-bearing dependency of nearly every other flow).

## Purpose

Public identity management (nickname, avatar, locale) and the onboarding wizard that runs once per new user before they reach the rest of the app.

## Source rules

`domain-overview.md §5.2` (profile & nickname rules), `§4.4` (onboarding state machine), `§7` (dependency map — `getOnboardedUserId`-equivalent is a foundational dependency of pools/predictions/etc.).

## In scope

- Nickname: base (3–20 chars, `^[a-zA-Z0-9_-]+$`) + 4-digit discriminator assignment, availability check, the 30-day change cooldown with the onboarding + one-free-grace-change exemption.
- Avatar: three sources (Google photo, default seeded set, custom upload ≤5MB jpeg/png/webp) with the "custom upload is never silently overwritten by a Google photo refresh" rule.
- Locale preference (`es` default, `en`), explicit-user-choice-wins.
- The onboarding wizard: nickname → avatar → rules → notifications → [MFA setup, replacing the web app's passkey step per requirements.md §7.5] — linear, back-navigable, with `rules` and `notifications` steps explicitly skippable and non-blocking.
- Marking onboarding complete (the flag `unit-01-auth`'s navigation guard reads).

## Out of scope

- The navigation guard itself (`unit-01-auth` AUTH-7) — this unit only sets the flag it reads.
- TOTP enrollment mechanics (`unit-01-auth` AUTH-3) — the onboarding step here only invokes that flow, doesn't own it.
- Push permission/subscription mechanics (`unit-08-notifications`) — the onboarding notifications step invokes that unit's capability.

## Dependencies

- **Depends on:** `unit-01-auth` (must be authenticated to have a profile).
- **Depended on by:** `unit-05-predictions`, `unit-06-pools` (both require an onboarded user before allowing mutations), `unit-08-notifications` (onboarding step), `unit-09-education` (onboarding's rules step reuses education's content).

## Native modules

- `react-native-image-picker` (avatar selection from camera/library).

## Backend contract needed

Nickname availability check + assignment with cooldown enforcement, avatar-source state transitions, onboarding-completion flag write (`system-context.md §3` "Profile"). Avatar file upload itself goes through the Supabase Storage adapter (signed URL), per `system-context.md §2`.

## Unit-level acceptance criteria

- A brand-new user cannot reach any screen outside the onboarding flow until `onboarding_completed` is set (enforced by `unit-01-auth`'s guard, set by this unit).
- The nickname cooldown behaves exactly as specified: unlimited changes pre-onboarding, one free change post-onboarding, then 30 days between changes.
- Skipping the `rules` or `notifications` onboarding step never blocks completion and never gets re-shown as "incomplete" later.

## Risks

- Avatar upload (signed URL + native file picker) is the one piece of this unit with a real native-module dependency — confirm `react-native-image-picker` is linked before this unit is assigned to any remote (it currently isn't, it's host, so this is moot unless that placement changes).
- The onboarding step that replaces the web app's "passkey" step needs a concrete decision in Construction (likely: nothing, or a TOTP-enrollment nudge) — flagged, not decided here.

## Stories

See `stories/`: PROFILE-1 through PROFILE-5.
