# POOLS-4 — Membership management (leave, kick, archive)

**Unit:** `unit-06-pools` · **Placement:** Remote

## Story

As a league member or owner, I want to leave a league, remove another member, or personally archive a league I'm no longer focused on, so that I can manage my own participation.

## Source rules

`domain-overview.md §5.3`: owner cannot leave or kick themself (must delete or transfer first); kicking/leaving is allowed at any time; archiving is a personal, per-member cosmetic toggle that doesn't affect scoring or membership.

## Acceptance criteria

- A non-owner member can leave at any time; the owner cannot leave (UI prevents the action with an explanatory message pointing to delete/transfer).
- The owner can kick any other member at any time; the owner cannot kick themself.
- Any member can archive/unarchive their own membership; this only affects what shows in their personal league list, nothing else.
- These actions work regardless of tournament/match state (no freeze gate).

## Dependencies

- Backend membership-management contract.
