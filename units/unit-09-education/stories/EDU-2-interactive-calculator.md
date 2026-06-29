# EDU-2 — Interactive scoring calculator

**Unit:** `unit-09-education` · **Placement:** Remote

## Story

As a user, I want to try entering a predicted and an actual score and see exactly how many points that would earn, so that I understand the scoring rules concretely rather than just reading about them.

## Source rules

`domain-overview.md §7`: "the educational calculator imports the same constants/function as real scoring — must never own its own copy"; the penalty-shootout input only appears for a tied knockout scenario, and the winner is always derived from the shootout score, never separately chosen.

## Acceptance criteria

- The calculator accepts a predicted score and an actual score (both editable) and shows the computed points and breakdown, computed via `unit-03-scoring` — not a reimplementation.
- A penalty-shootout input section appears only when the "knockout match" toggle is on and the actual score is entered as a tie; the predicted and actual shootout winners are both derivable only from shootout scores entered, never picked directly.
- The calculator includes a small number of pre-filled worked examples (mirroring the web app's three hardcoded examples) computed live via the real algorithm, so they can never drift out of sync with it.

## Dependencies

- `unit-03-scoring`.
