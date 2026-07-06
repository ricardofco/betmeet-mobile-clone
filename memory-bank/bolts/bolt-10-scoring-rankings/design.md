# Bolt 10 — Design

> Builds on `model.md` (checkpoint-approved 2026-07-06, §8 decisions now
> recorded as resolved: RANKINGS-4 identity, tie-break unification, lazy
> sweep-on-read). This stage does the real MF-placement re-examination
> `model.md §8` explicitly deferred to Design (task brief's own instruction,
> same rigor as Bolt 7/9's ADR-032/036/037/042), then designs the component/
> data-flow/state/theming shape for all four stories.

## 1. Module Federation placement — real investigation (task brief's explicit ask)

### 1.1 The question

Inception's `requirements.md §7.4`/`system-context.md §4` default
`scoring-rankings` to **Remote**, the same label `pools`/`competition`
originally carried. Bolt 7 (`pools`) re-examined and *reconfirmed* its remote
placement (ADR-032→036); Bolt 5 (`competition`) re-examined and *changed*
its placement from the Inception default (ADR-017, shared library instead of
remote). This bolt does the same fresh check for `scoring-rankings`, against
its own concrete scope — not a rubber-stamp either way.

### 1.2 Evidence gathered

1. **`domain-overview.md §7`'s cross-feature dependency map** — every edge
   involving `scoring-rankings`:
   ```
   predictions ────────→ scoring-rankings (reads resolved points for display)
   pools ──────────────→ scoring-rankings (membership changes invalidate leaderboard cache)
   competition ────────→ scoring-rankings (every sync run ends with a sweep that scores finished-unscored matches)
   scoring-rankings ───→ notifications    (GLOBAL_RANK_IMPROVED events — Bolt 11, out of scope)
   scoring-rankings ───→ scoring          (imports the shared pure algorithm, never redefines it)
   admin ──────────────→ scoring-rankings (Bolt 13, rescoring trigger — out of scope)
   ```
   Every incoming edge (`predictions →`, `pools →`, `competition →`) points
   **into** `scoring-rankings` — the same directionality `pools`' evidence
   trail found for its own placement (Bolt 7 design.md §1.2 point 4), not the
   render-blocking **outbound** pull that forced `competition`'s ADR-017
   (`predictions → competition`, where competition's data *was* predictions'
   primary screen content). Nothing here is structurally forced to co-locate
   with `scoring-rankings`'s own UI.
2. **What "reads resolved points for display" concretely means today**:
   Bolt 6's existing `buildScoreBreakdown`/`canShowScoreBreakdown`
   (`src/domain/predictions/prediction-score-display.ts`) already recomputes
   a score breakdown **client-side** from a `FINISHED` match + the viewer's
   own prediction — it does not call any `scoring-rankings` capability today,
   and this bolt does not change that (§8 below). The one new touch Design
   adds is an **additive** `pointsStatus` field on `MyPrediction` (§8) — a
   small enum read, not a UI-component import from another bundle. Same
   shape as Bolt 7's finding for pools' pull on predictions: "a small,
   secondary read, not a dependency on the other feature's screens."
3. **The one placement question with real teeth: RANKINGS-2 (pool
   leaderboard).** The bolt-plan's own instruction (echoed in this task's
   brief) is that the pool leaderboard fits into the **existing pool-detail
   screen/tab structure** — and `pool-detail-screen.tsx` **physically lives
   inside the `pools` remote** (`src/remotes/pools/screens/`, ADR-032/034).
   This project has never had one remote dynamically load or embed another
   remote's screen inside its own internal stack navigator — every remote
   (`education`, `pools`) is mounted from the **host** as exactly one
   `lazy(() => import('x/App'))` entry point (Bolt 7 design.md §4's explicit
   decision: the host holds zero compile-time knowledge of a remote's
   internal screen graph, and *remotes don't import each other* either). If
   `scoring-rankings` shipped as its own remote, RANKINGS-2's screen would
   need to live in a *third* bundle that `pools` cannot embed inline without
   a new, unprecedented cross-remote-loading mechanism — real, avoidable
   complexity with no corresponding benefit here.
4. **What RANKINGS-1 (global ranking) actually needs**: bolt-plan's explicit
   note is "new screens register into the tab/drawer shell, not a Home-hub
   button" — i.e., **one** new top-level screen, structurally identical in
   shape to `Predictions` (Bolt 6): a single primary list screen, no
   multi-screen flow of its own. `requirements.md §7.4` places `predictions`
   on the **host** specifically because it's a single, high-frequency screen,
   not a multi-screen remote-shaped flow (contrast with `pools`' six
   screens, which *did* justify Bolt 7's remote). Global ranking is the same
   shape as `predictions`, not as `pools`.
5. **RANKINGS-3 (live projection) is not a screen at all** — per `model.md
   §4`, it is data (extra fields on the same rows) rendered by whichever
   screen already shows the ranking, not a separate route. It cannot, by
   itself, justify any bundle placement.
6. **RANKINGS-4 (finalize scoring) has no mobile UI placement question** —
   it is backend-only (§4 below).
7. **Reuse-of-already-proven MF wiring, not re-proving it from scratch**: if
   `scoring-rankings` became a *new* remote, it would need its own
   `rspack.config.scoring-rankings-remote.mjs`, its own dev-server port, its
   own `ScriptManager` entry, and — critically — would need to **re-prove**
   the exact singleton risks Bolt 8/9 already found and fixed the hard way
   (`react-native-svg` double-registration, Tamagui duplicate-context,
   React-Query duplicate-`QueryClient`) for a *fourth* bundle. Placing
   RANKINGS-1 in the host and RANKINGS-2 inside the *already-wired* `pools`
   remote means **zero new MF shared-singleton entries** are needed at all —
   both bundles already carry `tamagui`, `i18next`/`react-i18next`,
   `@tanstack/react-query`, `@shopify/flash-list`, and (host-only)
   `lucide-react-native` from Bolts 5-9. This is a real, quantifiable
   complexity/risk reduction, not just a style preference.
8. **Native-module check** (`system-context.md §4`'s federation caveat):
   no new native module is needed by any of RANKINGS-1/2/3 (FlashList rows +
   Tamagui + a `lucide-react-native` tab icon, all already-linked). No
   blocker either way from this angle — consistent with `pools`' Bolt 7
   finding.

### 1.3 Decision — CHANGES the Inception default

**`scoring-rankings` does NOT ship as a Module Federation remote.** Its four
stories split across existing bundles by where their host screen or
navigable flow already lives, not as one new "feature bundle":

| Story | Ships as | Bundle |
|---|---|---|
| RANKINGS-1 (global ranking) | new host screen, new top-level tab (`Rankings`) | **Host** (`src/host/rankings/`) |
| RANKINGS-2 (pool leaderboard) | new screen inside the existing `pools` remote's internal stack, reached from `PoolDetailScreen` (same shape as Bolt 8's `PoolPredictions`) | **`pools` remote** (`src/remotes/pools/`) |
| RANKINGS-3 (live projection) | data fields on the same two screens' query responses + one shared, framework-free adapter — **not a screen** | **Domain, filesystem-shared** (`src/domain/rankings/`) |
| RANKINGS-4 (finalize scoring) | backend services + lazy sweep-on-read — **no mobile UI placement question** | **Backend** (`backend/src/services/scoring/`) |

This is a genuine **change** from Inception's "scoring-rankings → Remote"
default (same class of decision as ADR-017 for `competition`, not a
reconfirm like ADR-032→036 for `pools`) — recorded as its own ADR next
stage, with this section as the investigation trail (not a rubber-stamp).

**Consequence for `education`/future-remote precedent:** this is the first
time a unit named "Remote" at Inception splits across *three* existing
non-remote locations instead of becoming a new bundle or folding into one
shared library — worth flagging explicitly for Bolt 13 (Admin, which also
touches `scoring-rankings` per its "rescoring trigger" dependency) to redo
this same check rather than assume Admin's own placement follows Rankings'.

## 2. Domain layer — `src/domain/rankings/` (framework-free, filesystem-shared)

Mirrors the existing `src/domain/pools/`/`src/domain/competition/` shape
(pure functions/types, zero React/RN import, reusable from host **and**
`pools` remote at zero MF cost — same "one physical directory, same `@`
alias in every rspack config" invariant as ADR-015/017/025).

```
src/domain/rankings/
  ranking-row.ts          types: RankingRow (raw, from backend), RankedRow
                          (RankingRow + position/isTied), ProjectedRow
                          (RankedRow + previousPosition/positionDelta),
                          PointsStatus
  dense-ranking.ts        assignDensePositions<T>(rows, getPoints, tieBreak)
                          — the ONE port of betmeet-clone's ranking.ts
                          (model.md §5), generic over any row shape with a
                          numeric points field. Reused identically by
                          global ranking, pool leaderboard, and both
                          live-projection paths (RANKINGS-1/2/3) — same
                          "one physical implementation" discipline as
                          ADR-015/017/025.
  nickname-tie-break.ts   compareByNicknameAscending(a, b) — ONE function,
                          used by every sort in this bolt (see §6 — the
                          UNIFY decision means there is no scope- or
                          mode-specific variant to maintain).
  rank-projection.ts      buildRankedView(rows: RankingRow[]): {
                            confirmed: RankedRow[];
                            projected: ProjectedRow[] | null;  // null when
                                                                // no row
                                                                // carries a
                                                                // projectedTotal
                          }
                          Pure function: sorts+dense-ranks by confirmedTotal
                          for `confirmed`; if any row has a non-null
                          `projectedTotal`, sorts+dense-ranks again by
                          projectedTotal for `projected`, carrying
                          `previousPosition` from the confirmed pass and
                          `positionDelta = previousPosition - projectedPosition`
                          (`null` when `hasConfirmedEntry === false` — a
                          synthesized live-only row, model.md §4 point 6 —
                          regardless of what a naive 0-point tie would
                          otherwise produce).
  format-ranking-row.ts   pure display-shaping (medal glyph for top-3,
                          "tied" label, position-delta arrow direction) —
                          written ONCE here so the host's `RankingRow`
                          component and the `pools` remote's
                          `PoolLeaderboardRow` component can't silently
                          drift on formatting between the two screens.
  points-status.ts        resolvePointsStatus-equivalent **types only**
                          (`PointsStatus = 'SCORED' | 'PENDING_SCORING' |
                          'NOT_SCORED'`) — the actual resolution logic runs
                          backend-side (§4.4), this module just gives
                          mobile a typed constant to switch on for the
                          badge (§8).
```

**Why this is `src/domain/rankings/`, not `src/shared/rankings/`:** there is
no shared **UI/component** tier to introduce — RANKINGS-1's row/list
components live in `src/host/rankings/components/` and RANKINGS-2's live in
`src/remotes/pools/components/`, genuinely different bundles rendering
slightly different row shapes (a pool row may show a join-date/archived
affordance later; a global row never does). Only the **data-shaping logic**
is identical and shared — same reasoning ADR-024 already established for
predictions' host-only UI tier ("promote to `shared/` on a second bundle
consumer, not preemptively") applied here to the opposite layer (domain
logic is the shared piece, UI is not, because UI has no second consumer
today).

**No MF `shared` config entry needed for any of `src/domain/rankings/`** —
same as `scoring`'s ADR-015 and `competition`'s ADR-017: these are stateless
pure functions with no module-level state requiring a single-instance
guarantee (unlike Tamagui's theme context or React Query's `QueryClient`,
which genuinely break if duplicated). The "one physical file, `@/` alias"
guarantee is structural, not MF-mediated.

## 3. The new per-match, across-all-members override-or-global resolver (model.md §7)

Model §7 flagged this as **not quite existing yet** — Bolt 8's
`src/domain/predictions/pool-override.ts` only answers "should I *offer*
dual-save to *this one* viewer for *this one* match" (`shouldOfferDualSave`),
and the backend's `getMemberPredictions` handler (Bolt 8, POOLS-6) fetches
**both** a member's override and global rows for the grid but never
collapses them into one point total — the grid deliberately shows both with
a `hasGlobal` flag for display.

Rankings needs a **different** reduction: for every (member, match) pair in
a pool, pick **exactly one** effective prediction (override if one exists
for this pool, else the member's global prediction for that match, else
none) before summing points — this collapsing step doesn't exist anywhere
yet. Per this repo's established backend convention (ADR-030: every bolt
implements its own backend capabilities/services, business rules
reimplemented fresh against the spec, never imported from mobile `src/`),
this resolver is **backend-side only**:

```
backend/src/services/pool-leaderboard-aggregation.ts

resolveEffectivePredictions(rows: PredictionRow[], poolId: string):
  Map<`${userId}::${matchId}`, PredictionRow>
  — group by (userId, matchId); if a row with poolId === thisPool exists for
  that key, use it; else use the poolId === null row if present; else the
  pair is skipped (member never predicted that match — contributes 0,
  consistent with model.md §3's "member with 0 scored predictions still
  appears, at 0 points").
```

This is a **new, small, pure-enough** (operates on already-fetched Prisma
rows, no DB calls of its own) backend helper — not a port of any mobile
domain function, and not a duplicate of Bolt 8's `getMemberPredictions`
(which intentionally keeps both rows visible for the grid's own different
purpose). Reused by both the pool-leaderboard's confirmed-total aggregation
**and** its live-projection augmentation (§4.3) — one implementation, two
callers, same "don't duplicate a business rule" discipline the rest of this
repo already follows, just scoped to `backend/` instead of `src/domain/`.

## 4. Backend capability contract + RANKINGS-4 services (designed together, per ADR-030)

### 4.1 New capability group `rankings.*`

Same `POST ${baseUrl}/${capability}` / Bearer-JWT / `{ok:true,...}|{ok:false,error:...}`
contract every prior capability group uses (`backend/src/routes/handlers.ts`).

| Capability | Body | Response |
|---|---|---|
| `rankings.getGlobalRanking` | — | `{ ok: true; isLive: boolean; rows: RankingRowDTO[] }` (read-only, no failure shape — same as `pools.getMine`/`listPublic`) |
| `rankings.getPoolLeaderboard` | `{ poolId }` | `{ ok: true; isLive: boolean; rows: RankingRowDTO[] } \| { ok: false; error: 'NOT_FOUND' \| 'NOT_MEMBER' }` |

```ts
// RankingRowDTO — raw totals only; NO position/rank field. Position/
// dense-ranking/tie-break is computed MOBILE-side (§2's rank-projection.ts,
// model.md §5's explicit "reused... shared function" ask), exactly the same
// "shape at read time" split ADR-019 already established for
// FixtureView's day-grouping (never cache a derived, clock-dependent shape
// as the query result itself).
type RankingRowDTO = {
  userId: string;
  nickname: string | null;
  avatarUrl: string | null;
  isViewer: boolean;           // auth.userId === row.userId, computed server-side
  confirmedTotal: number;
  projectedTotal: number | null;   // null when `isLive` is false for this response
  hasConfirmedEntry: boolean;      // false only for a live-only synthesized
                                    // row (model.md §4 point 6) — always
                                    // true for pool-scope rows, since every
                                    // member already appears per model.md §3
};
```

**Why totals only, never raw per-match predictions, for the live-projection
case:** betmeet-clone's own `project-leaderboard.ts`/`queries.ts` are
server-only (Next.js server components/services, per `model.md`'s own file
citations) — they never expose one user's raw predicted scoreline to
another user's client, only the aggregated point totals a leaderboard
needs. Mirroring that (and ADR-038's "masking computed server-side, never
trust the client with more raw data than its UI needs" precedent from Bolt
8) keeps this bolt's disclosure surface identical to source, not wider.

### 4.2 Lazy sweep on read (checkpoint decision 3 — CONFIRMED, recorded here)

Both `rankings.getGlobalRanking` and `rankings.getPoolLeaderboard` call a
shared `sweepFinishedUnscoredMatches()` (backend/src/services/scoring/score-sweeper.ts)
**before** aggregating — an efficient, idempotent query (`Match.status =
'FINISHED' AND homeScore/awayScore NOT NULL AND` no matching
`prediction_scores` row for at least one of its predictions), calling
`scoreMatch(matchId)` per stale match found. Safe to call on every read
(mirrors betmeet-clone's own `scoreFinishedUnscoredMatches`'s "safe to run
repeatedly" contract, model.md §6).

**Elaboration beyond the checkpoint's literal scope, flagged explicitly (not
a re-litigation):** `predictions.getMyPredictions` **also** calls the same
sweep before resolving each prediction's `pointsStatus` (§4.4/§8) — the
checkpoint said "rankings-read endpoint(s), at minimum"; this is the same
cheap, idempotent call, needed so `pointsStatus: 'SCORED'` is accurate the
first time a user opens Predictions after a match finishes, not only after
they've separately visited a ranking screen. No new trigger *mechanism* is
introduced — same sweep function, one more caller.

### 4.3 `backend/src/services/scoring/` (RANKINGS-4)

```
compute-score.ts     Backend-side port of `src/shared/scoring/compute-score.ts`
                      — see §5 below for the ADR-016 tension this creates and
                      how it's handled.
score-match.ts        scoreMatch(matchId): idempotent upsert of one
                      PredictionScore row per prediction (global AND
                      pool-override rows both — every Prediction row for
                      that match, not just one) tied to that match, fully
                      overwriting from scratch (model.md §6's
                      "never additive, never partial"). If the match is no
                      longer scoreable (reverted status or nulled score —
                      Bolt 13's future concern), deletes any existing
                      PredictionScore rows for it instead.
score-sweeper.ts       sweepFinishedUnscoredMatches(): the lazy-sweep entry
                      point (§4.2).
resolve-points.ts      resolvePointsStatus(prediction, match, score):
                      PointsStatus — SCORED (has a PredictionScore row) →
                      NOT_SCORED (match CANCELLED/POSTPONED) →
                      PENDING_SCORING (prediction exists, not yet
                      finished/scored) → NOT_SCORED (no prediction). Mirrors
                      betmeet-clone's `resolve-points.ts` (model.md §6),
                      reimplemented fresh.
```

`pool-leaderboard-aggregation.ts` (§3) sits alongside these, in
`backend/src/services/`, calling `compute-score.ts` for the live-projection
branch (§4.3.1 below) and reused by `getPoolLeaderboard`'s confirmed-total
branch.

### 4.3.1 Aggregation + live-projection logic (per scope)

**Global** (`rankings.getGlobalRanking`):
1. Confirmed: `SUM(prediction_scores.total_points) GROUP BY user_id` joined
   through `predictions WHERE pool_id IS NULL`, restricted to
   `profiles.verification_status != 'UNVERIFIED' AND deleted_at IS NULL`
   (model.md §2 — only users with ≥1 scored prediction appear).
2. Live (only when ≥1 relevant match is `LIVE`): for each currently-`LIVE`
   match, find every **global** (`poolId = null`) prediction against it,
   including from users **absent** from step 1's result set (model.md §4
   point 6 — synthesized rows, `hasConfirmedEntry: false`, `confirmedTotal: 0`).
   For each such prediction, call the backend's `compute-score.ts` with
   `actualPenaltyWinner: null` unconditionally (model.md §4 point 5's
   headline rule — mechanically identical to how the mobile domain already
   treats a `LIVE` match's penalty winner as unknown, `prediction-score-display.ts`'s
   `deriveActualPenaltyWinner` pattern, just re-hosted backend-side since
   this computation now spans every user, not one viewer). Sum each user's
   live points across all relevant `LIVE` matches, add to their
   `confirmedTotal` → `projectedTotal`.
