# Bolt 5 — Competition Read Model — Implement & Test

## Implementation Summary

### Files created

**`src/domain/competition/`** (framework-free, ADR-018):
- `match-status.ts` — `MatchStatus` type, `describeMatchStatus()`, `isLiveStatus()`
- `fifa-team-display.ts` — `TeamSlot` tagged union (`TeamDisplayData | KnockoutPlaceholder | null`), `isResolvedTeam()`, `isKnockoutPlaceholder()`, `describeTeamSlot()`
- `fixture-day-grouping.ts` — `Match` type, `groupMatchesByDay()`, `decidePastDayLingering()`, `buildFixtureView()` (the COMPETITION-1 day-partitioning/linger-window core)
- `live-update-policy.ts` — `evaluateLiveUpdateRelevance()` (±3h/live heuristic), `computeDebounceDeadline()`, `LiveSubscriptionState`
- `index.ts` — barrel

**`src/shared/competition/`** (RN layer, ADR-018):
- `flags/flag-catalog.ts` — static `FlagAssetKey -> tint` catalog, `getFlagCatalogEntry()`
- `flags/flag-badge.tsx` — `react-native-svg`-based flag rendering (placeholder swatches — see Known Issues below)
- `flags/index.ts`
- `components/team-badge.tsx`, `match-card.tsx`, `live-indicator.tsx`, `fixture-day-section.tsx`, `fixture-list.tsx` — all `React.memo`-wrapped per `vercel-react-native-skills`
- `components/index.ts`
- `hooks/use-fixture-query.ts` — `FIXTURE_QUERY_KEY`, `useFixtureQuery()`, `useFixtureView()` (select-derived grouping, ADR-019), `useInvalidateFixtureQuery()`
- `hooks/use-live-competition-subscription.ts` — wraps `SupabaseAdapter.subscribeToLiveResults()`, mandatory polling fallback, full re-evaluation on `AppState` foreground (ADR-021)
- `hooks/index.ts`
- `competition-store.ts` — Zustand, scoped to `showPastMatches` only (ADR-020)
- `index.ts` — the one import path for this bolt's ready-to-mount layer

**Platform seam extensions:**
- `src/platform/supabase/supabase-adapter.ts` — added `LiveResultsSubscription` type + `subscribeToLiveResults(onSignal)` method (Realtime Broadcast, `live-results` channel / `results-updated` event — exact naming to be confirmed against the real backend contract; only this one adapter method would need to change if it differs)
- `src/platform/backend-api/competition-api.ts` — `competition.getFixture` capability, same typed-wrapper pattern as `profile-api.ts`

**Config:**
- `package.json` — added `@shopify/flash-list` (first FlashList consumer, ADR-022)
- `jest.config.js` — extended `transformIgnorePatterns` for `@shopify/flash-list`'s untranspiled ESM output (same class of gap as `react-native-svg`/`react-native-qrcode-svg`/`react-native-image-picker` in Bolts 2/3)

No navigator/screen registration in this bolt — components/hooks are ready-to-mount only; Bolt 6 (Predictions) owns wiring them into an actual screen/route.

### Notable Implement-stage findings

- **`react-native-svg` was already a transitive dependency** (via `react-native-qrcode-svg`, Bolt 2/ADR-007) but never imported directly until this bolt — no new native linking was required for `FlagBadge`.
- **`@shopify/flash-list` ships untranspiled ESM** in its built `dist/index.js` despite no `"type": "module"` in its `package.json` — same transformIgnorePatterns gap class documented for other RN-ecosystem packages in Bolts 0/2/3. Fixed by extending the existing allowlist; no other config changed.
- **FlashList v2 has no dedicated section-list component** — `fixture-list.tsx` flattens `FixtureView`'s day groups into a single row array (`{ kind: 'header' | 'match' }`) and uses `getItemType` for recycling, the standard FlashList pattern for sectioned data. True sticky headers (`stickyHeaderIndices`) aren't exposed in this version's typed props — a visual nicety, not an AC requirement, so it was not pursued further in this bolt.

