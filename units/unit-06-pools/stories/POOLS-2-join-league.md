# POOLS-2 — Join a league (token or public directory)

**Unit:** `unit-06-pools` · **Placement:** Remote

## Story

As a user, I want to join a league either by entering an invite code or by browsing public leagues, so that I can start competing.

## Source rules

`domain-overview.md §5.3`: invite tokens are 8 unambiguous characters (12-char fallback); capacity enforced transactionally at join time; joining is allowed at any time, including mid-tournament; joining a public league the user is already a member of is a soft no-op ("already a member," not an error).

## Acceptance criteria

- Entering a valid, non-full invite token joins the league immediately; an invalid token shows "invalid invite code"; a full league shows "this league is full."
- The public directory lists joinable public leagues (with a capacity/member-count indicator) and supports joining directly from the list.
- Attempting to join a public league the user already belongs to navigates them to it rather than showing an error.
- No "tournament has started" gate blocks joining at any point — this is deliberate, do not add one.

## Dependencies

- `unit-02-profile` (onboarding gate).
- Backend join contract (token redemption + public-directory join, both transactional on capacity).
