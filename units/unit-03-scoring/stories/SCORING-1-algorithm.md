# SCORING-1 — Implement the scoring algorithm

**Unit:** `unit-03-scoring` · **Placement:** Shared library (no host/remote — see unit brief)

## Story

As any feature that needs to show or compute prediction points, I want a single correct implementation of the scoring algorithm, so that point totals are always consistent across the app.

## Source rules

`domain-overview.md §5.5`, verbatim:
```
EXACT_SCORE        = 5
CORRECT_RESULT     = 2
PARTIAL_GOAL_COUNT = 1   (home and away evaluated independently — both can apply)
MISS               = 0
PENALTY_BONUS      = 1   (only for a tied knockout match; winner always derived from the shootout score)
```

## Acceptance criteria

- Exact score match (predicted home/away both equal actual home/away) → 5 points, `matchedCase = EXACT`, no separate component breakdown.
- Otherwise: +2 if predicted result (home win / away win / draw) matches actual result; +1 if predicted home score equals actual home score; +1 if predicted away score equals actual away score (independently of the result match). `matchedCase` is `RESULT` if the result component fired, else `PARTIAL` if either goal-count component fired, else `MISS`.
- Penalty bonus (+1, independent of the base score) applies only when: the match is knockout, the regular/extra-time score is tied, a predicted shootout winner was supplied, and it matches the actual shootout winner.
- A "derive penalty winner from shootout score" helper exists and is the **only** way a penalty winner is ever produced (never accepted as a raw separate input) — a tied shootout score has no valid winner (returns null/invalid).
- All verified web-app test cases pass identically (see unit brief).

## Dependencies

None.
