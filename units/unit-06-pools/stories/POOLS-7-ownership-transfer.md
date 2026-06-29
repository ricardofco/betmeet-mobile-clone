# POOLS-7 — Ownership transfer (account-deletion integration)

**Unit:** `unit-06-pools` · **Placement:** Remote (capability invoked from `unit-01-auth`'s host-bundle account-deletion flow)

## Story

As a user deleting my account, I need a way to hand off or close the leagues I own, so that other members aren't left in a broken state.

## Source rules

`domain-overview.md §5.1`/`§5.3`: an owned league with other members and no chosen successor blocks deletion until resolved; a sole-member owned league is deleted outright, no successor needed.

## Acceptance criteria

- This unit exposes a capability (UI component and/or data query) that `unit-01-auth`'s AUTH-6 story can surface inline during account deletion: list every league the user owns, and for each one with other members, let them pick a successor from the existing membership list (oldest member first, as a sensible default ordering).
- A league with no other members is flagged for outright deletion, not successor-selection.
- The transfer/deletion is committed atomically as part of the account-deletion flow — this story does not implement deletion confirmation UX itself (that's AUTH-6), only the data/transfer mechanics pools owns.

## Dependencies

- `unit-01-auth` AUTH-6 (the caller/orchestrator of this capability).
- Backend ownership-transfer contract.
