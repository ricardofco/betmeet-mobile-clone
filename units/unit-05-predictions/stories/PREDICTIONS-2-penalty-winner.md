# PREDICTIONS-2 — Penalty-winner selector for tied knockout matches

**Unit:** `unit-05-predictions` · **Placement:** Host

## Story

As a user predicting a knockout match, I want to pick who I think wins on penalties if I predict a tie, so that my prediction captures a real possible outcome.

## Source rules

`domain-overview.md §5.4`: if knockout-phase AND the predicted score is a draw, a penalty-winner pick is **required** (must be one of the two match teams); if not knockout-and-a-draw, supplying a penalty winner is itself rejected by the server (the UI should not even offer the control in that case).

## Acceptance criteria

- The penalty-winner control appears only when the match is in a knockout phase **and** the currently-entered predicted score is a draw; it disappears immediately if the user changes the score to a non-draw.
- Submitting a knockout-tied prediction without a penalty winner is rejected client-side before any network call, with a clear "pick who advances on penalties" message.
- The chosen winner must be one of the two match's teams (the control only ever offers those two options — no free-form input).
- If the server rejects a submission for a penalty-winner mismatch (e.g. stale client state after a team placeholder resolved), the error is surfaced clearly and the form re-syncs to current match data.

## Dependencies

- PREDICTIONS-1.
- `unit-03-scoring`'s `derivePenaltyWinner`-equivalent concept (conceptual parity, not necessarily shared code, since this story is about input collection, not score computation).
