# Bolt 10 — Model

## 0. Scope reconciliation (no `units/unit-*` story files exist for RANKINGS-1..4)

Same gap already hit and handled the same way in Bolts 5/6/7 (see those
bolts' `model.md`s): `memory-bank/intents/liga-mundial-mobile-migration/units/`
has no `unit-*-rankings/RANKINGS-*.md` files in this repo. Per the standing
precedent, scope was reconciled directly against:

1. `memory-bank/project/domain-overview.md §5.6` (Rankings) and `§5.9`, plus
   `project-inventory.md` line 74 (`scoring-rankings | 19 | Persists scores
   on match finish, global/pool leaderboards, live projection`).
2. **`betmeet-clone`'s real, running source** — not just its docs — read
   directly, since the domain-overview prose turned out to have one genuine
   inaccuracy (§4 below) that only the real code caught, exactly the class
   of thing the coordinator's brief warned about. File-by-file evidence
   trail is cited inline throughout this document; every rule below is
   tagged **[CONFIRMED — file:line]** or **[BEST GUESS — reasoning]**, no
   exceptions.

Files actually read in `betmeet-clone` (sibling repo,
`/Users/ricardo/Documents/dynamicdevs/proyectos/kinela/betmeet-clone`):
- `src/features/scoring-rankings/services/ranking.ts` (dense ranking)
- `src/features/scoring-rankings/services/project-leaderboard.ts` (live projection)
- `src/features/scoring-rankings/services/score-match.ts` (persistence/idempotency)
- `src/features/scoring-rankings/services/score-sweeper.ts` (backstop)
- `src/features/scoring-rankings/services/resolve-points.ts` (points-status)
- `src/features/scoring-rankings/queries.ts` (global + pool query shape, tie-break, caching)
- `src/features/scoring-rankings/types.ts`, `cache-tags.ts`
- `src/features/scoring-rankings/components/pool-leaderboard.tsx`
- `src/app/(app)/rankings/page.tsx`
- `aidlc-docs/construction/unit-6-scoring-rankings/functional-design/business-rules.md` (BR-6.x, original pool-leaderboard design)
- `aidlc-docs/construction/unit-14-global-ranking-rules-refine/functional-design.md` (FR-REFINE-14.x, global ranking added later)
- `aidlc-docs/construction/unit-62-leaderboard-live-projection/functional-design.md` (BR-62.x, live projection added later)

### Mapping RANKINGS-1..4 to betmeet-clone's real feature set

The bolt-plan's own risk sentence anchors two of the four precisely:
*"the dense-ranking display **(RANKINGS-1/2)** ... the 'no penalty bonus
during live projection' rule **(RANKINGS-3)**"* — so RANKINGS-3 = live
projection is certain. RANKINGS-1/RANKINGS-2 are "the two dense-ranking
*displays*" — betmeet-clone has exactly two leaderboard screens (global
`/rankings`, added later in Unit 14; per-pool, `/pools/[id]` tab +
`/pools/[id]/leaderboard`, original Unit 6 + membership-scoping refined in
Unit 55). Ordering them 1/2 by the bolt-plan's own dependency note ("Bolt 8
pool membership/joinedAt for pool leaderboards" is named *second*, after
"Bolt 6 predictions exist to be scored") is itself ambiguous as to which is
"1" — **treated as a naming-only ambiguity, not a scope one**, resolved here
as RANKINGS-1 = Global, RANKINGS-2 = Pool (matches this repo's existing
`predictions`→`pools` build order and domain-overview's §5.6/§5.3
presentation order). **[BEST GUESS — the 1-vs-2 label assignment; the
underlying scope of "one global screen + one pool screen" is CONFIRMED]**.

