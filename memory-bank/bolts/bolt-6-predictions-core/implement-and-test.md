# Bolt 6 — Predictions Core — Implement & Test

## Implementation Summary

### Files created

**`src/domain/predictions/`** (framework-free, Model stage):
- `prediction-eligibility.ts` — `PredictionLockReason`, `getPredictionEligibility()` (verbatim port of `domain-overview.md §4.2`'s state machine), `describeLockReason()`
- `prediction-entry-validation.ts` — `validatePredictionEntry()` (score bounds + penalty-winner-iff-tied-knockout rule), `shouldShowPenaltyWinnerSelector()`, re-exports `derivePenaltyWinner`/`PenaltyWinner` from `@/shared/scoring`
- `prediction-with-match.ts` — `MyPrediction`, `MatchWithMyPrediction` types
- `prediction-score-display.ts` — `canShowScoreBreakdown()`, `buildScoreBreakdown()` (pure adapter into Bolt 4's `computeScore()`, zero scoring math reimplemented)
- `index.ts` — barrel
- `__tests__/` — 45 tests across 3 suites (see Layer 1 below)

**`src/host/predictions/`** (RN layer, host-only per ADR-024):
- `hooks/use-predictions-query.ts` — `useKnockoutPhaseIdsQuery()`, `useMyPredictionsQuery()`, `useInvalidateMyPredictionsQuery()`, `useMatchesWithMyPredictions()` (client-side join of Bolt 5's fixture query + this bolt's predictions query, ADR-019-style derive-at-read-time), `useSavePredictionMutation()`
- `components/prediction-score-input.tsx` — one score field, `React.memo`-wrapped
- `components/penalty-winner-selector.tsx` — the PREDICTIONS-2 selector, `React.memo`-wrapped
- `components/score-breakdown-panel.tsx` — PREDICTIONS-5 display, `React.memo`-wrapped
- `components/prediction-match-card.tsx` — composes the above + `TeamBadge`/`LiveIndicator` (reused from `@/shared/competition`); owns per-row edit-draft `useState` (never Zustand, never cached — design.md §5)
- `components/predictions-fixture-list.tsx` — new day-grouped/virtualized FlashList shell (ADR-025), reuses `buildFixtureView`/`FixtureDaySectionHeader` but renders `PredictionMatchCard`, not Bolt 5's `MatchCard`/`FixtureList`
- `screens/predictions-screen.tsx` — the entry screen; joins queries, mounts `useLiveCompetitionSubscription` (Bolt 5, first real mount), wires the save mutation
- `__tests__/` under each subfolder — 89 tests across 7 suites (see Layer 1 below)

**Platform seam extensions:**
- `src/platform/backend-api/predictions-api.ts` (new) — `predictions.getMyPredictions`, `predictions.save` capabilities, same `request()` pattern as `competition-api.ts`/`profile-api.ts`
- `src/platform/backend-api/competition-api.ts` — added `competition.getKnockoutPhaseIds()` (additive; Bolt 5's `getFixture()` untouched) — closes a real gap: `Match.phaseId` existed but no phase-type (`GROUP|KNOCKOUT|LEAGUE`) lookup was ever exposed, since COMPETITION-1/2/3 never needed to distinguish phases; PREDICTIONS-2's penalty-selector gate does.

**Navigation wiring (first bolt to mount Bolt 5's fixture UI on a real screen):**
- `src/host/auth/navigation/screen-registry.ts` — added `Predictions: ['protected']`
- `src/host/auth/navigation/auth-stack-params.ts` — `AppStackParamList` gained `Predictions: undefined`
- `src/host/navigation/root-navigator.tsx` — registered `Predictions` on the existing `AppStack` (no new stack navigator); `HomeScreen` gained a "Predictions" button as the navigation entry point

No new npm dependency, no `package.json`/`yarn.lock` change, no rspack config change — confirmed via `git diff --stat package.json yarn.lock` (empty). Bundle-size discipline (the bolt-plan's named risk) verified: this bolt is built entirely from already-available primitives (`@shopify/flash-list` from Bolt 5, RN core `TextInput`/`Pressable`).

### Notable Implement-stage findings

- **Phase-type gap (closed additively).** Bolt 5's `Match` domain type carries `phaseId: string` but never a phase *type* — COMPETITION-1/2/3 had no reason to distinguish group/knockout/league phases. PREDICTIONS-2 needs exactly that one bit. Rather than widen `Match` or duplicate `CompetitionPhase` modeling inside `src/domain/predictions/`, a small additive capability (`competitionApi.getKnockoutPhaseIds()`) was added to the existing `competition-api.ts` file, documented in its own doc comment as a Bolt-6 addition. No existing Bolt 5 behavior changed.
- **`getFixtureWithMyPredictions` is not a real backend endpoint yet** — this repo has no concrete contract for a combined fixture+predictions read. Per design.md §6, the join happens client-side (`useMatchesWithMyPredictions`) from two independently-cacheable queries (`['competition','fixture']` from Bolt 5, `['predictions','mine']` new). If/when a real combined endpoint exists, swapping to it is isolated to this one join function.
- **`rerender()` is async in RNTL v14** — one test (`prediction-match-card.test.tsx`'s `isSaving` transition test) initially failed because `rerender(...)` wasn't awaited; fixed to `await rerender(...)`, consistent with the testing-standards note that v14's `render` (and, as discovered here, `rerender`) are both async.
- **Query-priority collision in `PenaltyWinnerSelector` tests** — `getByText('Germany')` was ambiguous (matches both the team badge's name `Text` and the selector's option label). Fixed by querying `getByRole('button', { name: 'Germany' })` instead, consistent with the testing-standards' documented query priority (`getByRole` over text).
- **Screen error-vs-loading branch order bug caught by its own test.** The first draft of `predictions-screen.tsx` checked `isLoading || !rows` before checking `error` — since a failed query always leaves `rows` `undefined`, the error branch was unreachable and the screen showed an infinite spinner on a fetch failure instead of the error message. Caught by the "shows an error state" screen test; fixed by reordering the `error` check first. This is exactly the kind of gap Layer 1 component tests are meant to catch before Layer 2.
- **FlashList/`act()` console warnings are pre-existing, not a regression** — `predictions-fixture-list.test.tsx` and `predictions-screen.test.tsx` produce the same "update to ForwardRef(FlashList)/ViewHolderCollection not wrapped in act()" console noise Bolt 5's own `fixture-list.test.tsx` already produces (confirmed via a side-by-side run); a `@shopify/flash-list`-internal timer artifact under Jest, not something this bolt introduced or should suppress.

---

## Layer 1 — Test Results

**377 tests passing across 54 suites** (up from 295/44 after Bolt 5). This bolt added **82 new tests across 10 new suites**:

| Suite | Tests | Focus |
|---|---|---|
| `domain/predictions/__tests__/prediction-eligibility.test.ts` | 14 | Every branch of the kickoff-lock state machine, in the documented precedence order, incl. the no-grace-period boundary (`now === kickoffAt`) and `KICKOFF_REACHED` taking precedence over `CANCELLED` |
| `domain/predictions/__tests__/prediction-entry-validation.test.ts` | 17 | Score-bounds (incl. 0/20 boundaries, non-integer rejection), penalty-winner required-iff-tied-knockout / rejected-otherwise, `shouldShowPenaltyWinnerSelector` gating |
| `domain/predictions/__tests__/prediction-score-display.test.ts` | 14 | `canShowScoreBreakdown` gate across every `MatchStatus`; `buildScoreBreakdown` delegates to `computeScore` correctly, incl. penalty-winner derivation from shootout score |
| `host/predictions/hooks/__tests__/use-predictions-query.test.tsx` | 6 | Query fetch wiring; client-side fixture+prediction join (incl. excluding pool-scoped predictions); mutation invalidates on success, does not invalidate on a `LOCKED` rejection |
| `host/predictions/components/__tests__/prediction-score-input.test.tsx` | 5 | Null-vs-zero value rendering, onChange wiring, clear-to-null, disabled-when-locked |
| `host/predictions/components/__tests__/penalty-winner-selector.test.tsx` | 5 | Option rendering, onChange('home'/'away'), selected-state, disabled-when-locked |
| `host/predictions/components/__tests__/score-breakdown-panel.test.tsx` | 4 | Outcome label + total points, component breakdown rendering, conditional penalty-bonus line |
| `host/predictions/components/__tests__/prediction-match-card.test.tsx` | 10 | Full composition: editable-before/locked-after-kickoff, save-disabled-until-valid, global (`poolId: null`) save payload, update-vs-save label, penalty-selector gating (knockout+tied only), score-breakdown rendering gated on finished+has-prediction, isSaving indicator |
| `host/predictions/components/__tests__/predictions-fixture-list.test.tsx` | 4 | Day-grouped rendering (reused `buildFixtureView`), past-matches toggle parity with Bolt 5's own `FixtureList` test shape |
| `host/predictions/screens/__tests__/predictions-screen.test.tsx` | 3 | Loading, loaded (fixture+prediction join rendered), error states |

`yarn tsc --noEmit` — clean (exit 0).
`yarn lint` — 1 pre-existing error in `src/platform/supabase/supabase-adapter.ts` (Bolt 2 code, `'error' is defined but never used`) — not touched by this bolt, same as Bolts 3/4/5's reports.
`yarn jest` — 54 suites / 377 tests, exit code 0. The same "worker process failed to exit gracefully" / FlashList `act()` console-noise Bolt 5 already documented as a pre-existing Jest-hygiene artifact appears again here — not a new defect.

### ADR-016 duplicate-detection checklist (re-applied at Implement, not just Model)

Per ADR-016's three-item gate, since this bolt touches scoring-adjacent logic:
1. `grep`-confirmed zero occurrences of `EXACT_SCORE`/`CORRECT_RESULT`/`PARTIAL_GOAL_COUNT`/`PENALTY_BONUS` anywhere under `src/domain/predictions/` or `src/host/predictions/`.
2. No local `computeScore`-equivalent function — `prediction-score-display.ts` and `score-breakdown-panel.tsx` both consume the one shared `ScoreBreakdown` shape, no branch of `computeScore`'s algorithm is re-derived.
3. `derivePenaltyWinner`/`PenaltyWinner` are imported from `@/shared/scoring` (via `@/domain/predictions`' re-export), never redefined.

### Kickoff-lock correctness — explicit review (bolt-plan's named risk)

- `getPredictionEligibility()` is a verbatim, same-branch-order port of `domain-overview.md §4.2`'s state machine — 14 dedicated unit tests cover every branch and the no-grace-period boundary exactly at `now === kickoffAt`.
- **ADR-023 makes explicit that this check is advisory-only.** No code path in this bolt treats client-side eligibility as authorization: `predictionsApi.savePrediction()` always round-trips to the backend API (never a direct Supabase write to score fields), and a `LOCKED` rejection response is handled as an expected outcome (see `useSavePredictionMutation`'s test: "does not invalidate on a LOCKED save-rejection response"), not a crash path.
- No optimistic-UI pattern was introduced that could visually imply a save succeeded before the server confirms it — `PredictionMatchCard`'s save button shows a spinner (`isSaving`) and only clears/updates on the mutation's actual settlement.

### What Layer 1 deliberately does NOT prove

- Real backend enforcement of the kickoff lock (the DB trigger `prediction_lock_guard`) — that is structurally guaranteed regardless of this bolt's code (ADR-023), and isn't something a mobile-repo unit test can exercise; it would need a backend-repo/integration test, out of this repo's authority.
- Real device clock/timezone behavior feeding into `getPredictionEligibility`'s `now` parameter — same category of gap Bolt 5's `implement-and-test.md` already flagged for `decidePastDayLingering`.
- FlashList real-device scroll performance for `PredictionsFixtureList` with a full ~104-match, per-row-interactive dataset — Layer 1 can only prove the memoization discipline is present (stable `renderItem`/`keyExtractor`/`getItemType`, `React.memo` row component), not measured on-device frame timing.

---

## Layer 2 — Device Verification Plan (not run in this environment)

This bolt is the first to register a real navigable screen for Bolt 5's fixture data, so this plan **also covers Bolt 5's six deferred manual test paths** (`bolt-5-competition-read-model/implement-and-test.md`) — noted inline below where applicable. Bolt 5's paths were written against `FixtureList`/`MatchCard`; this bolt mounts a **different** component (`PredictionsFixtureList`/`PredictionMatchCard`, ADR-025) that reuses the same domain grouping/linger logic and the same `useFixtureQuery`/`useLiveCompetitionSubscription` hooks, so the underlying behavior being verified is identical even though the rendering component is not.

### Prerequisites

No `pod install` required — no new native modules were added by this bolt.

### Suggested manual Layer 2 test paths

1. **Predictions screen reachable and renders (PREDICTIONS-1).** From Home, tap "Predictions." Confirm the day-grouped fixture list renders with editable score inputs for each upcoming match, and the screen doesn't crash while the fixture/predictions/knockout-phase queries resolve.

2. **Day-grouping renders correctly** *(Bolt 5 deferred path #1, now exercisable)*. Confirm matches are grouped under day-section headers in local timezone, exactly as Bolt 5 specified, now visible through `PredictionsFixtureList` instead of `FixtureList`.

3. **Past-day lingering / grace-window behavior** *(Bolt 5 deferred path #2, now exercisable)*. With data spanning a day boundary, confirm the linger-window rule (most-recent past day stays visible until 1 hour before the next kickoff) behaves identically to Bolt 5's original spec — `buildFixtureView` is reused unchanged by this bolt.

4. **Foreground/background re-evaluation** *(Bolt 5 deferred path #3, now exercisable)*. With a live/near-kickoff match on the Predictions screen, background and foreground the app; confirm the live-update subscription re-establishes and scores/statuses are not stale. Also confirm any **in-progress, unsaved prediction draft in a `PredictionMatchCard` is not lost** by the app backgrounding — this is new to this bolt (local component state across an app-state transition), not covered by Bolt 5's original path.

5. **Polling fallback engages when Realtime is unavailable** *(Bolt 5 deferred path #4, now exercisable)*. Same as Bolt 5's original path, verified through the Predictions screen.

6. **Flag badge rendering across all teams incl. UK home nations** *(Bolt 5 deferred path #5, now exercisable)*. Same caveat as Bolt 5 noted: flags are still placeholder swatches, not real vendored artwork (see Known Issues) — this step confirms the rendering pipeline, not the artwork.

7. **FlashList scroll performance with a full ~104-match dataset** *(Bolt 5 deferred path #6, now exercisable, higher stakes here)*. Unlike Bolt 5's read-only list, each row here has interactive `TextInput`s and a save button — scroll through the full dataset and confirm no visible frame drops, and that typing into one row's score input while other rows are off-screen (recycled) does not leak state into a recycled cell. This is the bolt-plan's explicitly named highest-traffic-screen risk — treat this path as mandatory, not optional, before sign-off.

8. **Kickoff-lock UI correctness (PREDICTIONS-1, the bolt-plan's other named risk).** With a match whose kickoff is imminent (seconds away) or has just passed, confirm the score inputs become disabled and the lock-reason copy appears at the correct moment, and that attempting to save a prediction the instant after kickoff surfaces a graceful "locked" outcome rather than a crash or a silently-swallowed failure (ADR-023 — the client's clock may be skewed from the server's, so the save-rejection path, not just the UI gate, must be verified).

9. **Penalty-winner selector, real device (PREDICTIONS-2).** For a knockout-phase match, enter equal scores and confirm the selector appears; confirm the save button stays disabled until a winner is picked; confirm entering unequal scores again hides the selector and clears its relevance.

10. **Score-breakdown display (PREDICTIONS-5).** For a finished match the viewer has predicted, confirm the breakdown panel shows the correct outcome label, point total, and (for non-exact predictions) the component breakdown — cross-check against the same match's expected `computeScore()` output.

---

## Known Issues / Deferred

- **Flag artwork is still a placeholder** (inherited from Bolt 5, not touched by this bolt) — `PredictionMatchCard` reuses `TeamBadge`, which reuses `FlagBadge`'s colored-swatch placeholders. Same "must resolve before release build" status as recorded in Bolt 5.
- **Realtime channel/event naming unconfirmed** (inherited from Bolt 5) — `useLiveCompetitionSubscription` is reused unchanged; the naming caveat carries forward unchanged.
- **`getFixtureWithMyPredictions` is not a real backend endpoint** — this bolt's client-side join (`useMatchesWithMyPredictions`) is the interim shape; swapping to a real combined endpoint if/when one exists is isolated to that one function.
- **`predictions.getMyPredictions`/`predictions.save`/`competition.getKnockoutPhaseIds` capability contracts are unconfirmed against a real backend** — same category of gap as Bolt 3's `profile.*` capabilities and Bolt 5's `competition.getFixture`: `BACKEND_API_BASE_URL` is still empty in this environment, so these are contract-only (Layer 1 mocks them, no real integration test possible yet).
- PREDICTIONS-3 (pool override + dual-save) and PREDICTIONS-4 (reset override) are explicitly out of scope — deferred to Bolt 8 per bolt-plan sequencing (model.md §7). `MyPrediction.poolId` and `SavePredictionInput.poolId` are already shaped to accept a non-null value so Bolt 8 doesn't need to widen these types, but no UI in this bolt ever sends one.
- Layer 2 device verification has not been run in this session (no simulator/device available) — the 10 manual paths above are ready for the user to execute, incl. the six re-scoped Bolt 5 paths.
- The pre-existing lint error in `supabase-adapter.ts` (Bolt 2) is tracked in `activeContext.md`/`progress.md` — not introduced or worsened by this bolt.