3. `isLive = liveMatches.length > 0` for this scope.

**Pool** (`rankings.getPoolLeaderboard`):
1. Membership check first (`NOT_MEMBER` if the caller isn't in
   `PoolMembership` for this pool — same gate every other pool-scoped read
   uses).
2. Confirmed: every current `PoolMembership` row for the pool (model.md §3
   — 0-point members included, `hasConfirmedEntry: true` always). For each
   member, `resolveEffectivePredictions` (§3) picks override-or-global per
   match, **excluding** any match whose `kickoffAt < member.joinedAt`
   (model.md §3's join-date scoping, reusing the existing
   `PoolMembership.joinedAt` field — no new field). Sum via each
   prediction's existing `prediction_scores.total_points`.
3. Live: same `LIVE`-match + `actualPenaltyWinner: null` treatment as
   global, but resolving each member's *effective* (override-or-global)
   prediction for that `LIVE` match via the same `resolveEffectivePredictions`
   helper, and applying the same `joinedAt` exclusion (model.md §4 point 4).
   No synthesized-row case here — every member already has a row (step 2).

## 5. The ADR-016 tension — backend needs its own `computeScore` (flagged explicitly for the ADR stage)

`src/shared/scoring/compute-score.ts`'s own doc comment (ADR-016) states:
*"no other unit may define its own... computeScore-equivalent function."*
That invariant was written when only the **mobile app** existed as a
TypeScript project. `backend/` is a fully standalone Node/Express service
(own `package.json`, own `tsconfig.json` with `rootDir: "src"`) — it cannot
import `src/shared/scoring/` without breaking that `rootDir` boundary, and
every backend business rule to date (invite-token generation, permission
checks, masking, dual-save atomicity) has already been **"reimplemented
fresh against the spec, never imported"** per `requirements.md §7.3`/ADR-030
— this bolt's `backend/src/services/scoring/compute-score.ts` follows that
exact, already-established precedent, not a new one. It is, however, the
**first time** the specific algorithm ADR-016 named as a single-source
invariant needs a second, physically separate implementation — worth its
own explicit ADR-stage record (a "twin invariant": both files' doc comments
cross-reference each other, and any future change to the scoring rules must
touch both, with a shared fixture-based test-case list — not the same TS
module — checked at Implement/Test time). Flagged here so it isn't silently
missed at ADR stage; not a blocker to proceeding.