---

## Layer 1 — Test Results

**295 tests passing across 44 suites** (up from 285/40 mid-Implement, up from 229/30 after Bolt 4). This Test-stage pass added **10 new tests across 4 new suites**, closing direct-coverage gaps the coordinator flagged:

| Suite (new in Test stage) | Tests | Focus |
|---|---|---|
| `live-indicator.test.tsx` | 1 | Renders the LIVE label, accessible by label |
| `fixture-day-section.test.tsx` | 2 | Formats a real calendar date; renders the "to be confirmed" fallback for the `unscheduled` sentinel |
| `flag-badge.test.tsx` | 4 | Renders for a known key; renders each UK home-nation key distinctly without crashing; falls back gracefully for an unknown key; respects a custom `size` |
| `flag-catalog.test.ts` | 3 | Three UK home-nations keys have distinct tints; unknown-key fallback never throws; all three UK keys are registered |

Combined with the suites already written during Implement (46 tests across 10 suites: `match-status`, `fifa-team-display`, `fixture-day-grouping`, `live-update-policy` domain tests; `team-badge`, `match-card`, `fixture-list` component tests; `use-fixture-query`, `use-live-competition-subscription` hook tests; `competition-store` test), **every exported function in `src/domain/competition/` and every component/hook/store in `src/shared/competition/` now has direct test coverage** — confirmed by cross-checking each file's exports against its `__tests__/` counterpart.

