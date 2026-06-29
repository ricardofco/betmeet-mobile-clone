# ADMIN-2 — Force a match result

**Unit:** `unit-10-admin` · **Placement:** Remote

## Story

As an admin, I want to manually set a match's final result when the data provider is wrong, missing, or delayed, so that scoring isn't blocked or incorrect.

## Source rules

`domain-overview.md §5.7`: both teams must be assigned; tied knockout requires a penalty winner, consistent with any penalty scores supplied (the winner is derived from the scores, mismatches rejected); forcing synchronously re-scores every prediction for that match in the same operation, not eventually.

## Acceptance criteria

- The override form requires home/away scores; if the match is knockout and the scores are tied, a penalty winner selection (one of the two teams) is required and validated against any penalty score inputs for consistency, using the same derive-winner logic as `unit-03-scoring`.
- Submitting a non-knockout or non-tied match with a penalty winner supplied is rejected (mirrors `unit-05-predictions`' equivalent validation, but from the admin side).
- On success, the match is marked as manually overridden and finished; all predictions for that match are rescored immediately (the admin sees the league/global rankings reflect this without a separate manual "recalculate" step).
- A manually-overridden match is protected from being silently overwritten by a subsequent provider sync (server-side guarantee — this unit just needs to surface that the match is in "manual override" state clearly in the UI).

## Dependencies

- `unit-03-scoring` (penalty-winner derivation/validation parity).
- `unit-07-scoring-rankings` (the rescoring this action triggers).
- ADMIN-5 (access gate).
