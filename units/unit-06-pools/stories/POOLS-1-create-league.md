# POOLS-1 — Create a league

**Unit:** `unit-06-pools` · **Placement:** Remote

## Story

As a user, I want to create a league with a name, visibility, and capacity, so that I can invite others to compete with me.

## Source rules

`domain-overview.md §5.3`: name 3–60 chars; public league names must be unique among public leagues; capacity 2–100; `membersCanInvite` defaults on, applies only to private leagues.

## Acceptance criteria

- The creation form validates name length and capacity range client-side before submission.
- Creating a public league with a name already used by another public league is rejected with a clear "name already taken" error (server-checked, not just client-checked).
- On success, the creator becomes the league's owner and its first member, and lands on the new league's detail screen.
- Must be onboarded (`unit-02-profile`) to create a league.

## Dependencies

- `unit-02-profile` (onboarding gate).
- Backend create-league contract.
