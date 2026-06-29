# Unit Brief — `unit-06-pools`

> **Intent:** `liga-mundial-mobile-migration` · **Federation placement:** Remote (requirements.md §7.4 — cohesive, dependent on auth/profile, not a hot-path screen).

## Purpose

Leagues ("Pools"): creation, joining (by token or from a public directory), directed invites, membership management (leave/kick/owner constraints), visibility/settings, and the per-league predictions grid.

## Source rules

`domain-overview.md §5.3` (league rules, exhaustive), `§7` (dependency map: pools depends on profile for onboarding-gating, on notifications for invite events, on scoring-rankings for leaderboard cache invalidation).

## In scope

- Create a league: name (3–60 chars), type (public/private), capacity (2–100), `membersCanInvite` (private-only toggle).
- Join by invite token (8-char unambiguous alphabet, 12-char fallback) or from a public directory listing.
- Directed invites by nickname (`base#discriminator`) or email, with the public/private/`membersCanInvite` permission gating.
- Membership management: leave, kick (owner-only, cannot kick/leave self as owner), delete (owner-only) — all allowed **at any time**, including mid-tournament (the web app's earlier "freeze" rule was explicitly removed; do not reintroduce it).
- Owner-only settings: rename (re-checks public-name uniqueness), visibility toggle (preserves members + invite token either direction), `membersCanInvite` toggle (private leagues only).
- Personal per-member archive toggle (any member, doesn't affect membership/scoring).
- The per-league predictions grid, with the anti-bias rule: another member's prediction for a not-yet-kicked-off match is hidden from view; the viewer always sees their own immediately.
- Ownership-transfer capability invoked by `unit-01-auth`'s account-deletion flow (AUTH-6).

## Out of scope

- The leaderboard computation/display itself (`unit-07-scoring-rankings` — pools hosts the screen, that unit supplies the ranked data).
- The `POOL_INVITE` notification dispatch mechanics (`unit-08-notifications` — this unit only triggers the event).

## Dependencies

- **Depends on:** `unit-01-auth`, `unit-02-profile` (onboarding gate on every mutating action), `unit-04-competition` (team/match data for the predictions grid), `unit-08-notifications` (queues the invite event).
- **Depended on by:** `unit-01-auth` (AUTH-6's ownership-transfer step), `unit-07-scoring-rankings` (membership changes invalidate leaderboard data).

## Native modules

None beyond host-bundle peers.

## Backend contract needed

Full CRUD + membership + invite logic per `system-context.md §3` "Pools" — capacity and name-uniqueness races must be checked transactionally server-side, never client-validated-only.

## Unit-level acceptance criteria

- All membership lifecycle actions (join/leave/kick/delete) work correctly regardless of tournament state (no client-side "freeze" gate is implemented, matching the current, deliberate web-app behavior).
- The anti-bias masking rule holds: a league member cannot see another member's not-yet-locked prediction for any match, under any view in this unit.
- Public-league name uniqueness and capacity are enforced even under concurrent attempts (server-side, not assumed safe just because the client checked first).

## Risks

- The masking rule (`FR-REFINE-53.1` in the source) must be enforced server-side in the read response itself, not just hidden in the mobile UI — confirm the backend contract never sends the underlying data for a masked prediction (an unmasking-via-API-inspection bug would be a real privacy regression, not a cosmetic one).

## Stories

See `stories/`: POOLS-1 through POOLS-7.
