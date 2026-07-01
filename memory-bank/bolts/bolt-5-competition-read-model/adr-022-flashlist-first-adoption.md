# ADR-022 — `@shopify/flash-list` added as a new dependency; first FlashList consumer in the repo

## Context

`tech-stack.md` and `coding-standards.md` both name FlashList as the project's standard for any scrolling collection ("Virtualize lists with FlashList; never map large arrays into a ScrollView"), but flag it as "not yet a dependency — add when the first scrolling list is built." Every prior bolt either had no scrolling list (Bolt 1/2's forms, Bolt 4's pure logic) or had a small/bounded list explicitly judged not to need it (Bolt 3's avatar default-set grid, ADR-014: "bounded/small list, not a list-performance case").

COMPETITION-1's fixture view is the first genuinely unbounded scrolling list in this codebase: every match across every phase of a FIFA World Cup 2026 tournament (up to 104 matches across group + knockout phases), grouped into many day-sections with sticky headers, is exactly the case `vercel-react-native-skills`/`coding-standards.md` describe FlashList as existing for.

## Decision

Add `@shopify/flash-list` as a new dependency. `src/shared/competition/components/fixture-list.tsx` uses it (section-list-equivalent rendering: day-grouped sections with sticky headers, individual `match-card.tsx` rows) as the first consumer in the repo.

Per `vercel-react-native-skills`'s memoization rule (also restated in `coding-standards.md`'s baseline rules), `match-card.tsx` and `team-badge.tsx` are wrapped in `React.memo`, and no inline function/object literals are passed as per-row props from `fixture-list.tsx` — any row-level callback is `useCallback`-stabilized at the list level.

## Consequences

- `package.json` gains one new dependency (`@shopify/flash-list`). It is a JS + Reanimated-based library; no incremental native linking risk beyond what `react-native-gesture-handler`/Reanimated already require in this project (already present as of Bolt 2).
- This is the reference adoption other bolts with list-heavy screens (pools list — Bolt 7, rankings/leaderboard — Bolt 9, notification history if any) should follow rather than re-litigating FlashList-vs-FlatList per bolt; `tech-stack.md`'s "Lists: FlashList" line moves from aspirational to actually-installed-and-precedented as of this bolt.
- `jest.config.js`'s `transformIgnorePatterns` allowlist is checked against `@shopify/flash-list`'s package output at Implement time — extended if the package ships untranspiled ESM under `node_modules`, following the same pattern already applied for `react-native-svg`/`react-native-qrcode-svg`/`react-native-image-picker` (Bolt 2/3 precedent), and recorded in `implement-and-test.md` rather than as a separate ADR (a config-allowlist addition, not an architectural decision).
- Layer 1 tests for `fixture-list.tsx` render through RNTL same as any other component; FlashList's own virtualization internals are not re-tested here — only that the component renders the expected grouped content and responds to the past-matches toggle.