## 6. Tie-break unification (checkpoint decision 2 — CONFIRMED, recorded here as the Design-stage decision)

`compareByNicknameAscending` (§2) is the **only** secondary sort used by:
- Global ranking, confirmed (already had it in betmeet-clone).
- Pool leaderboard, confirmed (betmeet-clone had **none** — this bolt adds
  one, a deliberate mobile-side improvement, same spirit as Bolt 8's
  ADR-040).
- Live projection, both scopes (betmeet-clone already had it for its
  project-leaderboard sort).

`rank-projection.ts`'s `buildRankedView` takes exactly one tie-break
function as a parameter and every call site passes
`compareByNicknameAscending` — there is no code path that could
accidentally diverge (unlike betmeet-clone's own three call sites, which
genuinely differ). Gets its own ADR next stage (a deviation-from-source-app
decision, same class as ADR-040).

## 7. Component design & navigation registration

### 7.1 RANKINGS-1 — Global ranking (host, new tab)

```
src/host/rankings/
  screens/
    rankings-screen.tsx        FlashList of RankedRow/ProjectedRow, Tamagui
                                primitives (Screen/Card/Row/Heading/
                                BodyText/MutedText/LoadingState/ErrorState/
                                EmptyState from src/shared/design/primitives.tsx
                                — reused as-is, zero new tokens/primitives
                                needed), a small "LIVE" banner (Tamagui,
                                not `src/shared/competition`'s LiveIndicator
                                directly — that component's props are shaped
                                around one Match, not a ranking-wide flag;
                                a new one-line Tamagui badge is cheaper than
                                adapting it)
  components/
    ranking-row.tsx             one FlashList row: position/medal (top 3),
                                nickname, avatar, confirmedTotal or
                                projectedTotal + positionDelta arrow when
                                live — uses `format-ranking-row.ts` (§2) for
                                the actual glyphs/labels, only lays out
                                Tamagui primitives
  hooks/
    use-global-ranking-query.ts TanStack Query: fetch RankingRowDTO[], apply
                                `buildRankedView` via `select` (ADR-019
                                precedent — never cache the ranked shape as
                                the query result itself, since a client-side
                                re-sort of the exact same raw payload is
                                free and the raw payload is what's actually
                                cacheable)
```

