# RANKINGS-1 — Global ranking display

**Unit:** `unit-07-scoring-rankings` · **Placement:** Remote

## Story

As a user, I want to see how I rank against everyone in the app, so that I know how I'm doing overall.

## Source rules

`domain-overview.md §5.6`: dense ranking ("1, 1, 2"), a deliberate product decision; tie-break for stable ordering only (not product-meaningful).

## Acceptance criteria

- The global ranking list shows each user's total points and dense rank; multiple users with the same total share the same rank number, and the next distinct total's rank is exactly one more (never skips).
- The viewer's own row is identifiable/highlighted in the list.
- The list updates after any match is scored (via the live-results signal or a manual pull-to-refresh at minimum).

## Dependencies

- Backend global-ranking read contract.