**RANKINGS-4 is not named anywhere in the bolt-plan excerpt or in
domain-overview.md's rankings section.** Resolved by a converging piece of
evidence found in `bolt-plan.md` itself, not in betmeet-clone: Bolt 13
(Admin)'s dependency line reads *"Depends on: Bolt 5 (match data), **Bolt 10
(rescoring trigger target)**"*. A "rescoring trigger" only makes sense if
Bolt 10 is the bolt that builds the actual score-persistence mechanism
(`scoreMatch`/`scoreFinishedUnscoredMatches` in betmeet-clone) — this is
also independently confirmed as a real, current gap in this repo's own
`backend/` (grepped: zero references to `predictionScore`/`scoreMatch`/
scoring persistence anywhere in `backend/src`, despite the
`prediction_scores` table already existing in `backend/prisma/schema.prisma`
lines 291-308, pulled from the live DB along with the rest of
betmeet-clone's schema during backend-phase1). Without this, RANKINGS-1/2's
screens would have no real data to display at all — every `PredictionScore`
row for a FINISHED match is currently unpopulated in this project's Supabase
project. **RANKINGS-4 = "finalize match scoring"**: the idempotent
score-persist-on-`FINISHED` + backstop-sweep + `pointsStatus` resolution
rules (mirrors betmeet-clone's `score-match.ts`/`score-sweeper.ts`/
`resolve-points.ts`). **[BEST GUESS, but corroborated by two independent
pieces of evidence (Bolt 13's dependency line + the empty `prediction_scores`
table) — flagged explicitly for the human checkpoint below, not silently
assumed.]**

## 1. Ubiquitous language

| Term | Meaning |
|---|---|
| **Leaderboard row** | One user's ranked entry: `position`, `userId`, `nickname`, `avatarUrl`, `totalPoints`, `isViewer`, `isTied`. |
| **Global ranking** | Every verified, non-deleted user with ≥1 scored prediction, ranked by their **global** (`poolId = null`) `PredictionScore` total. |
| **Pool leaderboard** | A single pool's members, ranked by the points each accumulated **inside that pool** (override-aware, join-date-scoped — see §3). |
| **Dense ranking** | Tied entries share one `position`; the next distinct-points group's position is exactly `previousPosition + 1`, regardless of how many users tied (never "1, 1, 3"). |
| **Live projection** | A **non-persisted**, recomputed-per-read re-ranking that adds each user's in-progress `LIVE`-match points (sans penalty bonus) on top of their confirmed total, for as long as at least one relevant match is `LIVE`. |
| **Confirmed total** | `SUM(PredictionScore.totalPoints)` for a user in a given scope (global or pool) — only `FINISHED`-and-scored matches contribute here. |
| **Projected total** | `confirmed total + livePoints` (see §4) — display-only, never written to any table. |
| **Score persistence / finalize scoring** | The (RANKINGS-4, best-guess) act of computing and upserting one `PredictionScore` row per prediction once its match is scoreable, via the same shared `computeScore()` Bolt 4 already owns. |
| **PointsStatus** | Per-prediction display status: `SCORED` \| `PENDING_SCORING` \| `NOT_SCORED` — resolved from whether a `PredictionScore` exists and the match's status. |

## 2. Global ranking (RANKINGS-1)

**[CONFIRMED — `betmeet-clone/src/features/scoring-rankings/queries.ts:15-62`,
`aidlc-docs/.../unit-14-global-ranking-rules-refine/functional-design.md`]**

- Scope: `Prediction.poolId IS NULL` only (global predictions). Pool-scoped
  overrides never contribute to the global ranking, even for the pool's own
  members (`domain-overview.md §5.6` doesn't say this explicitly, but the
  real query does: `queries.ts:22` filters `prediction: { poolId: null }`).
- Only users with `verificationStatus !== 'UNVERIFIED'` **and**
  `deletedAt === null` are included (`queries.ts:34-38`). A user with zero
  scored predictions never appears (the `groupBy` only returns rows that
  exist — `queries.ts:20-26`); there is no "0-point" placeholder row for
  someone who has never been scored, unlike a *pool* leaderboard (§3) where
  every **member** appears even at 0.
- **Sort order — CORRECTS a domain-overview.md inaccuracy, per this
  project's standing rule to resolve spec conflicts from real code (same
  precedent as Bolt 3's ADR-011):** `domain-overview.md §5.6` states global
  tie-break is *"an arbitrary-but-deterministic secondary sort (not
  nickname-based)"*. The **real code disagrees**: `queries.ts:50` —
  `.sort((a, b) => b.totalPoints - a.totalPoints || a.nickname.localeCompare(b.nickname))`
  — is nickname-ascending, and the refine doc is explicit about it too:
  *"FR-REFINE-14.3 ... desempate por `nickname` ascendente (estable y
  determinístico)"* (`unit-14.../functional-design.md:31-33`). **The real
  rule is: primary sort `totalPoints` desc, secondary sort `nickname` (the
  full formatted `nickname#discriminator` string) ascending, via
  locale-aware compare.** Domain-overview.md's "not nickname-based" phrase
  should be treated as **stale/incorrect** for this one clause going
  forward — flag for a domain-overview.md correction pass, do not silently
  perpetuate it. This is the one item in this Model worth a human nod at
  checkpoint (analogous severity to ADR-011, though lower stakes — it only
  affects tie-break order among equal-point users, not points or ranking
  positions themselves, since dense ranking already gives them the same
  `position`).
