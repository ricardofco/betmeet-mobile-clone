# PREDICTIONS-5 — Display resolved points and scoring status

**Unit:** `unit-05-predictions` · **Placement:** Host

## Story

As a user, I want to see how many points I earned for a finished match's prediction (and why), so that I understand my score.

## Source rules

`domain-overview.md §5.5`/§4.1; the resolution precedence (mirroring the web app's `resolvePoints`): scored > cancelled/postponed (never scoreable) > pending-scoring (finished but not yet processed) > not-scored (no prediction or match not finished).

## Acceptance criteria

- A finished, scored match shows the user's earned points and a breakdown (exact / correct result / correct goal count per side / penalty bonus) consistent with `unit-03-scoring`'s algorithm.
- A finished match whose scoring hasn't been processed yet (a brief window after the match ends) shows a distinct "pending" state, not a misleading "0 points" or blank.
- A cancelled or postponed match's prediction shows a clear "not scoreable" state, never a numeric 0 that could be mistaken for a scored miss.
- An unscored, not-yet-finished match's prediction shows neither a point value nor a "pending" state — just the prediction itself.

## Dependencies

- `unit-07-scoring-rankings` backend contract (the authoritative resolved-points read).
- `unit-03-scoring` (breakdown display).
