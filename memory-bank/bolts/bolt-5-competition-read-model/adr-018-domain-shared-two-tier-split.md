# ADR-018 — `competition` uses a two-tier `domain/` + `shared/` split (unlike `scoring`'s single-tier `shared/`)

## Context

Bolt 4's `scoring` package lives entirely under `src/shared/scoring/` as a single tier — pure functions and constants, no UI, no React, no state. Its `design.md §1` explicitly notes: "No UI component, no React component, no navigation. This is a pure-logic package."

`competition` is different: it has framework-free domain rules (calendar-day grouping, the linger-window decision, the ±3-hour live-update-relevance heuristic, FIFA-trigram/flag-key display rules — model.md §2–§4) **and** it has React/RN-specific consumption code (FlashList-based components, a TanStack Query hook, a Zustand store, a Realtime-subscription hook). Putting all of this in one `src/shared/competition/` folder would mix framework-free, plain-Jest-testable logic with React-Native-only, RNTL-testable code in the same directory — diverging from the project's established pattern elsewhere (`src/domain/auth/` holds the pure auth-guard/sign-in/sign-up classifiers; `src/host/auth/` and `src/platform/supabase/` hold the React/RN/SDK-touching code that calls into it). `src/domain/profile/` and `src/host/profile/` follow the identical split for Bolt 3.

## Decision

`competition`'s logic is split across two directories, mirroring the existing `domain/` + (`host/` or `shared/`) convention used by `auth` and `profile`:

- **`src/domain/competition/`** — framework-free pure functions and types: `match-status.ts`, `fixture-day-grouping.ts` (`groupMatchesByDay()`, `decidePastDayLingering()`), `live-update-policy.ts` (`evaluateLiveUpdateRelevance()`, the debounce policy, `LiveSubscriptionState` transition logic), `fifa-team-display.ts`. No React import, no RN import. Tested with plain Jest `describe/it/expect`, no renderer.
- **`src/shared/competition/`** — the React/RN consumption layer: `flags/` (bundled SVG assets + lookup map), `components/` (`team-badge.tsx`, `match-card.tsx`, `fixture-list.tsx`, etc.), `hooks/` (`use-fixture-query.ts`, `use-live-competition-subscription.ts`), `competition-store.ts` (Zustand). Tested with React Native Testing Library.

The `shared/` (not `host/`) tier is used for the React/RN layer — rather than `domain/` + `host/`, which would be the `auth`/`profile` precedent — because ADR-017 places this code as a **filesystem-shared library consumed by the host, not host-only code**: a future remote could import `src/shared/competition/`'s components the same way it could import `src/shared/scoring/`. `src/host/` is reserved (by existing convention, see `auth`/`profile`/`settings` directories) for code that is conceptually host-bundle-owned and would not make sense imported elsewhere (navigators, the auth-gated screen tree). Competition's components have no such host-exclusive coupling — they are pure presentation + data-fetching over a `Match`/`Team` shape that is equally meaningful wherever it's mounted.

## Consequences

- Two new top-level directories instead of one: `src/domain/competition/` and `src/shared/competition/`, each with their own `__tests__/` and `index.ts` barrel.
- Layer 1 testing strategy is split accordingly: `src/domain/competition/__tests__/*.test.ts` need no RNTL; `src/shared/competition/__tests__/*.test.tsx` use RNTL `render()`.
- Consumers (Bolt 6's Predictions screen) import from **two** paths as needed — `@/domain/competition` for pure helpers used outside a component tree (e.g. validating data before a save), `@/shared/competition` for ready-to-mount UI/hooks — rather than one barrel re-exporting everything, keeping the framework-free/framework-coupled boundary visible at the import site, not just inside the folder structure.
- This is a deliberate divergence from `scoring`'s single-tier shape, justified by `scoring` genuinely having zero UI surface (ADR-015's own reasoning) while `competition` has a substantial one. Future units should default to the two-tier split unless they can show, like `scoring` did, that no UI tier is needed at all.