**Navigation registration** — a 4th tab, confirming Bolt 9's own forward
check ("`MainTabNavigator` is designed to accept additional `Tab.Screen`s
without a reshape — confirmed as a non-functional Design check, not built
now," `bolt-9.../design.md §1`):

- `MainTabParamList` (auth-stack-params.ts) gains `RankingsTab: undefined`.
- New `RankingsStackParamList = { Rankings: undefined }`.
- `screen-registry.ts` gains `Rankings: ['protected']` — same tag as
  `Home`/`Predictions`/`Pools`.
- `main-tab-navigator.tsx` gains a fourth static `RankingsStack`/
  `RankingsStackNavigator` (same shape as the existing three — a
  `NativeStackNavigator` with one root screen, `headerLeft:
  renderHeaderMenuButton`) and a fourth `Tab.Screen`, `tabBarIcon` using a
  new `lucide-react-native` glyph (`Trophy`, already covered by the
  existing host-only MF singleton entry — ADR-047, no new MF wiring).
- Tab ordering: `Home / Predictions / Pools / Rankings` (newest last) —
  cosmetic, not a functional decision.

### 7.2 RANKINGS-2 — Pool leaderboard (inside the `pools` remote)

```
src/remotes/pools/
  screens/
    pool-leaderboard-screen.tsx   same shape as the existing
                                  pool-predictions-screen.tsx (Bolt 8) —
                                  FlashList + Tamagui primitives (already an
                                  MF shared singleton in this bundle, ADR-043
                                  — zero new wiring)
  components/
    pool-leaderboard-row.tsx      same `format-ranking-row.ts` reuse as the
                                  host's `ranking-row.tsx` — visually
                                  consistent labeling without a shared
                                  component
  hooks/
    use-pool-leaderboard-query.ts ['pools', 'leaderboard', poolId] — a
                                  parameterized key (same precedent as
                                  `usePoolDetailQuery`, Bolt 7 design.md §6),
                                  `select`-applies `buildRankedView`
                                  identically to §7.1's host hook (imported
                                  from the same `src/domain/rankings/`
                                  module — literally the same function
                                  reference, not a re-implementation)
```

**Navigation registration** — one new internal route on the *existing*
`pools` remote's own stack (no host change beyond what already exists for
`Pools`):

