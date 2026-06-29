# Unit Brief — `unit-09-education`

> **Intent:** `liga-mundial-mobile-migration` · **Federation placement:** Remote (requirements.md §7.4 — static, low-frequency content, ideal for deferred download).

## Purpose

The Rules Center (bilingual rules content) and an interactive "try it yourself" scoring calculator — purely informational, never mutates domain data, and must never define its own scoring rules (always imports `unit-03-scoring`).

## Source rules

`domain-overview.md §7` ("education → scoring: the educational calculator imports the same constants/function as real scoring — must never own its own copy"; "predictions → education: the real prediction-vs-result UI reuses education's score-breakdown explainer component").

## In scope

- Rules content display, bilingual (`es`/`en`, matching `unit-02-profile`'s locale setting): scoring rules, penalty-winner rules, prediction lock timing, ranking ties, league types — the same topic set as the web app's `content/rules/{es,en}/*.mdx`.
- An interactive scoring calculator: user enters a predicted and an actual score (plus an optional penalty shootout for a tied knockout scenario) and sees the computed points, via `unit-03-scoring`.
- The onboarding "rules" step (invoked from `unit-02-profile`'s wizard): skippable, never blocks completion, no "seen rules" state persisted.
- A graceful-degradation pattern: if the interactive calculator fails for any reason, the screen falls back to a static rules table rather than crashing or blanking the whole screen.

## Out of scope

- Any backend interaction — this unit is the closest thing to a pure-content, pure-client unit in the whole migration.

## Dependencies

- **Depends on:** `unit-03-scoring` (must reuse it, never reimplement).
- **Depended on by:** `unit-02-profile` (onboarding rules step), `unit-05-predictions` (reuses the score-breakdown-explainer component/pattern for showing a finished prediction's point breakdown).

## Native modules

None.

## Backend contract needed

None — content can ship bundled with the app (translated content files) rather than fetched, unlike the web app's build-time MDX pipeline; Construction decides the exact rendering/content-loading mechanism.

## Unit-level acceptance criteria

- The interactive calculator's computed result for any input always matches `unit-03-scoring`'s algorithm exactly — verified by sharing test cases between the two units' test suites.
- Skipping the onboarding rules step never blocks onboarding completion and is never re-surfaced later as something the user "still needs to do."
- A deliberately-broken calculator (simulated failure) degrades to a static table rather than crashing the screen — verified with an explicit test.

## Risks

None significant — lowest-risk unit alongside `unit-03-scoring` per `migration-analysis.md §4`.

## Stories

See `stories/`: EDU-1 through EDU-4.
