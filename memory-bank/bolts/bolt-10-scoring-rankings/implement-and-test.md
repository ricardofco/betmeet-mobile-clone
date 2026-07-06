# Bolt 10 — Implement & Test

## 1. What was built (Implement stage, code-complete 2026-07-06)

### Domain (framework-free, `src/domain/rankings/`)

- `ranking-row.ts` — `RankingRow`/`RankedRow`/`ProjectedRow`/`PointsStatus` types.
- `dense-ranking.ts` — `assignDensePositions<T>()`, the one physical port of
  betmeet-clone's dense-ranking algorithm ("1,1,2", never "1,1,3").
- `nickname-tie-break.ts` — `compareByNicknameAscending()`, the one unified
  tie-break (ADR-049) used by every ranking sort in this bolt.
- `rank-projection.ts` — `buildRankedView()`, the one shared read-time
  projection (confirmed pass + optional projected/live pass).
- `format-ranking-row.ts` — pure display-shaping (medal glyph, position
  label, delta arrow, total-to-display).
- `points-status.ts` — the `PointsStatus` type only (resolution logic is
  backend-side).
- `index.ts` — barrel export.

### Backend (`backend/src/services/`, ADR-030/ADR-051)

- `scoring/compute-score.ts` — backend's own `computeScore`/`derivePenaltyWinner`
  port (ADR-051's "twin invariant" alongside ADR-016).
- `scoring/score-match.ts` — `scoreMatch(matchId)`, idempotent full-overwrite
  upsert of every `PredictionScore` row for a match.
- `scoring/score-sweeper.ts` — `sweepFinishedUnscoredMatches()`, the lazy
  sweep-on-read backstop (ADR-050).
- `scoring/resolve-points.ts` — `resolvePointsStatus()`, the four-state
  `pointsStatus` resolution.
- `pool-leaderboard-aggregation.ts` — `resolveEffectivePredictions()`, the
  per-(member,match) override-or-global collapse (design.md §3).
- `routes/handlers.ts` — new `rankings.getGlobalRanking`/`rankings.getPoolLeaderboard`
  handlers; the lazy sweep also wired into `predictions.getMyPredictions`,
  which additionally gained the `pointsStatus` field per prediction.

### Mobile platform / host / remote

- `src/platform/backend-api/rankings-api.ts` — `rankings.*` capability wrappers.
- `src/host/rankings/` — `screens/rankings-screen.tsx`, `components/ranking-row.tsx`,
  `hooks/use-global-ranking-query.ts` — RANKINGS-1, a 4th bottom tab
  (`RankingsTab`, `Trophy` icon via `lucide-react-native`).
- `src/host/auth/navigation/auth-stack-params.ts`/`screen-registry.ts`,
  `src/host/navigation/main-tab-navigator.tsx` — 4th tab registration.
- `src/remotes/pools/screens/pool-leaderboard-screen.tsx`,
  `components/pool-leaderboard-row.tsx`, `hooks/use-pool-leaderboard-query.ts` —
  RANKINGS-2, reached from `pool-detail-screen.tsx`'s new "Leaderboard" button;
  `pools-stack-params.ts` gained `PoolLeaderboard`; `PoolsRemoteEntry.tsx`
  registers the new screen.
- `src/host/predictions/components/prediction-match-card.tsx` — additive
  Scored/Pending badge reading `prediction.pointsStatus`
  (`canShowScoreBreakdown`/`buildScoreBreakdown` untouched).
- `src/domain/predictions/prediction-with-match.ts` — `MyPrediction` widened
  with the required `pointsStatus` field.
- `src/shared/scoring/compute-score.ts` (ADR-016's doc comment) — gained a
  forward cross-reference to ADR-051/the backend twin.
- `en.ts`/`es.ts` — `rankings.*`, `pools.detail.leaderboard`,
  `pools.screens.poolLeaderboard`, `pools.leaderboardScreen.*`,
  `navigation.tabs.rankings`.

No rspack/Module Federation config change (ADR-048 — zero new MF
shared-singleton entries needed). No new Prisma migration.

## 2. Test stage — what was added and found

### 2.1 Domain unit tests (`src/domain/rankings/__tests__/`, new)

- `dense-ranking.test.ts` (4 tests) — the "1,1,2" case, a "no ties" case, an
  all-tied case, and tie-break-order-within-a-tied-group.
- `nickname-tie-break.test.ts` (3 tests) — ascending sort, `null`-nickname
  handling, equal-nickname zero-return.
- `rank-projection.test.ts` (3 tests) — confirmed-only (`projected: null`
  when no row carries a `projectedTotal`); projected + `positionDelta`
  carried from the confirmed pass; **and the `hasConfirmedEntry: false`
  synthesized-row case, which caught a real bug (§2.4 below)**.

### 2.2 Backend unit tests — this backend's FIRST Jest suite

Every prior bolt's backend work (Bolt 7/8) was verified exclusively via real
curl + live-DB checks, with zero unit tests (`prisma`-coupling made mocking
impractical and out of convention). This bolt adds Jest to `backend/`
(`jest@^29.7.0`, `ts-jest@^29.4.11`, `@types/jest@^29.5.14`, new
`backend/jest.config.js`, `npm test` script) — deliberately scoped to
**pure functions only** (no `prisma`/network mocking harness was built):

- `backend/src/services/scoring/__tests__/compute-score.test.ts` (10 tests) —
  EXACT/RESULT/PARTIAL/MISS cases, penalty-bonus applied/not-applied, and
  **the single most important regression test in this whole bolt**
  (design.md §11/model.md §4 point 5/ADR-051): two users predicting the
  same tied LIVE knockout scoreline with different `predictedPenaltyWinner`
  picks and `actualPenaltyWinner: null` (mandatory for any LIVE match) get
  **identical `totalPoints`, no bonus to either** — this is the mobile-twin
  test's exact backend-side home, explicitly cross-referenced from both
  `compute-score.ts` doc comments (ADR-051).
- `backend/src/services/scoring/__tests__/resolve-points.test.ts` (6 tests) —
  the four-state resolution (`NOT_SCORED` no-prediction, `SCORED`,
  `NOT_SCORED` CANCELLED/POSTPONED, `PENDING_SCORING` otherwise, incl. the
  FINISHED-but-not-yet-swept race window).
- `backend/src/services/__tests__/pool-leaderboard-aggregation.test.ts`
  (6 tests) — `resolveEffectivePredictions`: override-wins-over-global,
  never double-counts a (user, match) pair, ignores a different pool's
  override entirely, omits a never-predicted pair (contributes 0, not an
  error), and a multi-member/multi-match scenario.

**DB-touching logic is deliberately NOT unit-tested with a mocked Prisma
client** — `score-match.ts`'s idempotency, `score-sweeper.ts`'s targeting,
and the `joinedAt` exclusion all inherently need real DB state to mean
anything; these are verified for real against the live Supabase DB instead
(§3), matching this repo's established Bolt 7/8 precedent rather than
inventing a new mocking convention this backend has never used.

### 2.3 Component tests (RNTL)

- `src/host/rankings/screens/__tests__/rankings-screen.test.tsx` (5 tests,
  new) — loading, error, empty, CONFIRMED-display (no LIVE banner),
  PROJECTED-display (LIVE banner + projected total, not confirmed).
- `src/remotes/pools/screens/__tests__/pool-leaderboard-screen.test.tsx`
  (6 tests, new) — loading, error, `NOT_MEMBER` (distinct copy from a
  generic error), empty, CONFIRMED-display, PROJECTED-display.
- `src/host/predictions/components/__tests__/prediction-match-card.test.tsx`
  — extended (+5 tests) with real assertions for the `pointsStatus` badge:
  `SCORED` → "Scored" badge only; `PENDING_SCORING` → "Pending" badge only;
  `NOT_SCORED` → no badge; no prediction → no badge; and a `SCORED` +
  `FINISHED` case proving the badge renders **alongside**, and does not
  disturb, the pre-existing score-breakdown panel. (The mechanical
  `pointsStatus: 'NOT_SCORED'` fixture patch from Implement stage was a
  literal-only edit to satisfy the widened `MyPrediction` type — this stage
  adds the actual behavioral coverage the task called for.)

### 2.4 A real bug found and fixed during this stage

Writing the `rank-projection.test.ts` case design.md §11 explicitly named
("`previousPosition: null` ... for a `hasConfirmedEntry: false`
synthesized row") surfaced a genuine gap: `rank-projection.ts`'s own doc
comment (and design.md §2) states this must hold **"regardless of what a
naive 0-point tie would otherwise produce"** — but the shipped
implementation never checked `hasConfirmedEntry` at all. It built
`previousPositionByUserId` from the confirmed pass (which is derived from
the exact same `rows` array `buildRankedView` receives), so **every**
row's userId always resolved to *some* real position — a synthesized
live-only row with `confirmedTotal: 0` would silently inherit whatever
position a naive tie-among-zero-scorers produced, instead of `null`.

Reproduced first (test failed against the pre-fix code, confirming it was
a real, not a tautological, regression test), then fixed in
`src/domain/rankings/rank-projection.ts`: the projected-pass mapper now
short-circuits to `previousPosition: null` (and therefore
`positionDelta: null`) whenever `row.hasConfirmedEntry` is `false`,
regardless of the map lookup's result. Verified: the previously-failing
assertion now passes; the "real confirmed entrant still gets a real
`previousPosition`" sanity check in the same test still passes; no other
test regressed. This is purely a mobile-side fix — `buildRankedView` is
the one function that computes `previousPosition`/`positionDelta` at all
(design.md §4.1: position/rank is never computed backend-side), so no
backend change was needed.

## 3. Real backend verification — DONE FOR REAL against the live Supabase DB

Per ADR-030 and this repo's Bolt 7/8 precedent (`bolt-8-.../implement-and-test.md
§3`'s runbook shape), the DB-touching pieces of this bolt's backend work were
verified against the live project (`sjgheiqnumywbotghqkb.supabase.co`), not
mocked. Booted `cd backend && npm run dev` (confirmed via `GET /health`),
then ran a throwaway TypeScript verification script
(`backend/src/scripts/bolt10-verify.ts`, deleted before finishing, same
"exercise for real, then remove" discipline as Bolt 7/8's own scripts) that:

1. Minted 2 throwaway Supabase users (A, B) via the Admin API, signed each
   in for a real bearer JWT, and set both profiles to `VERIFIED` with real
   nicknames (required for `rankings.getGlobalRanking`'s confirmed pass).
2. Reused the project's real active `Competition`, one real `GROUP` phase,
   one real `KNOCKOUT` phase, and two real `Team` rows — only **additive**
   test `Match` rows were created (unique `matchNumber`s), nothing about the
   live fixture data was mutated.

### 3.1 `score-match.ts` idempotency + `score-sweeper.ts` targeting

Created one `FINISHED`, unscored test match with a global prediction from
each of A (exact 2-1, matching the actual score) and B (predicted 1-1,
`PARTIAL`). Before any sweep: `prediction_scores` count for this match = 0.

- `sweepFinishedUnscoredMatches()` → returned `1` (found exactly our stale
  match). After: A's row = `EXACT`/5 pts, B's row = `PARTIAL`/1 pt — exactly
  matching `compute-score.ts`'s algorithm.
- **Called again immediately** → returned `0` — a genuinely safe no-op once
  nothing is stale, confirming design.md §4.2's "safe to call on every read"
  claim for real, not just by inspection.
- **Idempotency**: called `scoreMatch(matchId)` directly, twice more in a
  row, and diffed the persisted `prediction_scores` rows
  (`prediction_id`/`total_points`/`matched_case`) between the two calls —
  **byte-for-byte identical**, confirming the "never additive, never
  partial, fully overwrites from scratch" design.md §4.3 claim.

### 3.2 The `joinedAt` exclusion (model.md §3)

Created a private pool (A owner, B joined via `pools.joinByToken`), then
forced a real temporal gap via a direct Prisma write (a legitimate
test-setup technique, same as Bolt 8's §3.1 adaptation — not exercising
anything the join-flow API itself needs to prove): A's `joinedAt` set to
`2026-01-01`, B's to `2026-07-01`. Created one `FINISHED`+scored match with
`kickoffAt: 2026-03-15` (**after** A joined, **before** B joined) and gave
both A and B a pool-override prediction on it (`EXACT`, 5 pts each), on top
of the earlier global prediction each already held on the first test match
(`kickoffAt: 2026-03-01`, also between A's and B's `joinedAt`).

`rankings.getPoolLeaderboard`:
- **As A** (joined before both matches): `confirmedTotal: 10` — both the
  earlier global EXACT (5) *and* the override EXACT (5) counted, since both
  matches' `kickoffAt` are after A's `joinedAt`.
- **As B** (joined after both matches): `confirmedTotal: 0` — **both**
  matches excluded (B's global PARTIAL, worth 1 pt, and B's override EXACT,
  worth 5 pts, would sum to 6 if counted) — proving the exclusion applies
  uniformly to a member's effective prediction regardless of whether it
  came from the global-fallback or the pool-override branch of
  `resolveEffectivePredictions`, exactly model.md §3's rule.

### 3.3 The tied-LIVE-penalty-bonus regression, end-to-end via a real HTTP call

Created one `LIVE` knockout match, tied 1-1, with A predicting `1-1` +
`penaltyWinnerTeamId: home` and B predicting `1-1` + `penaltyWinnerTeamId:
away` (both inserted directly, mirroring a real pre-kickoff prediction now
in progress). Called `rankings.getGlobalRanking` as A:

```
isLive: true
A: confirmedTotal 5 (unrelated earlier match), projectedTotal 10
B: confirmedTotal 1 (unrelated earlier match), projectedTotal 6
```

The raw totals differ because A's and B's **unrelated, earlier** global
prediction (§3.1's test match) scored differently (`EXACT` vs `PARTIAL`) —
not because of the live match. Isolating each user's **live-match-only**
contribution (`projectedTotal − confirmedTotal`): **A gained exactly +5,
B gained exactly +5 — identical, with no penalty bonus to either**,
confirming `rankings.getGlobalRanking`'s live-projection branch really
does pass `actualPenaltyWinner: null` unconditionally for a `LIVE` match
through the real HTTP path, not just in the pure-function unit test
(§2.2). (Flagged transparently: the first framing of this check compared
raw `projectedTotal` directly and looked like a mismatch at first glance —
it wasn't a bug, just a test-construction artifact of the two users having
different *unrelated* confirmed baselines; the isolated live-delta
comparison is the correct, and confirmed-passing, proof.)

### 3.4 Cleanup

All 3 created test `Match` rows, all `Prediction`/`prediction_scores` rows
for A/B, the test `Pool`/`PoolMembership` rows, both `Profile` rows, and
both Supabase auth users were deleted in the script's `finally` block. A
residue check (direct Prisma counts across all five tables) confirmed
**zero** remaining rows for either test user; a separate `listUsers()` check
confirmed **zero** stray `bolt10-*@example.com` auth users. Both throwaway
scripts (`bolt10-verify.ts`, `bolt10-check-cleanup.ts`) were deleted from
`backend/src/scripts/` before finishing — `git status` on `backend/` shows
only this bolt's real source changes. The dev server was stopped.

## 4. A repo-hygiene bug found and fixed during this stage

Running the full mobile `yarn test` after adding backend's first Jest suite
revealed the root `jest.config.js` had no `testPathIgnorePatterns` excluding
`backend/` — its 3 new pure-TS test files (no JSX, no backend-specific
syntax) happened to *also* pass under the mobile React Native preset,
silently inflating the mobile test count (647 instead of the real 625) and
coupling two independent, separately-configured test runners together by
accident. Fixed by adding `testPathIgnorePatterns: ['<rootDir>/node_modules/',
'<rootDir>/backend/']` to the root `jest.config.js`, with a doc comment
explaining why. Confirmed: `npx jest --listTests` now returns exactly 92
(mobile-only) files; `cd backend && npx jest` still independently finds and
runs its own 3 suites.

## 5. Final counts

- **Mobile**: `yarn tsc --noEmit` clean. `yarn lint` clean (0 errors, 0
  warnings). **625 tests passing across 92 suites** (up from 599/87 at
  Implement close — +26 tests across 5 new suites: `dense-ranking`(4),
  `nickname-tie-break`(3), `rank-projection`(3), `rankings-screen`(5),
  `pool-leaderboard-screen`(6) = 21, plus +5 tests added to the existing
  `prediction-match-card` suite for the `pointsStatus` badge).
- **Backend**: `cd backend && npx tsc --noEmit` clean. **22 tests passing
  across 3 suites** — this backend's first-ever Jest suite
  (`compute-score`(10), `resolve-points`(6), `pool-leaderboard-aggregation`(6)).
- **Real backend/DB verification**: done for real (§3) — `score-match.ts`
  idempotency, `score-sweeper.ts`'s exact targeting + safe-no-op re-run, the
  `joinedAt` exclusion, and the tied-LIVE-penalty-bonus regression all
  proved correct through the real HTTP+DB path, zero discrepancies from
  the Model/Design/ADR expectations once the one test-construction artifact
  (§3.3) was correctly isolated. Zero residue after cleanup.

## 6. One real product bug found and fixed during Test stage (§2.4)

`rank-projection.ts`'s `previousPosition`/`positionDelta` did not honor
`hasConfirmedEntry: false` for a synthesized live-only row, contradicting
design.md §2's explicit rule. Caught by writing the exact regression test
design.md §11 named, confirmed failing against the pre-fix code, then
fixed. Mobile-only fix (no backend equivalent exists — position/rank is
never computed backend-side).

## 7. Manual Layer 2 (device) test paths — for the user's own manual pass

Per standing preference (`feedback_layer2_manual.md`), Layer 2 is not
automated and `agent-device` was not invoked. The following device-level
flows are ready for the user's own manual verification:

1. **4th tab appears and shows the global ranking** — confirm `Rankings`
   (Trophy icon) appears as the 4th bottom tab, after Home/Predictions/Pools,
   and lists real players with position/medal-for-top-3/nickname/total.
2. **Pool leaderboard reachable from Pool Detail** — open any pool's detail
   screen, tap the new "Leaderboard" button (next to "Predictions"),
   confirm it navigates to the pool-scoped leaderboard, showing every
   current member (including 0-point members).
3. **Live-projection banner/polling on a LIVE match**, if one exists in the
   live DB at verification time — confirm the "LIVE" badge appears on both
   the global ranking and any shared pool's leaderboard, the displayed
   total switches to the projected value, a positive/negative delta arrow
   (or "NEW") shows per row, and the screen silently re-polls roughly every
   20s without a manual pull-to-refresh.
4. **`pointsStatus` badge on `PredictionMatchCard`** — after a match you
   predicted finishes and gets scored (or immediately if one already has),
   open Predictions and confirm a small "Scored" badge appears next to that
   match's status; for a not-yet-finished match you've predicted, confirm
   "Pending" instead; confirm no badge appears where you have no
   prediction.
5. **Dark/light theme correctness** on both new screens (`RankingsScreen`,
   `PoolLeaderboardScreen`) — toggle the device/system theme and confirm
   both screens (chrome, loading/error/empty states, the LIVE banner) adapt
   correctly; the FlashList rows themselves are plain `StyleSheet` by
   design (§10 of design.md) — confirm they still read legibly in both
   themes even though they don't pull from Tamagui tokens directly.

## 8. What was explicitly flagged, not silently skipped

- **This is the first bolt to add unit tests to `backend/`** — every prior
  bolt (7, 8) verified backend work exclusively via real curl+DB checks.
  The new `backend/jest.config.js` is deliberately scoped to pure functions
  only; DB-touching logic continues to be verified for real, not mocked,
  matching the established convention rather than silently introducing a
  new one mid-bolt.
- **A repo-hygiene bug (§4)** and **a real product bug (§2.4/§6)** were both
  found during this Test stage, not assumed absent — consistent with this
  repo's own history of Test/Layer-2 stages catching real issues Jest-alone
  (or, in this bolt's backend case, curl-alone) checks wouldn't have on
  their own.
- **The tied-live-penalty-bonus real-DB check's first framing was
  ambiguous** (§3.3) — flagged and corrected transparently rather than
  reporting a false "identical totals" headline without the isolating
  delta calculation that actually proves the invariant.
