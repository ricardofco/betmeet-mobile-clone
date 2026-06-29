# PROFILE-4 — Onboarding wizard

**Unit:** `unit-02-profile` · **Placement:** Host

## Story

As a new user, I want a short guided setup right after signing up, so that I arrive at the app with an identity and my preferences set.

## Source rules

`domain-overview.md §4.4`: linear steps `nickname → avatar → rules → notifications → [second-factor step, replacing the web's passkey step]`; supports stepping back; `rules` and `notifications` steps are explicitly skippable and never block completion; no "seen rules" state is persisted.

## Acceptance criteria

- The wizard presents steps in a fixed order; the user can go back one step at a time but cannot skip ahead past an incomplete required step (nickname and avatar are required; rules and notifications are skippable).
- Skipping `rules` or `notifications` completes that step with no error and no "you'll be reminded later" follow-up nag.
- The final step marks `onboarding_completed = true` via the backend contract, which `unit-01-auth`'s navigation guard then reads to release the user into the app.
- The "intended destination" the user was originally headed to before being routed into onboarding (per `unit-01-auth` AUTH-7) is honored once onboarding completes — the user lands there, not unconditionally on the app home.

## Out of scope

- The content of the `rules` step (`unit-09-education`) and the `notifications` step's actual subscription logic (`unit-08-notifications`) — this story owns the wizard shell/sequencing only.

## Dependencies

- `unit-01-auth` AUTH-7 (reads the completion flag this story sets).
- `unit-09-education`, `unit-08-notifications` (content/logic embedded in two of the steps).
