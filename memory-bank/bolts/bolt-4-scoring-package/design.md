# Bolt 4 — Scoring Package — Design

## 1. Placement Decision (confirming ADR-005)

`src/shared/scoring/` — a plain TypeScript folder under the ADR-001 `shared` layer. No npm package, no Yarn workspace, no separate `package.json`. This follows ADR-005 exactly.

No UI component, no React component, no navigation. This is a pure-logic package. The `vercel-react-native-skills` coding rules are reviewed but do not prescribe anything for a component-free pure-logic module — no FlatList/FlashList tradeoffs, no animation, no native navigation. The only applicable skill rule is the general TypeScript strict-mode convention, which is already enforced project-wide.

## 2. File Structure

```
src/shared/scoring/
  scoring-rules.ts          — ScoringRuleSet constants (const object + type export)
  compute-score.ts          — ScoringExample, ScoreBreakdown, PenaltyWinner, MatchedCase,
                              derivePenaltyWinner(), computeScore()
  index.ts                  — barrel re-export of all public API
  __tests__/
    compute-score.test.ts   — unit tests (Jest, plain TS — no RNTL needed)
    scoring-rules.test.ts   — point constant sanity tests
```

No subdirectories needed — the package is two small files.

## 3. Public API Surface

All exports go through `src/shared/scoring/index.ts`. Consumers import via:

```ts
import { computeScore, derivePenaltyWinner, ScoringRuleSet } from '@/shared/scoring';
// or specific types:
import type { ScoreBreakdown, MatchedCase, PenaltyWinner, ScoringExample } from '@/shared/scoring';
```

The `@` alias resolves to `src/` in both Rspack (host and remote configs) and Jest (`moduleNameMapper`). No change to either config is needed — the alias already exists.

## 4. Module Federation Shared Config — Design Clarification

ADR-005 states that `scoring` should be registered as an MF shared singleton and that "The 'single source of truth' guarantee rests on the Module Federation `shared` config being correct." ADR-002 echoes this: "from Bolt 4 onward, `scoring`" should be in the `shared` config.

However, MF's `shared` config key must match the **import request string** at the consuming call site and be resolvable by the bundler as an npm package (with a `version` in a `package.json`). A local source path under `src/` has no npm `version` — attempting to register it as a shared singleton (`{ singleton: true, version: '1.0.0' }`) under a fake version would be non-standard and fragile. The real guarantee here is structural:

- Host and every remote live in the **same repository** and use the **same `@` alias** pointing at the **same `src/` directory**.
- There is exactly one physical copy of `src/shared/scoring/` on disk.
- Any remote that imports `@/shared/scoring` resolves to that single copy at build time.
- Rspack bundles the module once per build target; two separate builds (host vs. remote) each produce one copy of the resolved source — but since the source is identical (same file), the outputs are byte-identical.

This is a **filesystem-level single-source guarantee**, not a MF runtime-shared-instance guarantee. The distinction only matters for stateful shared modules (e.g. a Zustand store that both host and remote must share the same JavaScript object at runtime). `scoring` is a **pure-function, stateless module** — having separate copies in the host bundle and remote bundle is semantically equivalent to sharing one copy: both copies run the same deterministic function on the same inputs and produce the same outputs. There is no runtime-divergence risk from having two copies.

Therefore, the `shared` config in `rspack.config.mjs` and `rspack.config.education-remote.mjs` is **not modified** by this bolt. This is recorded as ADR-015.

The code-level duplicate-detection mechanism (SCORING-2 AC: "a code-level check exists to catch a future accidental duplicate implementation") is:
- An ADR (this design doc + ADR-016) recording the rule: no other unit may define `EXACT_SCORE`, `CORRECT_RESULT`, `PARTIAL_GOAL_COUNT`, `PENALTY_BONUS` as local constants, nor implement a local `computeScore`-equivalent function.
- A TypeScript lint comment in `compute-score.ts` and `scoring-rules.ts` (the canonical law-of-the-land note, same pattern as betmeet-clone's `BR-2.7` JSDoc comment).
- These two mechanisms satisfy SCORING-2's AC ("lint rule, import-boundary check, or simply an ADR-recorded review gate — mechanism is Construction's call").

## 5. State Boundaries

None. This package has no Zustand store, no TanStack Query usage, no async I/O. It is a set of pure functions and constants. All state (predicted/actual scores) lives at the call site (prediction form in host, rankings query in remote).

## 6. Testing Strategy

**No RNTL needed.** The package is pure TypeScript — tests use plain Jest `describe/it/expect`.

Test files:
- `__tests__/scoring-rules.test.ts` — sanity-check the constant values (not redundant: these are the load-bearing business rules; a constant changing silently is a defect).
- `__tests__/compute-score.test.ts` — port all test cases from betmeet-clone's verified suite (`compute-score.test.ts`) to Jest syntax (betmeet-clone uses Vitest; same API surface, trivial port).

Test count target: ~20 tests (12 base-algorithm cases + 4 penalty-bonus cases + 3 `derivePenaltyWinner` cases + 3 constants sanity checks = 22 tests).

## 7. vercel-react-native-skills Applicability Review

Checked against the 30+ rules from the skill. Applicable rules:
- TypeScript strict mode — already enforced project-wide. No `any`, no implicit return types on public functions.
- Export barrel (`index.ts`) — applied.
- No rules about FlashList, memoization, animations, native modules, or navigation apply — this package has none of those.

No performance investigation needed (no UI, no render path).