- `PoolsStackParamList` gains `PoolLeaderboard: { poolId: string }`.
- `pool-detail-screen.tsx` gains a new button, `t('pools.detail.leaderboard')`,
  next to the existing `t('pools.detail.predictionsButton')` button,
  `navigation.navigate('PoolLeaderboard', { poolId })` — same shape as the
  existing `handleOpenPredictions` callback in that file. No membership/
  permission gate needed beyond the existing "must be a pool member to see
  this screen at all" gate every other pool-detail affordance already has
  (`viewerId` truthy check already wraps every conditional button in that
  file).

### 7.3 RANKINGS-3 — Live projection (no screen)

Both `use-global-ranking-query.ts` and `use-pool-leaderboard-query.ts`
render the exact same response shape through the exact same
`buildRankedView` (§2); each screen's row component reads `isLive` off the
query result and conditionally shows `projectedTotal`/`positionDelta`
instead of `confirmedTotal` when true. No new navigation, no new domain
concept beyond what §2/§4 already define.

**Refresh strategy while `isLive: true`:** TanStack Query's own
`refetchInterval` (short-poll, e.g. 20s, enabled only while the last known
`isLive === true`), **not** a fork/genericization of Bolt 5's
`useLiveCompetitionSubscription` (which is hardcoded to
`useInvalidateFixtureQuery()`'s one query key, ADR-025's precedent of not
adding a generic prop to an existing single-purpose hook applies here too —
duplicating ~10 lines of polling config is cheaper and safer than forking a
Realtime-subscription hook for a secondary, non-primary-live-experience
screen). Ranking screens are not the app's primary "watch the match live"
surface (Predictions/the competition fixture list already own that,
ADR-021) — a plain poll is proportionate here.

