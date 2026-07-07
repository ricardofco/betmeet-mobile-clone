# Bolt 13 — Model

## 0. Scope reconciliation (no `units/unit-*` story files exist for ADMIN-1..5)

Same recurring gap already hit and handled the same way in Bolts 5/6/7/10/12
(see those bolts' `model.md`s): `memory-bank/intents/liga-mundial-mobile-migration/units/`
**does not exist at all** in this repo (`ls` on the directory fails — not
just missing an `unit-10-admin/` subfolder, the whole `units/` tree is
absent). Per the standing precedent, scope was reconciled directly against:

1. `memory-bank/project/domain-overview.md §5.7` (Admin overrides) and `§6`/
   `§7` (request-gating state machine, cross-feature dependency map),
   `memory-bank/project/migration-analysis.md` (feature-translation table,
   line 51: admin flagged "high [portability], but likely out of initial
   mobile scope... low priority, not low risk-if-attempted"),
   `project-inventory.md` (feature/route/Server-Action/services inventories,
   all cited inline below).
2. `memory-bank/intents/liga-mundial-mobile-migration/requirements.md §7.4`
   and `system-context.md` (the Inception-level placement/scope decisions —
   **§7.4 confirms `admin` is explicitly in scope for this migration**,
   per the recorded 2026-06-29 user decision *"ahora estamos solo
   planeando... planeemos TODO"* overriding migration-analysis's own
   "recommend descoping" suggestion; `system-context.md`'s backend-capability
   table has a line item for Admin naming its four exact capability groups —
   see §0.1 below).
3. **`betmeet-clone`'s real, running source** (sibling repo,
   `/Users/ricardo/Documents/dynamicdevs/proyectos/kinela/betmeet-clone`) —
   read directly, not just docs: `src/features/admin/` in full (`actions/`
   — `force-result.ts`, `revert-override.ts`, `trigger-sync.ts`; `services/`
   — `require-admin.ts`, `resolve-winner.ts`, `revalidate-result-views.ts`;
   `queries.ts`, `schemas.ts`, `types.ts`; every file's own `__tests__/`
   read for behavior confirmation, not just the implementation), plus
   `aidlc-docs/construction/unit-7-admin-observability/functional-design/business-rules.md`
   (BR-7.1 through BR-7.16, the authoritative rule numbering used
   throughout this document), `scripts/seed-admin.ts` (the **only** code
   path that ever sets `verificationStatus = 'ADMIN'`), and
   `prisma/migrations/20260617120000_auth_access_token_hook/`,
   `20260619140000_auth_token_hook_account_deleted/` (confirms exactly
   which claims the Access Token Hook injects — see §7).
4. **This mobile repo's own backend** (`backend/`) — grepped/read directly,
   not assumed: `backend/prisma/schema.prisma` (`Match`'s
   `manual_override`/`manual_override_reason`/`overridden_by_user_id`/
   `overridden_at` fields, `VerificationStatus` enum, `provider_sync_runs`
   model all **already exist**, pulled from the live Supabase DB during
   backend-phase1 — same "schema already there, just unconsumed" situation
   Bolt 10 found for `prediction_scores`), `backend/src/services/scoring/
   score-match.ts`'s own doc comment (explicitly anticipates "a future
   admin rescoring trigger" — this bolt is that future), `backend/src/
   middleware/auth.ts` (confirms `req.auth` carries only `userId`/
   `emailVerified`/`onboardingCompleted`/`accountDeleted` from JWT claims —
   **no `verificationStatus`/admin claim exists anywhere in this backend's
   auth layer**), and a full-repo grep for `sync|orchestrat|football-data`
   under `backend/src` (confirms **zero** competition-sync orchestration
   code exists — see §5's headline finding).
5. `memory-bank/bolts/bolt-backend-phase1/adr-028-phased-backend-build-order.md`
   — the original phased backend plan explicitly separated **"Phase 2:
   admin overrides"** from **"Phase 3: football-data.org sync orchestration
   + scoring write + scheduler"**, and its own Consequences section states:
   *"Admin overrides (Phase 2) are required before Phase 3's scoring can be
   exercised end-to-end without a real provider feed."* Phase 2 = exactly
   this bolt. Phase 3's *scoring-write* half was built by Bolt 10 (lazy
   sweep, ADR-050); Phase 3's *sync-orchestration* half (the actual
   football-data.org fetch/scheduler) was **never built by any bolt** — see
   §5.
6. `memory-bank/bolts/bolt-10-scoring-rankings/model.md §6` and `design.md`
   — read per the task brief's explicit instruction. Confirms `scoreMatch(matchId)`/
   `sweepFinishedUnscoredMatches()` already exist and are safe to call
   any number of times (idempotent full-overwrite), and that Bolt 10's own
   model.md explicitly named "(c) an admin override re-triggering
   `scoreMatch` for one match (Bolt 13's 'rescoring trigger,' confirming
   §0's RANKINGS-4 mapping)" as a trigger point it deliberately left for
   this bolt to build, not reimplement.

### 0.1 Mapping ADMIN-1..5 to betmeet-clone's real feature set — CONFIRMED, not best-guessed

Unlike most prior bolts' scope-reconciliation section, this one does **not**
need to guess the story-number mapping — `system-context.md`'s own backend
capability table states it almost verbatim:

> *"Admin | sync dashboard reads, force-result, revert-override, manual sync
> trigger | Lowest-priority surface (requirements.md §7.4); same contract
> shape as the rest, gated server-side on `verificationStatus === "ADMIN"`
> exactly as today"*

That is four named capabilities; the fifth, implicit but load-bearing one is
the authorization gate itself (BR-7.1/BR-7.13's "double defense" —
middleware-level gating **and** a fresh per-action `requireAdmin()` check —
which is not a UI screen but is definitely a distinct piece of domain logic
every other capability depends on). Mapped 1:1:

| Story | Capability | betmeet-clone evidence |
|---|---|---|
| **ADMIN-1** | Authorization gate — `verificationStatus === 'ADMIN'`, defense-in-depth (middleware/proxy-equivalent gate **and** a fresh per-action re-check), never settable by app code | BR-7.1/BR-7.13, `services/require-admin.ts`, `scripts/seed-admin.ts` |
| **ADMIN-2** | Sync dashboard (read) — last successful run per scope + recent runs table | BR-7.10, `queries.ts:getSyncDashboard`, `components/sync-status-panel.tsx`/`recent-runs-table.tsx` |
| **ADMIN-3** | Manual sync trigger — "sync now" for a given scope | BR-7.11, `actions/trigger-sync.ts`, `components/trigger-sync-controls.tsx` |
| **ADMIN-4** | Force match result — override + synchronous re-scoring | BR-7.2/7.3/7.4/7.5/7.16, `actions/force-result.ts`, `components/force-result-dialog.tsx` |
| **ADMIN-5** | Revert match override — clears the manual result, re-scores (deletes scores if no longer scoreable) | BR-7.8/7.9, `actions/revert-override.ts`, `components/revert-override-button.tsx` |

**[CONFIRMED — the four named capabilities are `system-context.md`'s own
words, not inferred; the ADMIN-1..5 story-number *assignment* to those five
items is a reasonable, but not independently verified, ordering — same
"BEST GUESS on numbering only" caveat every prior bolt's Model has flagged.]**
`components/admin-match-list.tsx` (BR-7.14/7.15's FIFA-code labeling) is
presentational plumbing for ADMIN-4/5's match picker, not a sixth
capability.

## 1. Ubiquitous language

| Term | Meaning |
|---|---|
| **Admin** | A `Profile` whose `verificationStatus === 'ADMIN'`. Set **only** by an out-of-band operator script (`seed-admin.ts` in betmeet-clone; this repo needs its own equivalent, see §7) — never by any in-app action, never derivable from a JWT claim. |
| **Force result / override** | ADMIN-4: an admin manually sets a match's score (+ optional penalties/winner for a tied knockout), marking it `FINISHED` with `manualOverride = true` and an audit trail (`overriddenByUserId`/`overriddenAt`/`manualOverrideReason`). Synchronously re-scores every prediction on that match. |
| **Revert override** | ADMIN-5: clears the manually-entered result and audit fields, returns the match to `SCHEDULED`, and re-runs scoring (which, no longer being scoreable, deletes that match's `PredictionScore` rows instead of computing new ones). Does **not** restore any prior provider-supplied result — none is snapshotted. |
| **Sync dashboard** | ADMIN-2: a read-only view of `ProviderSyncRun` — last successful run per scope, and a table of recent runs (status/timestamps/item counts/error). |
| **Manual sync trigger** | ADMIN-3: an admin-initiated re-run of the competition-data sync for one scope, going through "the same orchestration path as the automated scheduler" (`domain-overview.md §5.7`'s own phrasing) — **see §5, this is the one capability with no underlying mechanism to trigger in this repo's backend today.** |
| **Override precedence** | The rule (BR-7.6/7.7, not a separate story but a cross-cutting behavior both ADMIN-4 and any future sync must respect) that a provider sync **always wins** over a manual override on its next run — the override is a transitory fallback, not a permanent pin. The `manualOverride` flag/audit trail is retained as historical record even after a sync overwrites the scores. |

## 2. ADMIN-1 — Authorization gate

**[CONFIRMED — `betmeet-clone/src/features/admin/services/require-admin.ts`
(full file, 19 lines), BR-7.1/BR-7.13,
`aidlc-docs/.../unit-7-admin-observability/functional-design/domain-entities.md`,
`scripts/seed-admin.ts` (full file, 126 lines), `project-inventory.md`
line 96 (route table), `domain-overview.md §5.7` first bullet.]**

- **Gate value**: `Profile.verificationStatus === 'ADMIN'` (a 3-value enum
  `UNVERIFIED | VERIFIED | ADMIN`, `require-admin.ts:9-19`). This is a
  **plain database column**, checked with a **fresh Prisma query on every
  single call** (`getAdminUserId()` re-queries `prisma.profile.findUnique`
  each time it's invoked — there is no caching, no session-embedded flag).
- **NOT a JWT claim.** This is the answer to the task brief's explicit
  question, confirmed by reading the real Access Token Hook migrations
  (`20260617120000_auth_access_token_hook/migration.sql`,
  `20260619140000_auth_token_hook_account_deleted/migration.sql`) — the hook
  injects exactly three custom claims: `email_verified`,
  `onboarding_completed`, `account_deleted`. `verificationStatus`/`ADMIN` is
  **never** one of them, in either app. This mobile repo's own
  `backend/src/middleware/auth.ts` independently confirms the same shape on
  this side: `req.auth` is populated from `jwtVerify()`'s payload with only
  `userId`/`emailVerified`/`onboardingCompleted`/`accountDeleted` — **no
  `verificationStatus` field exists in this backend's JWT-derived auth
  context at all.** Any admin check here needs its own fresh
  `prisma.profile.findUnique({ where: { id: auth.userId }, select: {
  verificationStatus: true } })`, exactly mirroring betmeet-clone's
  `getAdminUserId()` — **not** an extension of `src/domain/auth/
  auth-claims.ts`'s `AuthClaims` type (that type is specifically the tri-state
  JWT-claim shape from `domain-overview.md §6`; admin status is a different
  kind of fact — a DB-column re-check, not a JWT claim — and mixing the two
  would misrepresent where the authority actually lives).
- **Never set by application code.** The *only* code path that ever writes
  `verificationStatus = 'ADMIN'` in betmeet-clone is `scripts/seed-admin.ts`,
  run manually by an operator against the database (`domain-overview.md
  §2`: *"→ ADMIN is never set by application code — only via an out-of-band
  script run by an operator... the automatic UNVERIFIED→VERIFIED sync
  explicitly excludes rows already ADMIN"*). This mobile repo has no
  equivalent script yet — it needs one (Design/Implement-stage detail, a
  small `backend/src/scripts/seed-admin.ts` port, same shape as this repo's
  existing `seed-competition.ts`), but the **rule itself** (no in-app
  promotion path, ever) is a Model-stage invariant that must hold regardless
  of how the script is delivered.
- **Defense-in-depth, not a single check.** BR-7.1: *"Solo usuarios con
  verificationStatus === 'ADMIN' acceden a /admin/* y a las acciones admin.
  Doble defensa: gating en proxy.ts (redirección de no-admins) Y
  requireAdmin() server-side en cada acción/consulta."* Two independent
  layers: (a) a route/navigation-level gate that hides the admin surface
  from non-admins entirely (betmeet-clone: `proxy.ts` redirect;
  mobile-equivalent: a Design-stage decision, see §9 — this mobile app has
  no exact `proxy.ts` analog, only `evaluateGuard()`'s `ScreenClass` tags,
  which today have no "admin-only" concept, see below), and (b) an
  independent, mandatory server-side re-check inside **every** admin-gated
  backend handler (ADMIN-2 through ADMIN-5, not just the mutating ones) —
  BR-7.13: *"Las acciones admin son server-side; se valida requireAdmin()
  antes de cualquier mutación (prevención de escalada de privilegios)."*
  **This is the exact same "advisory client, authoritative server"
  discipline this repo's own ADR-023 (kickoff-lock) and ADR-038 (anti-bias
  masking) already established** — a client-side "hide the Admin tab/button
  from non-admins" affordance is a UX nicety, never the actual gate; every
  one of ADMIN-2..5's backend handlers must independently re-verify
  `verificationStatus === 'ADMIN'` on every call, not trust a prior
  UI-level check or a cached flag.
- **This repo's `ScreenClass`/`evaluateGuard()` model has no admin concept
  today** — confirmed by reading `src/domain/auth/auth-guard.ts` (the full
  six-rule gate, verbatim-ported from `domain-overview.md §6`) and
  `src/host/auth/navigation/screen-registry.ts` (`ScreenClass` tags are
  `public`/`auth-only`/`verify-email`/`mfa-challenge`/`onboarding`/
  `protected` — no `admin` tag exists, and `AuthClaims` has no
  `isAdmin`/`verificationStatus` field to gate on even if a tag existed).
  **This is a real, confirmed gap this bolt must close at Design stage**,
  not an oversight to silently work around — whether that means a new
  `ScreenClass` tag backed by a new claims-adjacent value, a screen that
  fetches "am I admin" from a new capability on mount and conditionally
  renders, or something else is a Design-stage decision (see §9), but the
  underlying fact (no admin-aware gating primitive exists yet in this
  mobile app) is confirmed here, not guessed.

## 3. ADMIN-2 — Sync dashboard (read)

**[CONFIRMED — `betmeet-clone/src/features/admin/queries.ts:42-73`
(`getSyncDashboard`), BR-7.10, `types.ts` (`SyncStatusView`/`SyncRunRow`/
`ScopeSuccess`), `project-inventory.md`'s `ProviderSyncRun` model row.]**

- Returns `null` for non-admins (the query itself re-checks
  `getAdminUserId()` — the same defense-in-depth as every other admin
  read/action, §2).
- **Two pieces of data**: (a) the most recent **successful** run per scope
  (`TEAMS|FIXTURES|LIVE_STATUS|RESULTS|FULL|CLEANUP`) — scopes with no
  success yet are simply omitted, not shown as zeroed rows
  (`queries.ts:70`'s `.filter((s) => s.finishedAt !== null)`); (b) the 25
  most recent runs overall, any status
  (`STARTED|SUCCESS|PARTIAL_SUCCESS|FAILED|RATE_LIMITED|SKIPPED_LOCKED`),
  each with `id`/`scope`/`status`/`startedAt`/`finishedAt`/`itemsFetched`/
  `itemsUpdated`/`errorMessage`.
- **Purely a read** — no mutation, no side effect. Backed by the
  `ProviderSyncRun` table (mobile's already-provisioned `provider_sync_runs`
  model, pulled from the live DB during backend-phase1 — see §6).
- **The load-bearing caveat for this mobile app specifically (see §5)**:
  this table is only ever populated by a real sync orchestrator actually
  running and writing audit rows to it. **Grepped and confirmed: nothing in
  this mobile backend's `backend/src` writes to `provider_sync_runs` at
  all** — no orchestrator exists yet (§5). This dashboard would today show
  "no data" for every scope, correctly, but not usefully, until either a
  real sync orchestrator exists (out of scope, see §5) or Design
  redefines what this dashboard displays for this app's actual data
  sources.

## 4. ADMIN-3 — Manual sync trigger — the headline architectural gap

**[CONFIRMED against betmeet-clone's real code for what the *rule content*
is; CONFIRMED (not best-guessed) that this repo's backend has no matching
mechanism to trigger — see the grep evidence below.]**

- **In betmeet-clone**: `actions/trigger-sync.ts` (BR-7.11) delegates to
  `runScheduledSync(scope, { source: 'manual' })` — *"the same orchestration
  path as the automated scheduler"* — for one of
  `FIXTURES|LIVE_STATUS|RESULTS|FULL`, then logs
  (`admin.sync_triggered`), revalidates the dashboard, and broadcasts a
  "results updated" signal. This function is the real football-data.org
  fetch pipeline (`domain-overview.md §5.9`): scope-filtered API calls,
  upserting `Match`/`Team` rows, followed by a scoring sweep
  (`domain-overview.md §5.9`: *"every sync run is followed by a sweep that
  re-scores any finished-but-unscored match"*).
- **This mobile backend has no equivalent function, anywhere, today.**
  Confirmed by a full grep of `backend/src` for
  `sync|orchestrat|football-data|footballData|providerSync` — the only hits
  are (a) `backend/src/scripts/seed-competition.ts`, a one-time, **manual**,
  additive seed script (not a live provider integration, not scope-aware,
  not re-runnable as "the same orchestration path as the automated
  scheduler" because there is no scheduler), and (b) the `provider_sync_runs`
  Prisma model itself (schema only, zero consumers). There is no
  `football-data.org` API client, no scope-filtered fetch/upsert pipeline,
  no in-process scheduler (`node-cron` or equivalent — ADR-029 explicitly
  named this as the intended mechanism for a *future* phase, never built).
- **This is not a surprise this bolt is discovering cold** —
  `memory-bank/bolts/bolt-backend-phase1/adr-028-phased-backend-build-order.md`
  explicitly separated *"Phase 2: admin overrides"* (→ this bolt) from
  *"Phase 3: football-data.org sync orchestration + official scoring write
  + a scheduler"* and Bolt 10's own `model.md §6` already flagged, in its
  own words: *"This mobile backend currently has no competition-sync cron
  at all... no scheduled job exists in backend/src."* Bolt 10 resolved
  **its own** half of Phase 3 (scoring persistence) via the lazy
  sweep-on-read (ADR-050) — but the *sync-orchestration* half of Phase 3
  (the actual football-data.org fetch/scheduler `trigger-sync` would call)
  was **never built by any bolt, and is not this bolt's own dependency
  line either** (`bolt-plan.md`'s Bolt 13 entry names only "Bolt 5 (match
  data), Bolt 10 (rescoring trigger target)" — it does not claim a sync
  orchestrator exists to trigger).
- **Consequence**: ADMIN-3, as betmeet-clone defines it, has **no
  underlying capability to call** in this repo. This is flagged prominently
  for the human checkpoint (§9) as the single highest-consequence open
  question in this Model — more severe than a naming ambiguity (like Bolt
  10's RANKINGS-4 numbering question), because there is no function to wire
  up, full stop, regardless of what Design decides to build around it.
  Candidate resolutions (not decided here): (a) build a minimal
  football-data.org sync orchestrator as part of this bolt (real scope
  growth beyond "Admin," arguably its own bolt); (b) redefine ADMIN-3's
  mobile scope narrowly as "manually invoke the rescoring backstop"
  (`sweepFinishedUnscoredMatches()`, which *does* exist and *is* idempotent
  and safe to call on demand) — a materially different, much narrower
  capability than a real competition-data sync, and one that should be
  named/labeled honestly as such if chosen, not disguised as "sync"; (c)
  explicitly descope ADMIN-3 from this bolt's Implement stage, ship
  ADMIN-1/2/4/5 only, and record the sync-orchestrator gap as a tracked,
  named follow-up (same class of honest deferral as Bolt 8's
  `PoolDirectedInvite` accept/revoke gap or Bolt 6's `getFixtureWithMyPredictions`
  non-endpoint). **Not resolved here — this is the one item this Model
  explicitly needs a human decision on before Design proceeds** (see §9).

## 5. ADMIN-4 — Force match result

**[CONFIRMED — `betmeet-clone/src/features/admin/actions/force-result.ts`
(full file, 83 lines), `schemas.ts` (`ForceResultSchema`), BR-7.2/7.3/7.4/
7.5/7.16, `components/force-result-dialog.tsx` (full file — UI shape
reference only, not modeled as domain logic).]**

- **Input** (`ForceResultSchema`): `homeScore`/`awayScore` (int, 0-50),
  optional `homePenaltyScore`/`awayPenaltyScore` (int, 0-50, nullable),
  optional `penaltyWinnerTeamId` (uuid, nullable), and a **mandatory**
  `reason` (1-500 chars, trimmed) — every override must be justified in
  writing, always (BR-7.2's audit-trail requirement).
- **Preconditions** (BR-7.4): the match must have both `homeTeamId` and
  `awayTeamId` already resolved — cannot force a result onto a placeholder
  match (e.g. an unresolved knockout slot like "Winner Group A").
- **Penalty-winner validation is two-layered, both server-side**:
  1. BR-7.3: if the match is a `KNOCKOUT`-phase match **and** the entered
     score is tied, `penaltyWinnerTeamId` is **mandatory** (else reject).
     Not required for a non-tied result or a non-knockout phase.
  2. BR-7.16 (`force-result.ts:43-50`): if penalty *scores* are also
     supplied, the server **independently derives** the winner from those
     scores via `derivePenaltyWinner()` (the exact same shared function
     Bolt 4 already owns, `src/shared/scoring/`) and **rejects** the
     request if the submitted `penaltyWinnerTeamId` contradicts what the
     scores imply. The admin cannot supply a winner that disagrees with the
     shootout score they themselves entered — this closes the same class of
     "derived, not chosen" invariant `domain-overview.md §5.5` point 4
     states generally (*"the penalty winner is always derived from the
     shootout score, never separately chosen as raw input — both for
     predictions and for admin-entered results"*), now confirmed at the
     admin-override code path specifically, not just the prediction path
     Bolt 6 already ported.
- **Winner resolution** (`resolveWinner()`, `services/resolve-winner.ts`,
  19 lines, trivial pure function): score comparison first; a **tied
  knockout** falls back to the (already-validated) `penaltyWinnerTeamId`;
  a **tied non-knockout** (group/league stage) has no winner (`null`) —
  correctly, since group-stage draws are a real, valid outcome with no
  shootout.
- **Effect, atomically as one logical operation** (BR-7.2/7.5): the `Match`
  row is updated with `homeScore`/`awayScore`, the penalty scores (only if
  knockout, else forced `null` even if supplied — `force-result.ts:66-67`),
  the resolved `winnerTeamId`, `status = 'FINISHED'`, `manualOverride =
  true`, and the three audit fields (`manualOverrideReason`,
  `overriddenByUserId`, `overriddenAt`). **Then, synchronously, in the same
  operation, `scoreMatch(matchId)` is invoked** — every prediction on that
  match gets a freshly-computed `PredictionScore` row, immediately, not
  queued (BR-7.5's explicit "not queued, not eventual" framing,
  `domain-overview.md §5.7` third bullet corroborates verbatim). This
  mobile repo's own `backend/src/services/scoring/score-match.ts` is
  already exactly the right shape to call here unchanged — its own doc
  comment already names this exact future consumer (§0 point 6).
- **Override precedence (BR-7.6/7.7, cross-cutting, not this story's own
  rule but essential context for it)**: an override is explicitly a
  **transitory fallback**, not a permanent pin — betmeet-clone's next
  provider sync (`upsertMatch`) unconditionally overwrites the score/status
  fields regardless of `manualOverride`, and the **post-sync sweep**
  (`scoreFinishedUnscoredMatches`, the same mechanism Bolt 10 ported as
  `sweepFinishedUnscoredMatches()`) re-scores using the real data — the
  `manualOverride` flag/audit trail persists as a **historical record only**
  once overwritten, it does not block the next sync. **This mobile-repo
  consequence, flagged explicitly**: since no sync orchestrator exists here
  (§4), a force-result's `manualOverride = true` state has **no mechanism
  that will ever supersede it** in this app today — whatever an admin
  enters via ADMIN-4 is not just "the fallback until the real data arrives,"
  it is functionally **the only path by which this mobile backend's matches
  ever become `FINISHED`-with-scores at all**, absent Bolt 10's seed script
  or a future real sync bolt. This reframes ADMIN-4's product role in this
  specific app (primary result-entry mechanism, not merely an occasional
  override) differently from betmeet-clone's own framing (an occasional
  correction on top of a normally-reliable automated feed) — a genuine,
  confirmed asymmetry worth a Design-stage decision on whether the mobile
  UI's copy/framing should say so plainly, not silently inherit
  betmeet-clone's "rare correction" tone. Not resolved here (see §9).

## 6. ADMIN-5 — Revert match override

**[CONFIRMED — `betmeet-clone/src/features/admin/actions/revert-override.ts`
(full file, 47 lines), BR-7.8/7.9,
`components/revert-override-button.tsx`.]**

- **Effect**: clears `homeScore`/`awayScore`/`homePenaltyScore`/
  `awayPenaltyScore`/`winnerTeamId` to `null`, resets `status` to
  `SCHEDULED`, and clears all three audit fields (`manualOverride = false`,
  `manualOverrideReason = null`, `overriddenByUserId = null`,
  `overriddenAt = null`).
- **Then, synchronously, `scoreMatch(matchId)` is invoked again** (BR-7.9)
  — but since the match is no longer scoreable (`status` is back to
  `SCHEDULED`, scores are `null`), this mobile repo's own `scoreMatch()`
  takes its **delete-scores** branch (`score-match.ts:45-48`, verified by
  reading the actual function: `if (!isMatchScoreable(match)) { ...
  deleteMany ...; return; }`) — every `PredictionScore` row for that match
  is **deleted**, not zeroed or archived. This is a genuinely
  **destructive, hard-to-reverse mutation**: any user who had a score for
  that match (from the forced result) loses it outright, with no undo
  short of the admin re-entering a (possibly different) forced result via
  ADMIN-4 again.
- **No snapshot of the prior result is kept** — the doc comment in
  betmeet-clone's own `revert-override.ts` is explicit: *"The original API
  result is NOT snapshotted, so this clears rather than restores. The next
  API sync repopulates the real result."* **In this mobile app, "the next
  API sync" never happens (§4/§5)** — so a revert here, unlike in
  betmeet-clone, has **no guaranteed path back to a populated result at
  all** unless an admin manually forces a result again. This is the single
  highest-stakes mutation in this entire bolt from a "could this
  destructively strand real user data" perspective, and should get extra
  scrutiny at Design/Implement (e.g., a confirmation step, or Design
  choosing to surface this asymmetry explicitly in the revert UI's copy) —
  flagged here, not resolved.

## 7. Cross-cutting: data-mutation risk register

Unlike Bolt 12 (Education, confirmed genuinely non-mutating), this bolt is
**the most mutation-heavy, highest-blast-radius bolt in the entire plan** —
every one of its four non-authorization capabilities touches shared,
cross-user state, not just the acting admin's own data (contrast: Bolt 8's
account deletion is destructive but scoped to one user + pools they own;
here, a single admin action recomputes **every user's** score for a match).

| Capability | Mutation | Reversible? | Blast radius |
|---|---|---|---|
| ADMIN-4 Force result | `Match` row + full rescore of every prediction on it | Partially — via ADMIN-5 revert, but see below | Every user who predicted that match |
| ADMIN-5 Revert override | `Match` row reset + **deletion** of every `PredictionScore` row for that match | **No** — no prior-result snapshot exists in either app; in this mobile app specifically, no sync exists to ever repopulate a real result afterward (§4/§6) | Every user who had a score for that match |
| ADMIN-3 Manual sync trigger | (In betmeet-clone) writes/updates many `Match`/`Team` rows across a whole scope, then a rescoring sweep | Would be if a real orchestrator ever exists here — moot, since no such orchestrator exists in this backend today (§4) | Potentially every match/user in the competition |
| ADMIN-2 Sync dashboard | None (read-only) | N/A | None |
| ADMIN-1 Authorization gate | None (a check, not a mutation) — but a **failure** of this gate (bypassed/misconfigured) would expose every other capability's blast radius above to any authenticated user | N/A | Catastrophic if broken, hence BR-7.1/7.13's explicit "double defense" requirement |

**Design/Implement-stage instruction, recorded here so it isn't rediscovered
later** (same posture as ADR-038's "masking is server-only, verify at the
raw API-response level, permanently" instruction from Bolt 8): every
ADMIN-2..5 backend handler must independently re-verify
`verificationStatus === 'ADMIN'` via a fresh DB read on every call — no
caching the result across requests, no trusting a client-supplied flag, no
relying solely on a UI-level gate. ADMIN-4/5's mutations should be reviewed
for whether an additional confirmation step (e.g. betmeet-clone's own
mandatory `reason` field on force-result, which this repo should port
unchanged) is sufficient, or whether mobile's own UX (more prone to
accidental double-taps than a desktop dialog) warrants an extra explicit
confirm step before ADMIN-5's destructive revert specifically — a
Design-stage UX call, flagged here as worth deliberate attention, not
assumed either way.

## 8. Data already available vs. new

| Data / capability | Status |
|---|---|
| `Match.manual_override`/`manual_override_reason`/`overridden_by_user_id`/`overridden_at` | **Exists** in `backend/prisma/schema.prisma` (pulled from the live DB, unconsumed until now — same "schema already there" situation Bolt 10 found for `prediction_scores`). No migration needed. |
| `VerificationStatus` enum (`UNVERIFIED\|VERIFIED\|ADMIN`) | **Exists** on `Profile.verificationStatus` in the backend schema. No migration needed. |
| `provider_sync_runs` table | **Exists** in the backend schema (pulled from the live DB). No migration needed — but nothing writes to it (§4/§5). |
| `scoreMatch(matchId)` / `sweepFinishedUnscoredMatches()` (Bolt 10) | **Exists**, exactly the right shape, doc comment already anticipates this bolt as a future caller (§0 point 6). Reused as-is for ADMIN-4/5. |
| `derivePenaltyWinner()` (Bolt 4) | **Exists** (`src/shared/scoring/`), reused as-is for ADMIN-4's server-side penalty-winner cross-check (BR-7.16). |
| `MatchStatus` type (`src/domain/competition/match-status.ts`) | **Exists**, already the full 6-value enum (`SCHEDULED\|LOCKED\|LIVE\|FINISHED\|POSTPONED\|CANCELLED`) — no change needed for ADMIN-4/5's status transitions. |
| A `requireAdmin`/`getAdminUserId`-equivalent backend helper | **Does not exist yet** — this bolt's own net-new surface, a small, low-risk port of betmeet-clone's `require-admin.ts` pattern (fresh `prisma.profile.findUnique` per call). |
| A `seed-admin`-equivalent script for this mobile backend | **Does not exist yet** — needed to promote any user to `ADMIN` in this project's own Supabase DB at all (no existing mechanism, since this DB started as a pull of betmeet-clone's schema, not its *data* — no admin user is guaranteed to already exist in this project's live rows). Design/Implement-stage detail, not a domain rule. |
| Any mobile-side exposure of "am I an admin" to gate UI | **Does not exist yet** — `profile.getProfile`'s current response (`nickname`/`avatar`/`locale`/`cooldown`) does not include `verificationStatus` at all (confirmed by reading the handler). A new field or capability is needed for the mobile app to even know to show an Admin entry point — Design-stage decision (advisory-only, per §2/§7's discipline). |
| A football-data.org sync orchestrator / scheduler | **Does not exist** anywhere in this backend (§4/§5) — the one piece of ADMIN-2/3's real scope this bolt cannot simply "port," since there is nothing to wire a trigger to. |
| Admin screens (dashboard, override form, match list) | **Do not exist yet** — this bolt's entire net-new mobile UI surface. |
| `admin.*` capability group in `src/platform/backend-api/` | **Does not exist yet** — same `request()`/`{ok:true,...}|{ok:false,error:...}` pattern as every other `*-api.ts` seam (Design-stage detail). |

## 9. Open questions for Design (not resolved here)

1. **ADMIN-3's missing sync-orchestration mechanism (§4)** — the single
   highest-priority open question, flagged for a **human decision before
   Design proceeds**, not a Design-stage judgment call like the others
   below: (a) build a minimal orchestrator as part of this bolt (real scope
   growth), (b) redefine ADMIN-3 narrowly as a manual
   `sweepFinishedUnscoredMatches()` trigger (a real, already-existing,
   much narrower capability — would need honest relabeling, not disguised
   as "sync"), or (c) explicitly descope ADMIN-3 from this bolt's
   Implement stage and record it as a tracked, named gap. This also
   directly affects ADMIN-2 (the sync dashboard would have literally
   nothing to display under options (b)/(c), since nothing writes to
   `provider_sync_runs` either way unless (a) is chosen) — Design cannot
   meaningfully proceed on ADMIN-2/3 without this decision.
2. **Admin-aware navigation gating (§2)** — this repo's `ScreenClass`/
   `evaluateGuard()` model has no "admin-only" concept today. Needs a
   Design-stage decision: extend `ScreenClass` with a new tag + a new
   claims-adjacent signal (and if so, how that signal reaches the guard,
   given verification status is a DB re-check, not a JWT claim — see §2),
   or gate purely inside the Admin screen(s) themselves (fetch "am I admin"
   on mount, render an access-denied state otherwise) without touching
   `auth-guard.ts` at all. Either way, the **authoritative** gate stays
   server-side per §2/§7 — this question is only about the mobile-side
   UX/plumbing for hiding the entry point from non-admins, an advisory
   layer.
3. **`admin` remote MF placement re-examination** — `requirements.md
   §7.4`/`system-context.md` both default `admin` to **Remote** ("desktop-
   dashboard-shaped, infrequent, admin-only audience"). Bolts 7/9/10/12 each
   did a real re-examination of an inherited placement default rather than
   rubber-stamping it (ADR-032/036/037/042/048/052) — Design stage should do
   the same brief check here (cross-feature dependency map, render-blocking
   needs). Nothing in this Model surfaced a reason to overturn "Remote" —
   admin is reached by essentially no other screen (no
   `X ──→ admin` edges exist in `domain-overview.md §7`'s dependency map;
   only `admin ──→ competition`/`admin ──→ scoring-rankings`/`admin ──→
   scoring` edges exist, all in the outbound direction) — but the check
   should still be done deliberately, not assumed.
4. **How the mobile app learns "am I an admin"** (§8) — a new field on
   `profile.getProfile`'s response, or a dedicated new capability
   (`admin.checkAccess` or similar) — a Design-stage API-shape decision, not
   a domain rule (the underlying fact, `verificationStatus === 'ADMIN'`,
   is settled; only its transport shape is open).
5. **A `seed-admin`-equivalent script for this backend** (§8) — needed
   before any real device/manual testing of this bolt is even possible
   (there is no guaranteed existing `ADMIN` row in this project's live
   Supabase data). A small Implement-stage deliverable, flagged here so it
   isn't discovered as a blocker mid-Test-stage the way `backend/.env`'s
   absence blocked Bolt 8 mid-session.
6. **ADMIN-4's reframed product role (§5)** — whether the mobile UI should
   explicitly communicate that, in this app (unlike betmeet-clone), a
   forced result is not merely an occasional correction but currently the
   *only* way a match becomes finished-with-scores at all. A copy/UX
   decision, not a domain rule — flagged so Design doesn't silently inherit
   betmeet-clone's "rare override" framing without considering whether it
   still fits.
7. **ADMIN-5's irreversibility (§6/§7)** — whether an extra confirmation
   step beyond the existing mandatory `reason` field (ported from ADMIN-4)
   is warranted specifically for the destructive revert action, given this
   mobile app has no fallback sync to repopulate real data afterward. A
   Design-stage UX call.

None of the above except item 1 blocks Design from starting on the other
four stories — items 2-7 are decisions Design needs to make, not missing
facts that block modeling further. **Item 1 is different in kind**: without
a decision on it, Design cannot productively design ADMIN-2/3's screens at
all (there would be nothing real to design against), so it is called out
explicitly as needing a human answer at this checkpoint, not deferred
silently into Design the way the others are.

## Checkpoint

Pausing here for human approval before Design (component/data-flow design,
the real host-vs-remote navigation wiring for the Admin surface, the
authorization-gate plumbing decision, and — most importantly — a decision
on open question #1, ADMIN-3's missing sync-orchestration mechanism, before
Design can proceed on ADMIN-2/3 specifically). ADMIN-1/4/5 have no blocking
open questions and could proceed to Design regardless of #1's answer.
