# Bolt 13 — Admin — Implement & Test

Consolidates the Implement (stage 4) and Test (stage 5, Layer 1) stages for
Bolt 13 (Admin), per `model.md`/`design.md`/ADR-057 through ADR-062 (all
checkpoint-approved). Layer 2 (device) is deferred to the user's own manual
pass per standing preference — see §6.

## 1. Implement stage — files created/modified (code-complete 2026-07-07)

**Backend** (`backend/src/`):
- `services/scoring/sweep-status.ts` (new) — ADMIN-2/3's in-memory,
  non-DB-persisted last-run tracker (`recordSweepRun`/`getSweepStatus`,
  ADR-058).
- `services/scoring/score-sweeper.ts` (additive) — one line,
  `recordSweepRun(staleMatches.length)`, right before the existing return;
  `sweepFinishedUnscoredMatches()`'s own behavior is otherwise unchanged.
- `services/admin/require-admin.ts` (new) — `requireAdmin(userId)`, ADR-059's
  authoritative gate: a fresh `prisma.profile.findUnique` on every call,
  never cached.
- `services/admin/force-result-validation.ts` (new) —
  `validateForceResultScoreBounds` (0-50, independent of predictions' 0-20)
  + `validatePenaltyScoreShape`.
- `routes/handlers.ts` — six new `admin.*` handlers: `checkAdminAccess`,
  `getScoringSweepStatus`, `triggerScoringSweep`, `listMatchesForAdmin`,
  `forceMatchResult`, `revertMatchOverride`. Every one except `checkAccess`
  independently re-checks `requireAdmin(auth.userId)` on every call.
- `scripts/seed-admin.ts` (new) — standalone, manually-run script mirroring
  `seed-competition.ts`'s shape; the ONLY code path that ever sets
  `verificationStatus='ADMIN'`; `backend/package.json` gained `seed:admin`.

**Mobile — domain** (`src/domain/admin/`, framework-free):
- `admin-match-row.ts` — `AdminMatchRow` type (deliberately separate from
  `competition.getFixture`'s shape, ADR-060).
- `force-result-validation.ts` — `validateForceResultScoreBounds` (0-50)/
  `validateForceResultReason` (1-500 chars, trimmed), a client-side UX
  pre-check only.
- `admin-match-filters.ts` — `matchesEligibleForForceResult`/
  `matchesWithActiveOverride`, two pure filters over one `admin.listMatches`
  fetch.
- `index.ts` — barrel export.

**Mobile — platform**: `src/platform/backend-api/admin-api.ts` — typed
`adminApi.*` wrappers, mirrors `rankings-api.ts`/`pools-api.ts`'s pattern.

**The `admin` remote** (`src/remotes/admin/`, this repo's third real MF
remote and first genuinely freestanding one, ADR-057):
- `AdminRemoteEntry.tsx` — `./App`'s own internal `NativeStackNavigator`
  (`AdminHome`/`SweepStatus`/`ForceResult`/`RevertOverride`).
- `screens/admin-home-screen.tsx` — the remote's own independent
  `admin.checkAccess` re-check (loading/access-denied/dashboard branches).
- `screens/sweep-status-screen.tsx` — ADMIN-2/3 merged screen.
- `screens/force-result-screen.tsx` / `screens/revert-override-screen.tsx` —
  match picker (via the domain filters) → form.
- `components/admin-match-list.tsx` — FlashList-based shared picker.
- `components/force-result-form.tsx` — score/penalty-score inputs, a
  DERIVED (never entered) penalty-winner preview, mandatory `reason`.
- `components/revert-confirm-form.tsx` — ADMIN-5's type-the-FIFA-codes gate.
- `hooks/use-admin-access-query.ts`, `use-sweep-status-query.ts`,
  `use-trigger-sweep-mutation.ts`, `use-admin-match-list-query.ts`,
  `use-force-result-mutation.ts`, `use-revert-override-mutation.ts`.
- `navigation/admin-stack-params.ts`, `index.js`.
- `rspack.config.admin-remote.mjs` (new, port 8084, `start:admin` script) —
  zero new MF-singleton categories (`tamagui`/`i18next`/`react-i18next`/
  `@tanstack/react-query`/`@shopify/flash-list`, all already proven on
  `pools`/`education`).

**Host wiring**:
- `src/host/navigation/screens/admin-screen.tsx` (new) — structural copy of
  `education-screen.tsx` (`lazy(() => import('admin/App'))` + `RemoteBoundary`).
- `src/host/auth/navigation/auth-stack-params.ts`/`screen-registry.ts` —
  `SettingsStackParamList`/`SCREEN_REGISTRY` gain `Admin: ['protected']`.
- `src/host/navigation/root-drawer-navigator.tsx` — `SettingsStackNavigator`
  registers `Admin`.
- `src/host/settings/hooks/use-admin-access-query.ts` (new) — the host's OWN
  independent Settings-row visibility check (deliberately duplicated, not
  shared, from the remote's own re-check — two separate query keys/instances
  per ADR-059/design.md §12).
- `src/host/settings/screens/account-settings-screen.tsx` — gains an Admin
  row, gated by the hook above, rendered only when `isAdmin === true` (never
  a flash of a wrong state while pending).
- `src/host/federated-modules.d.ts` — `admin/App` module declaration
  (boilerplate needed for `tsc`, same pattern as `education`/`pools`).
- `rspack.config.mjs` (host) — `admin` registered in the `remotes` table.
- `en.ts`/`es.ts` — `settings.rows.admin` + the full `admin.*` namespace
  (deliberately blunt sweep-screen copy per ADR-058; ADMIN-4's reframed
  "only path to a finished match" copy per ADR-062).

**MF-placement claim verified for real at Implement** (recorded in
`activeContext.md`, not re-run for Test): `yarn start:admin` (port 8084) +
host `yarn start` (port 8081) both compiled with zero errors; both bundles
fetched over HTTP; the remote's `mf-manifest.json` inspected directly,
confirming all five shared deps resolve as `singleton: true`, not bundled
locally; no `react-native-svg`-incident error signature in either dev-server
log. No deviations from `design.md` were needed.

## 2. Test stage — final counts

**Mobile: 701 tests across 108 suites** (up from 661/102 at Implement
close, +40 tests across 6 new suites), `yarn tsc --noEmit` and `yarn lint`
both clean (0 errors, 0 warnings).

**Backend: 60 tests across 7 suites** (up from 22/3 at Bolt 10/12, +38 tests
across 4 new suites), `cd backend && npx tsc --noEmit` clean.

New/extended suites this bolt:

- `src/domain/admin/__tests__/force-result-validation.test.ts` — 0-50
  boundary cases (0/50 accepted, -1/51 rejected, non-integer rejected), the
  design.md-named independence regression (a score of 25 passes
  `validateForceResultScoreBounds` but fails
  `validatePredictionEntry`'s own 0-20 bound), `validateForceResultReason`'s
  1-500-char/trim behavior.
- `src/domain/admin/__tests__/admin-match-filters.test.ts` —
  `matchesEligibleForForceResult`/`matchesWithActiveOverride` on
  included/excluded/mixed-list cases.
- `backend/src/services/admin/__tests__/require-admin.test.ts` (new
  handler-collaborator suite, `prisma` mocked) — true for `ADMIN`, false for
  every other `verificationStatus`, false when no profile row exists at all.
- `backend/src/services/admin/__tests__/force-result-validation.test.ts` —
  the backend twin's 0-50 bounds + the same independence regression against
  `validateScoreBounds` (predictions' 0-20), `validatePenaltyScoreShape`.
- `backend/src/services/scoring/__tests__/sweep-status.test.ts` — starts at
  "never run" (both null), updates after `recordSweepRun`, defaults `at` to
  now when omitted, reflects the MOST RECENT call regardless of which caller
  triggered it, a count of `0` is distinguishable from "never run". Uses
  `jest.isolateModules` per test for a fresh copy of the tracker's closure
  state (this module has no reset function by design).
- `backend/src/routes/__tests__/handlers-admin.test.ts` (new — **this
  backend's first handler-level Jest suite**; every prior bolt's
  `handlers.ts` coverage came exclusively from real curl+DB checks,
  `jest.config.js`'s own header comment records that convention through
  Bolt 10 — this bolt earns a deliberate, narrow exception given ADMIN-4/5's
  blast radius, `prisma`/`requireAdmin`/`scoreMatch`/`score-sweeper` mocked,
  `sweep-status.ts` real):
  - `admin.checkAccess` — `{isAdmin:true}`/`{isAdmin:false}`, never an
    `{ok:false}` shape.
  - **FORBIDDEN for every one of the other five handlers**, written
    explicitly per-handler (not a parameterized loop), each also asserting
    zero `prisma` calls happened — proving the check short-circuits before
    any data access.
  - `getScoringSweepStatus`/`triggerScoringSweep` admin-caller happy paths
    (real `sweep-status.ts` wiring).
  - `forceMatchResult`: `NOT_FOUND`, `TEAMS_NOT_RESOLVED` (BR-7.4), the
    BR-7.16 penalty-winner-mismatch regression (derived winner vs. a
    contradicting submitted `penaltyWinnerTeamId`), a tied KNOCKOUT match
    falling back to the validated `penaltyWinnerTeamId`, a tied
    NON-KNOCKOUT match resolving to a real draw (`winnerTeamId: null`), a
    decisive score resolving from the comparison alone.
  - `revertMatchOverride`: `NOT_FOUND`, `NOT_OVERRIDDEN`, the full
    reset-then-rescore field set + confirms `scoreMatch(matchId)` is
    invoked afterward (the actual delete-vs-recompute logic lives inside
    `scoreMatch`/`isMatchScoreable`, Bolt 10, unchanged — proven via the
    real curl+DB pass in §3, not re-derived here).
- `src/remotes/admin/test-utils/render-with-query-client.tsx` (new) —
  mirrors `pools`'/`host/profile`'s own copy exactly (duplicated, not
  shared, same discipline every prior bundle's test-utils follows).
- `src/remotes/admin/screens/__tests__/admin-home-screen.test.tsx` —
  loading/access-denied/dashboard branches, all three nav-button presses.
- `src/remotes/admin/screens/__tests__/sweep-status-screen.test.tsx` —
  loading/error/never-run/has-run states, the trigger button's
  mutate-then-refetch behavior.
- `src/remotes/admin/components/__tests__/force-result-form.test.tsx` —
  submit disabled until a reason is entered; the non-knockout happy path;
  **the same "explicit tied-entries test" discipline as Bolts 10/12**: a
  tied knockout match's default 0-0 penalty inputs are an invalid tied
  shootout (submit stays disabled even with a reason filled in) until a
  real, resolved shootout score is entered; `isSubmitting` disables
  regardless of validity.
- `src/remotes/admin/components/__tests__/revert-confirm-form.test.tsx` —
  renders the current forced result/who-overrode-it/warning; **the Confirm
  button stays disabled until the EXACT FIFA codes are typed** (partial,
  wrong-order, and not-yet-complete input all keep it disabled); accepts the
  codes case-insensitively; confirms `onConfirm()` is called with NO
  arguments at all (the typed confirmation text never reaches the mutation,
  ADR-061's invariant); `isSubmitting` disables regardless.
- `src/host/settings/screens/__tests__/account-settings-screen.test.tsx`
  (extended) — the Admin row is absent for a non-admin account (the
  default/common case), absent while the access check is still pending (no
  flash of a wrong state), and present + navigates to `Admin` for an admin
  account.

## 3. Real backend/DB verification — DONE FOR REAL against the live Supabase DB

Per ADR-030 and this repo's Bolt 7/8/10 precedent, given ADMIN-4/5 are the
highest-blast-radius mutations in the whole plan (model.md §7): booted
`cd backend && npm run dev` (confirmed via `GET /health` → `{"ok":true}`),
then ran a throwaway TypeScript verification script
(`backend/src/scripts/bolt13-verify.ts`, deleted before finishing, same
"exercise for real, then remove" discipline as Bolt 7/8/10's own scripts).

**Setup**: minted 2 real Supabase auth users via the Admin API
(`bolt13-admin-<ts>@example.com`, `bolt13-nonadmin-<ts>@example.com`),
signed each in for a real bearer JWT. Promoted the first to `ADMIN` using
the exact same `prisma.profile.upsert` call `seed-admin.ts` itself uses (not
a separately-invented path); the second was given a `VERIFIED` (non-admin)
profile. Reused the live project's real active `Competition`, its real
`GROUP`/`KNOCKOUT` phases, and 4 real `Team` rows — only **additive** test
`Match` rows were created (unique `matchNumber`s 91001-91003), nothing about
the live fixture data was mutated.

### 3.1 `admin.checkAccess` — real proof, both directions

```
as ADMIN:     { "isAdmin": true }
as non-admin: { "isAdmin": false }
```

### 3.2 FORBIDDEN — the headline proof, a GENUINE non-admin caller, all five handlers

```
admin.getScoringSweepStatus  → { "ok": false, "error": "FORBIDDEN" }
admin.triggerScoringSweep    → { "ok": false, "error": "FORBIDDEN" }
admin.listMatches            → { "ok": false, "error": "FORBIDDEN" }
admin.forceMatchResult       → { "ok": false, "error": "FORBIDDEN" }
admin.revertMatchOverride    → { "ok": false, "error": "FORBIDDEN" }
```

Every one of these was called by the real, second, genuinely non-admin
Supabase user's own real bearer JWT — not a mocked `requireAdmin`. This is
the proof the task brief named as the single most important verification in
this bolt.

### 3.3 ADMIN-2/3 rescoring sweep — real tracker, real sweep

```
before: { "ok": true, "lastRunAt": null, "lastSweptCount": null }
trigger: { "ok": true, "sweptCount": 0, "ranAt": "2026-07-07T05:39:54.999Z" }
after:  { "ok": true, "lastRunAt": "2026-07-07T05:39:54.999Z", "lastSweptCount": 0 }
```

(`sweptCount: 0` because the live DB had no stale `FINISHED`-but-unscored
match at verification time — itself the expected, safe common case per
ADR-058's own framing.)

### 3.4 `forceMatchResult` — every named business rule, real DB state before/after

- **BR-7.4 (`TEAMS_NOT_RESOLVED`)**: an unresolved knockout placeholder
  (`awayTeamId: null`) → `{ "ok": false, "error": "TEAMS_NOT_RESOLVED" }`.
- **Decisive, non-knockout, with a real prediction riding on it**: forced
  2-0 → `{ "ok": true }`. DB `Match` row confirmed `status: FINISHED`,
  `manual_override: true`, `overridden_by_user_id` = the admin's real
  `userId`. The pre-existing `Prediction` (2-0, exact) got a real
  `prediction_scores` row — `matched_case: EXACT`, `total_points: 5` —
  proving `scoreMatch(matchId)` really runs synchronously inside the
  handler, not queued.
- **BR-7.16 (penalty-winner mismatch)**: tied 1-1 knockout, penalty scores
  5-3 (derives the home team as the true shootout winner), submitted
  `penaltyWinnerTeamId` = the AWAY team (a genuine contradiction) →
  `{ "ok": false, "error": "PENALTY_WINNER_MISMATCH" }`. DB confirmed
  **zero write happened** — `status` still `SCHEDULED`, `homeScore` still
  `null`, `manual_override` still `false`.
- **Tied knockout, valid penalty winner**: same match, same 5-3 shootout,
  this time submitting the correctly-derived (home) team as the winner →
  `{ "ok": true }`. DB confirmed `winnerTeamId` **exactly equals** the
  submitted/derived team's id (`matches: true` in the captured evidence),
  `status: FINISHED`.

### 3.5 `revertMatchOverride` — `NOT_OVERRIDDEN` + the delete-branch, proven live

- Called on a match with **no** override → `{ "ok": false, "error": "NOT_OVERRIDDEN" }`.
- Called on the decisive match forced in §3.4 (has a real override) →
  `{ "ok": true }`. DB `Match` row confirmed **fully reset**: `homeScore`/
  `awayScore`/`homePenaltyScore`/`awayPenaltyScore`/`winnerTeamId` all
  `null`, `status: SCHEDULED`, `manual_override: false`,
  `manual_override_reason`/`overridden_by_user_id`/`overridden_at` all
  `null`.
- **The exact check design.md §14 names**: the `prediction_scores` row that
  existed for that match's prediction (from §3.4's EXACT/5-point score) was
  read again afterward — **`null`** (the row is genuinely gone, not
  zeroed-out) — `scoreMatch`'s existing not-scoreable branch (Bolt 10,
  unchanged) really does delete rather than recompute.
- Called a second time on the now-reverted match →
  `{ "ok": false, "error": "NOT_OVERRIDDEN" }` again, confirming the guard
  isn't a one-shot flag left stale.

### 3.6 `admin.listMatches` — final-state sanity check

The 3 test matches, read back through `admin.listMatches` as the admin,
showed exactly the expected final `manualOverride`/`bothTeamsResolved`
flags (unresolved-knockout: `false`/`false`; the reverted decisive match:
`false`/`true`; the still-forced knockout match: `true`/`true`) — matching
every DB-level assertion above, not just internally consistent with itself.

### 3.7 Cleanup

All 3 created `Match` rows, their `Prediction`/`prediction_scores` rows,
both `Profile` rows, and both Supabase auth users were deleted in the
script's `finally` block. A residue check (direct Prisma counts) confirmed:

```
{ "residueMatches": 0, "residueProfiles": 0, "residueScores": 0 }
```

The throwaway script (`bolt13-verify.ts`) was deleted from
`backend/src/scripts/` before finishing — `git status` on `backend/` shows
only this bolt's real source/test changes plus the legitimate, kept
`seed-admin.ts`. The dev server was stopped cleanly afterward (confirmed
`GET /health` connection refused).

**Result: zero discrepancies found from the Model/Design/ADR expectations.**
Every business rule (BR-7.4, BR-7.16, the decisive/tied-knockout/tied-draw
winner-resolution matrix, `NOT_OVERRIDDEN`, the delete-not-recompute
behavior) matched exactly, and the FORBIDDEN proof — this bolt's named
highest-priority regression — held for a genuine non-admin caller across
all five gated handlers.

## 4. Bugs found during Test-stage verification

**None.** Unlike Bolt 12's Test stage (which found 4 real issues) and Bolt
10's (which found a genuine product bug), this bolt's Implement-stage code
matched `design.md` exactly on first verification — every domain/backend
unit test, every component test, and every real curl+DB check passed
without requiring a source-code fix. The only iteration needed during this
Test stage was a single test-authoring correction (not an app bug): an
early draft of `force-result-form.test.tsx`'s tied-knockout test queried
`getByText('Penalty shootout')` and failed on "multiple elements" —
`ForceResultForm` legitimately renders that string twice (the section
header, and the winner-placeholder text shown while the shootout is still
tied/invalid). Fixed by using `getAllByText` for the header-presence
assertion and `getByTestId('force-result-penalty-winner')` (the component
already exposes this testID) for the placeholder-vs-resolved-winner text
specifically — no `renderHook`/`unmount`-await bug class (Bolt 12 §4) was
present in this bolt's test suite; every `render...` call in the new suites
was already correctly awaited.

## 5. Twin-component / independence-boundary checks (design.md §14 reconfirmed)

- **Score-bounds independence**: both the mobile domain (`src/domain/admin/
  force-result-validation.ts`) and backend
  (`backend/src/services/admin/force-result-validation.ts`) twins each got
  their own explicit regression test proving a 21-50 score passes their own
  0-50 bound while failing predictions' 0-20 bound
  (`validatePredictionEntry`/`validateScoreBounds` respectively) — the two
  bounds are genuinely independent implementations, not accidentally
  sharing one constant, on BOTH sides of the host/backend boundary.
- **`admin.listMatches` vs. `competition.getFixture`** (ADR-060): confirmed
  by inspection — no code path in `src/domain/admin/` or
  `src/remotes/admin/` ever imports from `src/domain/competition/`'s public
  fixture types, and `admin-match-filters.ts`'s own doc comment records the
  invariant permanently.

## 6. Manual Layer 2 (device) test paths — for the user's own manual pass

Per standing preference (`feedback_layer2_manual.md`), Layer 2 is not
automated and `agent-device` was not invoked. The following device-level
flows are ready for the user's own manual verification:

1. **Settings → Admin row visibility, two real accounts**: on a non-admin
   account, confirm the Admin row is genuinely absent from Settings; on the
   account promoted via `npm run seed:admin -- <email>` (from `backend/`),
   confirm the row appears and opens the `admin` remote.
2. **Sweep-status screen + trigger button**: open Rescoring sweep, confirm
   the "never run"/last-run+count states render correctly, press the
   trigger button, confirm the screen updates to reflect the new run
   without a manual pull-to-refresh.
3. **Force-result form, end-to-end on a real scheduled match**: pick a real
   match with both teams resolved, enter a decisive score + a reason,
   submit, confirm the match becomes `FINISHED` and (if you have a real
   prediction on it) your own prediction gets scored immediately; repeat
   for a tied knockout match to confirm the live-derived penalty-winner
   preview and the mandatory shootout entry.
4. **Revert-override's type-to-confirm flow**: pick a match with an active
   override, confirm the Confirm button stays disabled while typing a
   partial/wrong code, confirm it enables only once the exact FIFA codes
   are typed, confirm reverting removes the forced result and any
   prediction scores for that match disappear from your own Predictions
   screen.
5. **Dark/light theming** on all four new `admin`-remote screens
   (`AdminHomeScreen`/`SweepStatusScreen`/`ForceResultScreen`/
   `RevertOverrideScreen`) — confirm legibility and correct theming in both
   modes; the `AdminMatchList` FlashList rows are plain `StyleSheet` by
   design (same list-perf rationale as `ranking-row.tsx`/
   `admin-match-list.tsx`'s own doc comment) — confirm they still read
   legibly in both themes even though they don't pull from Tamagui tokens
   directly.

## 7. Plan-status note

With Bolt 13 (Admin) now closed at Layer 1 (mobile + backend, both real),
**every bolt in the 14-bolt plan is now either fully closed at Layer 1 or
deliberately deferred** — the only remaining open item is **Bolt 11
(Notifications)**, which stays deliberately deferred pending the user's own
push-SDK/FCM-APNs decision (`activeContext.md`'s long-standing note), not a
gap discovered here.