## 8. `pointsStatus` — where RANKINGS-4 surfaces in the UI (model.md §6's Design-stage call)

`predictions.getMyPredictions`'s response gains one **additive** field per
prediction: `pointsStatus: PointsStatus` (§2's type), computed backend-side
via `resolve-points.ts` (§4.3), after the same lazy sweep (§4.2) has run.
`MyPrediction` (`src/domain/predictions/prediction-with-match.ts`) widens to
include it — non-breaking, same additive-field precedent as Bolt 8's
`alsoSaveAsGlobal`.

**UI touch (Bolt 6's existing `PredictionMatchCard`, host):** one small
badge — "Scored" / "Pending" / nothing (NOT_SCORED renders no badge, since
it's the common no-prediction-yet case and a badge would be noise) — reads
`prediction.pointsStatus` directly, no new query, no new screen. This is the
"points-status surfaced somewhere" the task brief asked for, and it's the
minimal, correctly-scoped touch: it does **not** change
`canShowScoreBreakdown`/`buildScoreBreakdown`'s existing client-recomputation
behavior (still valid, still instant, still explicitly "not the
authoritative source" per that file's own comment) — `pointsStatus` is a
new, separate, backend-authoritative signal answering a different question
("has this been durably scored yet," not "what's the breakdown").

## 9. State boundaries

| State | Owner | Mechanism |
|---|---|---|
| Global ranking rows | host | `useGlobalRankingQuery()` — `['rankings', 'global']`, `select: buildRankedView` |
| Pool leaderboard rows | `pools` remote | `usePoolLeaderboardQuery(poolId)` — `['pools', 'leaderboard', poolId]`, `select: buildRankedView` |
| Live-refresh polling toggle | both hooks, locally | derived from the query's own last `data.isLive`, no Zustand store (single-owner, same reasoning as ADR-020) |
| `pointsStatus` per prediction | host, existing `use-predictions-query.ts` | additive field on the existing `['predictions', 'mine']` query — no new key |
| Row/list local UI state (none needed) | — | no forms, no local edit state — both new screens are read-only |

No new Zustand store — same conclusion Bolt 7 reached for pools (§6 there):
nothing here is cross-cutting client-only UI state.

## 10. Theming

Both new screens (`rankings-screen.tsx`, `pool-leaderboard-screen.tsx`) are
built **Tamagui-first from the start** (per design-standards.md and this
bolt's persona instruction) — composing the existing
`src/shared/design/primitives.tsx` primitives (`Screen`, `Card`, `Row`,
`Heading`, `BodyText`, `MutedText`, `LoadingState`, `ErrorState`,
`EmptyState`) with zero new tokens needed. FlashList rows
(`ranking-row.tsx`/`pool-leaderboard-row.tsx`) stay **plain `StyleSheet`**
internally, matching this repo's one documented, narrow exception to
"Tamagui in list rows" (Bolt 9 `implement-and-test.md §5`'s FlashList-perf
rationale — a themed `View`/`Text` wrapper still resolves through Tamagui's
runtime style resolution per row, avoided in any FlashList `renderItem` for
the same reason predictions'/pools' own row components already avoid it).
Both screens are dark-mode-correct on first paint (inherit the host's
`<TamaguiProvider defaultTheme>`, Bolt 9 §5) — no retrofit needed, since
these are net-new screens, not existing ones being migrated.

## 11. Testing approach preview

- Domain (`src/domain/rankings/`): `assignDensePositions` (the "1,1,2" case
  + a "no ties" case + an all-tied case), `compareByNicknameAscending`,
  `buildRankedView` (confirmed-only when no row has `projectedTotal`;
  projected + `positionDelta` + `previousPosition: null` for a
  `hasConfirmedEntry: false` row; the explicit tied-live-penalty-bonus case
  model.md §4 names: two users, same live scoreline, different
  `penaltyWinnerTeamId` picks — both get identical `projectedTotal`, no
  bonus to either — this is actually a **backend** `compute-score.ts` test
  case, not a mobile one, since the bonus math runs backend-side (§4.3.1),
  but it's the single most important regression test in this whole bolt and
  must exist somewhere with an explicit cross-reference from both sides).
- Backend: `score-match.ts` idempotency (re-run twice, same result),
  `score-sweeper.ts` (finds exactly the stale matches, safe to call with
  nothing to do), `resolve-points.ts`'s four-state resolution,
  `resolveEffectivePredictions` (override-wins-over-global,
  no-double-count), the `joinedAt` exclusion, and real curl + DB
  verification against the live Supabase DB (this repo's established Bolt
  7/8 precedent — not contract-only).
- Component (RNTL): `rankings-screen`/`pool-leaderboard-screen` loading/
  error/loaded/live-vs-confirmed-display states; `PredictionMatchCard`'s new
  `pointsStatus` badge (extends the existing test suite, doesn't replace
  it).
- Device/E2E: deferred to the user's own manual pass per standing
  preference (no `agent-device` invocation planned), documented as manual
  test paths in `implement-and-test.md` once Implement lands.

## 12. Summary of decisions requiring ADRs (written next stage)

1. **MF placement** (§1) — `scoring-rankings` does **not** ship as a remote;
   splits across host (RANKINGS-1), the existing `pools` remote
   (RANKINGS-2), a filesystem-shared domain module (RANKINGS-3), and the
   backend (RANKINGS-4). A genuine change from Inception's default, same
   class as ADR-017.
2. **Tie-break unification** (§6, checkpoint decision 2) — nickname-ascending
   applied uniformly across every ranking surface, a deliberate mobile-side
   improvement over betmeet-clone's own internal inconsistency, same spirit
   as ADR-040.
3. **Lazy sweep-on-read trigger mechanism** (§4.2, checkpoint decision 3) —
   both `rankings.*` read capabilities (and, as a Design-stage elaboration,
   `predictions.getMyPredictions`) invoke a shared idempotent backstop sweep
   before reading; no new cron/script infrastructure.
4. **Backend-side `computeScore` port** (§5) — a new, explicit "twin
   invariant" alongside ADR-016, since `backend/` cannot import
   `src/shared/scoring/` (standalone Node project, separate `tsconfig`
   `rootDir`) and must reimplement the algorithm fresh, following the
   already-established ADR-030 backend convention. Flagged here as a new
   item found during Design, not previously anticipated in `model.md`.

---

**Checkpoint:** Design stage complete. No new human decision is required
before ADR stage — the one open question `model.md §8` deferred here (MF
placement) has been resolved with a real investigation (§1), and the three
checkpoint-confirmed decisions (tie-break, trigger mechanism, RANKINGS-4
identity) are recorded as implemented into this design, not re-opened. The
one item worth an explicit human nod (not a blocker) is §5's ADR-016
tension — flagged for awareness, not requiring a decision before proceeding
to ADR stage, since the resolution (reimplement fresh, cross-reference both
files) already follows this project's own established, approved convention.