- Dense ranking applied via the shared algorithm (§5 below) after the sort.

## 3. Pool leaderboard (RANKINGS-2)

**[CONFIRMED — `betmeet-clone/src/features/scoring-rankings/queries.ts:64-163`,
`unit-6-scoring-rankings/functional-design/business-rules.md` BR-6.11 through
BR-6.16]**

- Scope: **every current member** of the pool (`PoolMembership`), regardless
  of whether they've scored anything — a member with 0 scored predictions
  still appears, at 0 points (BR-6.12; differs from the global ranking's
  "only users with ≥1 score" rule in §2 — **do not unify these two
  behaviors**, they're deliberately different).
- Per-match points resolution, for each (member, match) pair: **use the
  member's pool-scoped override (`poolId = thisPool`) if one exists for
  that match; otherwise fall back to their global prediction
  (`poolId = null`) for the same match.** Never double-count both
  (`queries.ts:100-133`'s `overrideKeys` de-dup pattern). This is the exact
  "override always wins for that pool's leaderboard" rule already stated in
  `domain-overview.md` line 40, now confirmed at the query level too.
- **`joinedAt` scoping (Bolt 8 dependency, BR — Unit 55 "membership-scoped"
  refine):** a match's points count toward a member's pool total **only if
  `match.kickoffAt >= member.joinedAt`** (`queries.ts:115-120`). A member who
  joined after a match kicked off does not inherit that match's points into
  this pool's total, even though the same prediction *does* count toward
  their global total. This is the mobile-side `PoolMembership.joinedAt`
  field already modeled in Bolt 7/8 (`src/domain/pools/pool.ts:26-31`) — no
  new field needed, just a new consumer of it.
- **Sort order — no secondary tie-break at all** in the *confirmed* (non-
  projected) pool query: `queries.ts:144` —
  `.sort((a, b) => b.totalPoints - a.totalPoints)`, nothing else. This is a
  genuine, confirmed **inconsistency** inside betmeet-clone itself (global
  ranking has a nickname tie-break, confirmed pool leaderboard does not) —
  not something to "fix" silently per this project's own standing
  discipline (dense-ranking's own doc comment already warns "don't silently
  fix" a deviation once decided). Recorded here as-is; Design stage should
  decide whether mobile intentionally applies the same nickname tie-break
  to both scopes for consistency (a legitimate, mobile-specific
  improvement, similar in spirit to Bolt 8's ADR-040 ownership-transfer
  addition) or faithfully reproduces this asymmetry. **Flagged as an open
  question for Design, not resolved here.**
- Visibility/authorization: only pool members can see the pool's
  leaderboard (BR-6.16) — same membership gate Bolt 7/8 already built for
  every other pool-scoped read.
- Dense ranking applied the same way as global (§5).

## 4. Live projection (RANKINGS-3) — the highest-risk rule

**[CONFIRMED — `betmeet-clone/src/features/scoring-rankings/services/project-leaderboard.ts`
(full file read), `betmeet-clone/src/features/scoring-rankings/queries.ts:176-356`,
`unit-62-leaderboard-live-projection/functional-design.md` BR-62.1 through
BR-62.8]**

Applies to **both** scopes (global and pool) with the same core algorithm;
scope-specific input differs (which predictions/members feed it).

1. **Only activates when at least one relevant match is `LIVE`**
   (`liveMatches.length === 0` ⇒ leaderboard renders exactly like the
   confirmed (non-live) ranking, no reordering, no extra UI — BR-62.1). This
   is a **conditional mode**, not an always-on recompute.
2. **`projectedPoints = confirmedTotal + livePoints`**, where `livePoints`
   is the sum, over every `LIVE` match relevant to the scope, of
   `computeScore(resolvedPrediction, liveMatchScoreboard).totalPoints` —
   using the **same shared `computeScore()`** Bolt 4 already owns (no
   scoring math is reimplemented here, same invariant as Bolt 6's
   `prediction-score-display.ts`, ADR-016's duplicate-detection gate
   applies identically to this bolt).
3. **The prediction resolved per (user, LIVE match) is override ?? global**
   (pool scope) or **global only** (global scope, pool overrides are
   ignored even for LIVE matches — `queries.ts:31` comment, confirms §2's
   "pool overrides never contribute to global" extends to the live-
   projection path too, not just the confirmed one).
4. **`joinedAt`/pre-join skip applies identically to live projection** as it
   does to the confirmed pool total (§3) — a match that kicked off before a
   member joined the pool is excluded from that member's projected points
   too, not just their confirmed ones (BR-62.2 pool clause,
   `project-leaderboard.ts:236-238`/`queries.ts:337`).
5. **THE HEADLINE RULE — no penalty bonus during live projection:** while a
   match is `LIVE`, its `winnerTeamId` is **always passed as `null`** into
   `computeScore()`'s input (`project-leaderboard.ts:207-209`,
   `queries.ts:209/215`, and explicitly documented as BR-62.3: *"Durante
   LIVE, `Match.winnerTeamId` es `null`... así que el bonus de penales no se
   concede durante LIVE, aunque la predicción defina
   `penaltyWinnerTeamId`"*). Mechanically this is **not a special-cased
   `if (isLive) skipBonus` branch** — it falls out naturally from
   `computeScore()`'s existing rule (Bolt 4, `domain-overview.md §5.5` point
   3: penalty bonus requires `actualPenaltyWinner != null &&
   actualPenaltyWinner === predictedPenaltyWinner`) applied to a
   `ScoreableMatch` whose `winnerTeamId` is unknown-and-therefore-`null`
   during LIVE. **Mobile port implication: the live-projection adapter must
   construct its `ScoreableMatch`/`ScoringExample` input with
   `winnerTeamId: null` (or the mobile equivalent) whenever the source match
   is `LIVE`, and must NOT attempt to derive a `penaltyWinner` from a
   live/partial scoreboard.** This is exactly the kind of thing that's easy
   to get subtly wrong by, e.g., accidentally deriving a penalty winner from
   a tied `LIVE` scoreboard's `homeScore`/`awayScore` the way regular-time
   `derivePenaltyWinner` would for a *finished* shootout — **there is no
   shootout data at all while `LIVE`**, so any such derivation would be
   fabricating a result. The explicit tied-entries test case the bolt-plan
   asks for should cover: two users predicting a tied knockout match
   currently `LIVE` with the same live scoreline but different
   `penaltyWinnerTeamId` picks on their prediction — **both must receive
   identical projected points (no bonus to either)**, and the bonus must
   then correctly appear for the correct one once the match transitions to
   `FINISHED` and real scoring runs (RANKINGS-4).
6. **Users absent from the confirmed ranking but present in a LIVE
   prediction are synthesized into the projection** with
   `confirmedTotal = 0`, `previousPosition = null` (BR-62.4) — needed so a
   brand-new user's very first (in-progress) prediction is visible in the
   projected view, not silently missing.
7. **Re-sort and re-rank**: projected rows are sorted by `projectedPoints`
   desc, **nickname ascending** as the tie-break (`project-leaderboard.ts:153`
   — note this project-leaderboard-level sort *does* use a nickname
   tie-break even for the pool scope, unlike §3's confirmed-pool sort which
   has none — another instance of the same asymmetry flagged in §3),
   then dense-ranked again into a **separate** `projectedPosition` (the
   original confirmed `position` is preserved as `previousPosition`, never
   overwritten).
8. **`positionDelta = previousPosition - projectedPosition`** (positive =
   rose, negative = fell, `null` for a synthesized/new row) — purely a
   display affordance (▲/▼/=/new), not a ranking rule with further
   consequences.
9. **Never persisted** — recomputed on every read/render, no
   `PredictionScore` row is ever written for a `LIVE` match (BR-62.7). This
   means the live-projection code path and the RANKINGS-4
   finalize-scoring path are **structurally exclusive**: a match is either
   being projected (LIVE) or being finalized (transitioning to FINISHED),
   never both, and the projection adapter must never call whatever persists
   `PredictionScore`.

## 5. Dense ranking algorithm (shared by RANKINGS-1/2/3)

**[CONFIRMED — `betmeet-clone/src/features/scoring-rankings/services/ranking.ts`,
full file, 33 lines]**

Given rows already sorted descending by points:

```
position = 0
prevPoints = null
for each row in sorted order:
  if prevPoints is null OR row.points !== prevPoints:
    position += 1
  assign row.position = position
  prevPoints = row.points
  isTied = (count of rows sharing row.points) > 1
```

This is "1, 1, 2" — **not** "1, 1, 3". Confirmed as an explicit, previously-
litigated product decision in betmeet-clone itself (`ranking.ts`'s own doc
comment: *"this deviates from the US-5.2 AC example ('1, 1, 3')... explicit
user decision"*) — matches `domain-overview.md §5.6` exactly, no discrepancy
here. Mobile should port this as one small, pure, generic function (e.g.
`assignDensePositions<T extends { totalPoints: number }>`), reused
identically by global ranking, pool leaderboard, and both live-projection
paths — the same "one physical implementation" discipline as
ADR-015/ADR-017/ADR-025 in prior bolts. `isTied` is exposed per-row for
display (e.g. a shared-position visual marker), not used in any further
ranking logic.

## 6. Score persistence / finalize scoring (RANKINGS-4, best-guess mapping — see §0)

**[CONFIRMED against betmeet-clone's real code for the *rule content*;
BEST GUESS that this is what "RANKINGS-4" refers to — see §0]**

- **Scoreable gate**: a match is scoreable only when `status === 'FINISHED'`
  **and** both `homeScore`/`awayScore` are non-null
  (`score-match.ts:24-25`). If a previously-scoreable match becomes
  unscoreable again (reverted to `CANCELLED`/`POSTPONED`, or its result
  nulled by an admin revert — Bolt 13's concern), **any existing
  `PredictionScore` rows for that match are deleted** (`score-match.ts:27-30`,
  BR-6.7) — scoring is not "sticky."
- **Idempotent upsert, one row per prediction**: `scoreMatch(matchId)` can
  be re-run any number of times (e.g. after Bolt 13's admin override
  re-scores a match) and always fully overwrites that match's
  `PredictionScore` rows from scratch — never additive, never
  partial (BR-6.5/BR-6.6). `PredictionScore.predictionId` is unique — "at
  most one score row per prediction," ever.
- **Trigger points** (BR-6.8, betmeet-clone): (a) the competition sync
  marking a match `FINISHED`; (b) a backstop sweep
  (`scoreFinishedUnscoredMatches()`) that re-scans for any `FINISHED` match
  still missing a score on any of its predictions, safe to run repeatedly;
  (c) an admin override re-triggering `scoreMatch` for one match
  (Bolt 13's "rescoring trigger," confirming §0's RANKINGS-4 mapping).
  **This mobile backend currently has no competition-sync cron at all**
  (Bolt 5's `SupabaseAdapter` only *reads* live results via Realtime
  broadcast — it never marks a match `FINISHED` itself, and no scheduled
  job exists in `backend/src`), so **Design stage must decide the trigger
  mechanism for this repo specifically** — options include an on-demand
  sweep invoked by the rankings-read endpoint itself (lazy/pull-based,
  simplest given no cron infra exists yet), a dedicated backend script akin
  to `backend/src/scripts/seed-competition.ts`, or deferring real automatic
  triggering until Bolt 13/Admin exists and treating this bolt's sweep as
  manually invokable only. **Flagged as an open question for Design, not a
  Model-stage decision.**
- **Per-prediction points status** (`resolve-points.ts`, BR-6.9): resolved
  as `SCORED` (has a `PredictionScore` row) → `NOT_SCORED` (match
  `CANCELLED`/`POSTPONED`) → `PENDING_SCORING` (prediction exists, match not
  yet finished/scored) → `NOT_SCORED` (no prediction at all). This overlaps
  with, but does not replace, Bolt 6's existing
  `canShowScoreBreakdown`/`buildScoreBreakdown` (which only gates on
  `FINISHED`-with-both-scores, a narrower check aimed at the predictions
  screen's own breakdown display, not a full three-state status). Whether
  Bolt 10 introduces this three-state `PointsStatus` as a new, explicit
  concept surfaced somewhere in the UI (vs. leaving Bolt 6's screen exactly
  as-is) is a Design-stage call, not decided here.
- **Global rank-improved snapshot** (BR-6.18/6.19, `score-match.ts:32/70-76`):
  betmeet-clone takes a global-rank snapshot *before* scoring, then diffs
  after, to emit best-effort `GLOBAL_RANK_IMPROVED` events for Bolt
  11/Notifications. **Explicitly out of scope for this bolt's Model** —
  `domain-overview.md §5.8` describes the notification rule itself
  (fires only on a strict global-rank improvement, no notification on a
  user's first-ever appearance) but Bolt 11 (Notifications) is a separate,
  later bolt in this repo's plan and does not list Bolt 10 as a dependency
  in `bolt-plan.md`'s sequencing table — so the *emission* of these events
  is not this bolt's responsibility. If Design stage finds it cheaper to
  compute the before/after snapshot diff as a side effect of RANKINGS-4's
  own scoring pass now (to avoid re-deriving it later), that's a legitimate
  Design-stage optimization to flag, not something to build out fully here.

## 7. Data already available vs. new

| Data | Status |
|---|---|
| `computeScore()` / `ScoringRuleSet` (Bolt 4) | Exists, reused as-is (`src/shared/scoring/`). |
| `PoolMembership.joinedAt` (Bolt 7/8) | Exists (`src/domain/pools/pool.ts`). |
| Pool override vs. global prediction resolution (Bolt 8) | Exists (`src/domain/predictions/pool-override.ts`'s `hasGlobal`/`hasOverride` concepts are adjacent but not identical — this bolt needs a *per-match* override-or-global resolver across **all** a pool's members, not the single-user dual-save check Bolt 8 built). |
| `Match`/`MatchStatus`/live-update heuristics (Bolt 5) | Exists (`src/domain/competition/`). |
| `PredictionScore` persistence (backend) | **Does not exist yet** — `backend/prisma/schema.prisma`'s `prediction_scores` table is defined (pulled from the live DB) but zero backend code reads/writes it. This is this bolt's biggest net-new backend surface. |
| Global/pool ranking read capabilities (`rankings.*` or similar) | **Does not exist yet** — no `rankings-api.ts` capability group in `src/platform/backend-api/`, no matching backend handler. |
| Rankings screens (global + pool) | **Does not exist yet** — no `RankingsScreen`/pool-leaderboard-screen anywhere in `src/`. |

## 8. Human checkpoint — resolved decisions (2026-07-06)

The three items below were open questions in the original §8 (renumbered
1/2/3 there); all three are now **CONFIRMED, non-contingent decisions** —
not to be re-litigated at Design/ADR stage, only recorded/wired there.

1. **RANKINGS-4's identity — CONFIRMED.** "Finalize match scoring" (score
   persistence + backstop sweep + points-status resolution), exactly as
   inferred in §0/§6. Not a best-guess anymore.
2. **Tie-break asymmetry — CONFIRMED: UNIFY.** Nickname-ascending tie-break
   applies consistently across **all** ranking surfaces this bolt builds:
   global ranking (already had it, per §2), pool leaderboard confirmed/
   non-live (previously had none in betmeet-clone, per §3), **and** live
   projection for both scopes (already had it, per §4 point 7). This is a
   deliberate mobile-side improvement over betmeet-clone's own internal
   inconsistency (confirmed pool sort lacked a tie-break while its
   live-projection sort had one) — same spirit as Bolt 8's ADR-040
   ownership-transfer addition, not a faithful reproduction of the source
   app's asymmetry. Design stage records this as a Design-level decision and
   it gets its own ADR at the ADR stage (a genuine deviation-from-source-app
   decision, same class as ADR-040).
3. **Scoring trigger mechanism — CONFIRMED: lazy sweep on read.** The
   rankings-read backend endpoint(s) (global ranking + pool leaderboard, at
   minimum) trigger a backstop sweep for any `FINISHED`-but-unscored matches
   before returning ranking data — no new cron/script infrastructure is
   introduced. This also gets its own ADR at the ADR stage.

Item 4 below (MF placement) was **not** a checkpoint decision — it is an
explicit Design-stage task (see this section's original point 5): a real
re-examination (cross-feature dependency map, render-blocking needs) of
whether `scoring-rankings` stays a remote, the same rigor Bolt 7/9 gave
`pools`/the nav shell, rather than rubber-stamping Inception's "remote"
default. Resolved for real in `design.md §1`.

---

### Original open-questions list (for the record; 1-3 now resolved above)

1. ~~RANKINGS-4's identity is a best-guess~~ — **confirmed above.**
2. ~~Global-ranking tie-break correction~~ — proceeding with the real-code
   version (nickname-ascending) per this project's standing "real code
   wins" rule; domain-overview.md's "not nickname-based" phrase is stale and
   should be corrected in a later docs pass.
3. ~~Pool leaderboard's confirmed (non-live) sort has no tie-break at all~~
   — **confirmed above: unify (apply nickname tie-break uniformly).**
4. **No competition-sync/score-finalization trigger mechanism exists yet in
   this mobile backend** (§6) — resolved above (lazy sweep on read). This is
   a real architectural gap, not present in betmeet-clone (which has a real
   cron scheduler).
5. **MF placement**: Inception's `requirements.md §7.4`/`system-context.md`
   §4 both default `scoring-rankings` to a **remote** — consistent with
   `education`/`pools`'s pattern. Bolt 7 and Bolt 9 both re-examined similar
   inherited placement calls (ADR-032/ADR-036, ADR-037) rather than
   rubber-stamping them; Design stage does the same real check here
   (cross-feature dependency map, render-blocking needs) before writing the
   ADR, not assuming the remote default is still right unexamined. See
   `design.md §1`.

None of the above blocks Design from starting — they are decisions/
confirmations Design needs, not missing facts that block modeling further.