`yarn tsc --noEmit` — clean (exit 0).
`yarn lint` — 1 pre-existing error in `src/platform/supabase/supabase-adapter.ts` (Bolt 2 code, `'error' is defined but never used` — not touched by this bolt, same as Bolts 3/4's reports).
`yarn jest` — exit code 0. A "worker process has failed to exit gracefully" hint appears on the full-suite run; this does not fail any test and was confirmed present independent of this bolt's additions (an isolated `--detectOpenHandles` run scoped to `src/shared/competition` alone completes with no such warning) — most likely TanStack Query's background GC/retry timers across the growing number of suites, a Jest-hygiene notice, not a defect introduced here.

### What Layer 1 deliberately does NOT prove

`use-live-competition-subscription.test.tsx`'s own docblock states this explicitly: Layer 1 exercises the debounce/relevance/fallback **decision logic** against a mocked `SupabaseAdapter` and a manually-fired `AppState` `'change'` event — it does not and cannot prove real Supabase Realtime channel behavior or true OS-level app backgrounding/foregrounding. That gap is exactly what Layer 2 exists to cover (see below).

---

## Layer 2 — Device Verification (DEFERRED to Bolt 6)

**Deferred to manual verification by the user once Bolt 6 (Predictions) mounts a real screen**, per the same precedent Bolt 4 (Scoring) established — this bolt deliberately ships no navigator/screen registration (design.md §6: "components/hooks are ready-to-mount only"), so there is currently no way to navigate to a fixture screen in the running app at all. Unlike Bolt 4, this is not because the package has no UI (it very much does) — it's because this bolt's scope explicitly excluded wiring a route, leaving that to Bolt 6.

### Prerequisites

No `pod install` required — no new native modules (FlashList is pure JS/`@babel/runtime`; `react-native-svg` was already linked in Bolt 2).

### Suggested manual Layer 2 test paths (run once Bolt 6 mounts `FixtureList`/`use-live-competition-subscription` on a real screen)

1. **Fixture list renders and groups correctly (COMPETITION-1).** Navigate to the screen that mounts `FixtureList`. Confirm matches are grouped under day-section headers in the viewer's local timezone, each match card shows both teams (flag + FIFA trigram + name), a localized kickoff time, and a status pill. Confirm any match with an unresolved knockout slot shows a descriptive placeholder label (e.g. "Winner of Round of 16 Match 3"), never a blank team.

2. **Past-day lingering / grace-window behavior (COMPETITION-1).** With test data spanning a day boundary, confirm: (a) today's day-group stays visible in the current/upcoming view even if all of today's matches have already kicked off; (b) the most-recently-past day's group stays visible (not behind the "Show past matches" toggle) until 1 hour before the next upcoming kickoff, then moves behind the toggle; (c) earlier past days are always behind the toggle regardless of the linger window. This is the hardest-to-fake-with-mocks rule in the whole bolt — Layer 1's `fixture-day-grouping.test.ts` proves the pure function is correct for given timestamps, but only a device run proves the *device's own clock/timezone* feeds correctly into it end-to-end.

3. **Foreground/background re-evaluation, not stale resumption (COMPETITION-2, ADR-021).** With a live or near-kickoff match in view (so the subscription is active), background the app (home button / app switcher) and then return to the foreground. Confirm the live-update mechanism re-establishes correctly — no permanently-stale score after the cycle. This is the AC Layer 1 can only simulate by manually firing a mocked `AppState` event; it cannot prove the real OS suspends/resumes the JS runtime and Realtime socket the way this test assumes.

4. **Polling fallback engages when Realtime is unavailable (COMPETITION-2, ADR-021).** With a live/near-kickoff match in view, disable network connectivity (airplane mode) or otherwise prevent the Realtime channel from reaching `SUBSCRIBED`. Confirm the screen's data still updates on a polling cadence (not simply frozen) once connectivity returns, and that no crash/unhandled rejection occurs while offline. This directly verifies the "polling fallback is not optional" risk called out in `unit-brief.md` and ADR-021.

5. **Flag rendering — visual smoke test across all teams, especially the UK home nations (COMPETITION-3).** Scroll through the fixture list and visually confirm every team's flag badge renders without crashing, including all four UK home-nations matchups if present in test data (`gb-eng`/`gb-sct`/`gb-wls` keys). **Important caveat:** the flags currently rendered are **placeholder colored swatches, not real vendored flag artwork** (see Known Issues below) — this step is about confirming the *rendering pipeline* (SVG mount, no crash, correct per-team key resolution, distinct tints per UK nation) works end-to-end on-device, not about the artwork looking like a real flag yet.

6. **FlashList scroll performance smoke test.** With a realistic full-tournament-sized dataset (~104 matches across all group + knockout phases), scroll through the fixture list on a real device and confirm smooth scrolling with no visible frame drops or blank-cell flashing — the kind of virtualization behavior a Jest-rendered snapshot cannot measure.

---

## Known Issues / Deferred

- **Flag artwork is a placeholder, not real vendored SVGs.** `flag-catalog.ts`/`flag-badge.tsx` implement the full bundled, keyed-lookup architecture COMPETITION-3 requires (including the three UK home-nations subdivision keys kept structurally distinct from any ISO code), but render simple colored-rectangle swatches rather than the real `lipis/flag-icons` artwork referenced in `migration-analysis.md`/`project-inventory.md` (`public/flags/`) — there was no network access available in this environment to fetch and vendor the real SVG set. Swapping in real artwork is a content-only change to `flag-catalog.ts` (and possibly `flag-badge.tsx`'s render, depending on the asset format chosen — inline SVG vs. bundled image); no consumer (`team-badge.tsx`, `match-card.tsx`, or anything Bolt 6 builds) needs to change, since every consumer addresses a flag only by its `FlagAssetKey`. **This must be resolved before any release build** — tracked as a Known Issue in `activeContext.md`, not a blocker for Bolt 6 to proceed.
- **Realtime channel/event naming (`live-results`/`results-updated`) is Construction's best-guess against the domain description, not yet confirmed against a real backend contract.** `subscribeToLiveResults()` is the only place this would need to change — isolated behind the adapter seam by design (requirements.md §7.2).
- Layer 2 device verification is fully deferred to Bolt 6 (see above) — none of the six suggested manual paths have been run in this session.
- The pre-existing lint error in `supabase-adapter.ts` (Bolt 2) is tracked in `activeContext.md`/`progress.md` — not introduced or worsened by this bolt.
