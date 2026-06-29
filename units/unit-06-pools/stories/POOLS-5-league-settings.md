# POOLS-5 — League settings (owner-only)

**Unit:** `unit-06-pools` · **Placement:** Remote

## Story

As a league owner, I want to rename my league, change its visibility, control whether members can invite, or delete it, so that I can manage it as it evolves.

## Source rules

`domain-overview.md §5.3`: rename re-checks public-name uniqueness; visibility toggle preserves members and the invite token in either direction; switching to public re-checks name uniqueness, switching to private is always allowed; `membersCanInvite` only applies to private leagues; delete is owner-only and irreversible.

## Acceptance criteria

- Rename validates length (3–60) and, if the league is/becomes public, uniqueness — server-checked.
- Toggling visibility never loses members or invalidates the existing invite token.
- The `membersCanInvite` toggle is only shown/editable for private leagues; attempting to set it on a public league is a no-op with an explanatory message (public leagues always allow member invites by definition).
- Deleting a league is owner-only, requires explicit confirmation, and is irreversible (all memberships cascade-removed).

## Dependencies

- Backend league-settings contract.
