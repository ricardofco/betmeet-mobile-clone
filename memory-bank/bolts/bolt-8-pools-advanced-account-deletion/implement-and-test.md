# Bolt 8 — Implement & Test

## 1. What was built

### Mobile side

**Domain (framework-free, `src/domain/`)** — additive, no breaking change
to any prior bolt's exports:
- `src/domain/pools/directed-invite-target.ts` — `parseInviteTarget`/`isPlausibleInviteTarget` (POOLS-3).
- `src/domain/pools/ownership-transfer.ts` — `isValidTransferTarget`/`transferCandidates` (POOLS-7).
- `src/domain/pools/predictions-visibility.ts` — `isMemberPredictionVisible` (POOLS-6, advisory-only mirror, ADR-038).
- `src/domain/pools/pool.ts` — `+PoolPickerEntry` type.
- `src/domain/predictions/pool-override.ts` — `shouldOfferDualSave` (PREDICTIONS-3).
- `src/domain/auth/account-deletion.ts` — `poolsNeedingAssignment`/`poolsToBeDeleted`/`allOwnersAssigned`/`isConfirmPhraseValid`/`DELETE_ACCOUNT_CONFIRM_PHRASE` (AUTH-6).
- Barrel exports updated: `src/domain/pools/index.ts`, `src/domain/predictions/index.ts`, `src/domain/auth/index.ts`.

**Platform (`src/platform/backend-api/`)**:
- `pools-api.ts` extended — `createDirectedInvite`, `getMyPoolsForPicker`, `transferOwnership`, `getOwnedPoolsForDeletion`, `getMemberPredictions` + their response types.
- `predictions-api.ts` extended — `resetOverride`; `SavePredictionInput` gains `alsoSaveAsGlobal?: boolean`; `SavePredictionResponse`'s error union gains `NOT_MEMBER`.
- `auth-api.ts` — **new file**, first `auth.*` capability-group module beyond the original `resendConfirmation`-on-the-interface shape; `authApi.deleteAccount(...)`.

**Host (`src/host/`)**:
- `predictions/hooks/use-predictions-query.ts` — `+usePoolOverridesByMatch`, `+usePoolsForPickerQuery`, `+useResetOverrideMutation`; `useSavePredictionMutation` now also invalidates the `['pools','memberPredictions']` key prefix when `poolId` is set (cross-bundle refresh via the MF-shared `QueryClient`, ADR-034).
- `predictions/components/pool-override-picker.tsx` — **new**, chip-row picker (no new native dependency).
- `predictions/components/prediction-match-card.tsx` — extended with pool-selection, dual-save checkbox, and reset-override affordance (PREDICTIONS-3/4).
- `predictions/components/predictions-fixture-list.tsx` — threads the new props through to each card.
- `predictions/screens/predictions-screen.tsx` — wires `usePoolsForPickerQuery`/`usePoolOverridesByMatch`/`useResetOverrideMutation` in.
- `settings/hooks/use-account-deletion-query.ts` — **new**, `useOwnedPoolsForDeletionQuery`/`useDeleteAccountMutation`.
- `settings/screens/delete-account-screen.tsx` — **new**, AUTH-6's confirm-phrase + per-pool successor picker.
- `settings/screens/account-settings-screen.tsx` — `+"Delete account"` row.
- `auth/navigation/auth-stack-params.ts` — `SettingsStackParamList` `+DeleteAccount: undefined`.
- `auth/navigation/screen-registry.ts` — `+DeleteAccount: ['protected']`.
- `navigation/root-navigator.tsx` — registers `DeleteAccountScreen` on `SettingsStack`.

**Remote (`src/remotes/pools/`)**:
- `hooks/use-pools-query.ts` — `+useCreateDirectedInviteMutation`, `+useTransferOwnershipMutation`.
- `hooks/use-pool-predictions-query.ts` — **new**, `usePoolMemberPredictionsQuery`/`useSaveGridPredictionMutation`/`useResetGridOverrideMutation` — calls `poolsApi`/`predictionsApi` directly, no import from `src/host/predictions/` (ADR-036).
- `components/directed-invite-form.tsx` — **new** (POOLS-3).
- `components/transfer-ownership-panel.tsx` — **new** (POOLS-7, ADR-040).
- `components/pool-score-stepper.tsx` — **new**, deliberately duplicated score input (ADR-037).
- `components/prediction-grid-cell.tsx` — **new**, one member's row (masking display, viewer-editable state).
- `components/prediction-grid-match-card.tsx` — **new**, one match's card (header + member rows).
- `screens/pool-predictions-screen.tsx` — **new**, the day-grouped FlashList grid (POOLS-6).
- `screens/pool-detail-screen.tsx` — `+DirectedInviteForm` panel, `+"Predictions"` button.
- `screens/pool-settings-screen.tsx` — `+TransferOwnershipPanel`; danger-zone copy updated (no longer says "transferring is not yet available").
- `navigation/pools-stack-params.ts` — `+PoolPredictions: { poolId: string }`.
- `PoolsRemoteEntry.tsx` — registers `PoolPredictionsScreen`.

No rspack/Module Federation config change — no new remote, no new shared-singleton dependency (confirmed by ADR-036's re-examination). **No new npm dependency** — verified via an empty `yarn.lock` diff (see §4).

### Backend side (`backend/`, ADR-030)

- `backend/src/services/account-deletion.ts` — **new**. `getOwnedPoolsForDeletion`, `transferSinglePoolOwnership`, `transferOwnedPoolsForAccountDeletion` (the shared reassign-and-drop-membership logic, ADR-040, transactional per-flow per ADR-039).
- `backend/src/services/directed-invite.ts` — **new**. `resolveInviteTarget` (email → raw cross-schema query against `auth.users`/`public.profiles`, degrading gracefully to hash-only on a permission error; nickname → `Profile` lookup).
- `backend/src/services/pool-permissions.ts` — extended: `canInvite`, `isValidTransferTarget`.
- `backend/src/routes/handlers.ts`:
  - `predictions.save` extended — pool-membership check (`NOT_MEMBER`), transactional dual-save when `alsoSaveAsGlobal && poolId` (ADR-039).
  - `predictions.resetOverride` — new handler.
  - `pools.createDirectedInvite`, `pools.getMyPoolsForPicker`, `pools.transferOwnership`, `pools.getOwnedPoolsForDeletion`, `pools.getMemberPredictions` — new handlers.
  - `auth.deleteAccount` — new handler.
  - All registered in the `handlers` map.
- No Prisma schema/migration change — `PoolDirectedInvite` already existed in the pulled live schema (confirmed at Model stage); no new table needed for any Bolt 8 capability.

## 2. Layer 1 — automated tests (mobile)

- **578 tests passing across 80 suites** (up from 509/70 at Bolt 7 close — **+69 new tests across 10 new suites**, plus additions to 2 existing suites):
  - New suites: `directed-invite-target.test.ts` (13), `ownership-transfer.test.ts` (5), `predictions-visibility.test.ts` (5), `pool-override.test.ts` (4), `account-deletion.test.ts` (6) — domain; `pool-override-picker.test.tsx` (4), `delete-account-screen.test.tsx` (5) — host; `directed-invite-form.test.tsx` (6), `transfer-ownership-panel.test.tsx` (5), `prediction-grid-cell.test.tsx` (8) — pools remote. (61 tests total in these 10 suites.)
  - Extended: `prediction-match-card.test.tsx` (+8 pool-override/dual-save/reset tests), `account-settings-screen.test.tsx` (+1 navigation test), `predictions-fixture-list.test.tsx` (prop-threading only, same test count).
- `yarn tsc --noEmit` — clean (mobile).
- `cd backend && npx tsc --noEmit` — clean.
- `yarn lint` — one pre-existing, unrelated error in `src/platform/supabase/supabase-adapter.ts:224` (flagged by every prior bolt since Bolt 4, not touched by this bolt).
- **Bundle-size discipline verified**: `yarn.lock` diff is empty after this bolt (a `yarn install` accidentally run with the wrong Yarn binary — Classic 1.22.22 instead of this repo's pinned Berry, per `.yarnrc.yml` — rewrote the lockfile's format; caught before commit and reverted via `git checkout -- yarn.lock`; `package.json` itself was never touched, confirming zero new npm dependency). **Flagged explicitly, not silently fixed**: if a future session needs to actually add a dependency, use Corepack/Yarn Berry, not a bare global `yarn`, to avoid the same lockfile-format churn.

`prediction-grid-cell.test.tsx` is the component-level analogue of the API-response masking check (§3) — it proves the **display** never renders a value when `hidden: true`, and separately proves a `hidden: false` row does render the real value. It cannot, by itself, prove the *server* actually nulls those fields — that is what §3's real backend check is for, and is the reason ADR-038 treats them as two independent, both-required proofs.

## 3. Layer 1 — real backend verification: DONE FOR REAL (2026-07-02, after `backend/.env` was restored)

Per ADR-030 and Bolt 7's precedent, this bolt's Layer 1 required real
verification against the live Supabase project — not contract-only — with
the API-response-level anti-bias-masking check as the headline requirement.
`backend/.env` was restored mid-session; the runbook drafted earlier was
executed exactly as written, with one adaptation (§3.1) and one positive
finding (§3.6) worth calling out explicitly.

Booted `cd backend && npm run dev` against the live project
(`sjgheiqnumywbotghqkb.supabase.co`, same project mobile/backend already
use). Minted 4 throwaway users via the Admin API (A, B, C, D), signed each
in for a real bearer JWT (confirmed the Access Token Hook is active — every
minted JWT carried `email_verified`/`onboarding_completed`/`account_deleted`
claims). Assigned nicknames to A/B via `profile.assignNickname`.

### 3.1 Adaptation: constructing the "visible once started" masking case

The runbook's plan (§4f) was to find an already-`LIVE`/`FINISHED` match and
have a user "already have a prediction" on it. In practice, `predictions.save`
correctly **rejects** writing a *new* prediction on an already-locked match
(`{ok:false,error:'LOCKED'}`) — confirmed this rejection fires exactly as
Bolt 6 designed it, itself a small useful proof of the kickoff-lock guard
holding under real data. Since this project's seeded competition data has
no prediction rows surviving from a still-active user (Bolt 5/6/7's test
users were all cleaned up, cascading their predictions), there was no
existing "real prediction on a past match" row to observe. Resolved by
inserting one directly via Prisma (`prisma.prediction.create`, bypassing
the API's save-guard on purpose, since this step's goal was to test the
**read/masking** path against a pre-existing row, not to test the save
path a second time) — a legitimate test-setup technique, not a shortcut
around anything this bolt's own code needed to prove.

### 3.2 ANTI-BIAS MASKING — the headline check (ADR-038)

- A saved a **global** prediction (2-1) on a real `SCHEDULED` match with a
  genuinely future kickoff (`2026-07-03T03:00:00Z`, checked against the
  real current instant, `2026-07-02T23:27 UTC`).
- **As B**, `pools.getMemberPredictions` for the shared pool returned A's
  row for that match as:
  ```json
  {"matchId":"1aca241b-...","userId":"<A>","predictedHome":null,"predictedAway":null,
   "totalPoints":null,"matchedCase":null,"isOverride":false,"hasGlobal":false,"hidden":true}
  ```
  — **exact match** to Model §5's field list, verified on the raw JSON body
  (`curl -s | jq`), not the UI.
- **As A** (viewing the same grid, own row): the same match returned
  `predictedHome:2, predictedAway:1, hidden:false` — the viewer's own
  prediction is never masked, confirmed.
- Inserted a real prediction row for B (3-0) directly against a genuinely
  past/`FINISHED` match (kickoff `2026-06-29`, well before the real current
  instant). **As A**, requesting the grid, B's row for that match returned
  `predictedHome:3, predictedAway:0, hidden:false` — confirming the
  **third** branch of the rule (another member, but the match has started
  → visible) is also correct, not just the two already covered by the
  component test.

**Result: masking behaves exactly as Model §5/ADR-038 specify, on all
three branches, verified at the raw API-response level. No discrepancy
found.**

### 3.3 DUAL-SAVE ATOMICITY (ADR-039) — happy + failure path

- **Happy path**: A called `predictions.save` for a match with no prior
  prediction, `poolId` set, `alsoSaveAsGlobal:true`, `3-0`. Response
  `{ok:true,...}`. `predictions.getMyPredictions` immediately after showed
  **both** a `poolId:null` row and a `poolId:<pool>` row for that match,
  both `3-0` — the atomic dual-write landed as one unit.
- **Failure path**: A called `predictions.save` for a *different*
  never-predicted match with `poolId` set to a fabricated UUID (a pool A is
  not a member of) and `alsoSaveAsGlobal:true`. Response
  `{ok:false,error:'NOT_MEMBER'}`. `predictions.getMyPredictions`
  immediately after showed **zero** rows (neither global nor override) for
  that match — confirming the membership check runs and rejects **before**
  any write is attempted, exactly ADR-039's "clean rejection, not a partial
  write" design, not a rollback-after-partial-write.
- Also exercised `predictions.resetOverride`: reset the just-created
  override back off (idempotent — a second reset call also returned
  `{ok:true}`, no error), leaving only the global `3-0` row; a reset call
  targeting a pool the caller isn't a member of correctly returned
  `{ok:false,error:'NOT_MEMBER'}`.

**Result: dual-save atomicity and the reset flow behave exactly as
Model §6/§7/ADR-039 specify. No discrepancy found.**

### 3.4 DIRECTED INVITE (POOLS-3)

- A invited B by nickname (`bolt8userb#NNNN`) → `{ok:true,resolved:true}`.
- Re-invited the identical target → still `{ok:true,resolved:true}`
  (idempotent upsert, not a duplicate-row error).
- A attempted to invite **themself** → `{ok:false,error:'SELF_INVITE'}`.
- A invited a syntactically-valid but non-existent email
  (`nobody-real-bolt8@example.com`) → `{ok:true,resolved:false}` (the
  email-hash-only path).
- A too-short target (`"ab"`) → `{ok:false,error:'VALIDATION_FAILED'}`.
- A well-formed but non-matching nickname (`nosuchuser#9999`) →
  `{ok:false,error:'UNRESOLVABLE'}`.
- **C (not a pool member) attempting to invite** → `{ok:false,error:'NOT_MEMBER'}`.

**Result: every branch of the directed-invite target-resolution/permission
logic matches Model §2 exactly. No discrepancy found.**

### 3.5 OWNERSHIP TRANSFER (POOLS-7, ADR-040)

- `pools.getMyPoolsForPicker` as A returned exactly the one pool A belongs
  to, `{id, name}` only — confirms the lean picker DTO shape.
- A (owner) transferred the pool to B → `{ok:true}`. Direct read via
  `pools.getDetail`: `ownerId` is now B, and **A's membership row is gone
  entirely** — only B remains as a member, exactly matching the "transfer
  always drops the old owner's membership" rule.
- A (no longer owner) attempting another transfer → `{ok:false,error:'NOT_OWNER'}`.
- B (owner) attempting to transfer to a random non-member UUID →
  `{ok:false,error:'INVALID_TARGET'}`.
- B (owner) attempting to transfer to **themself** →
  `{ok:false,error:'INVALID_TARGET'}` (also correctly rejected — the
  `isValidTransferTarget` check catches "already the owner" too).

**Result: matches Model §3/design.md §3.1/ADR-040 exactly. No discrepancy found.**

### 3.6 ACCOUNT DELETION (AUTH-6, ADR-039) — failure path then happy path

- C created two pools: `P2` (sole member) and `P3` (C + D, D joined by token).
- `pools.getOwnedPoolsForDeletion` as C correctly returned `P2` with
  `candidates: []` and `P3` with `candidates: [{userId: D, nickname: null}]`.
- **Failure path**: `auth.deleteAccount` with `poolOwnershipAssignments: []`
  → `{ok:false,error:'MISSING_ASSIGNMENT'}`. Direct DB reads immediately
  after confirmed: `P3.ownerId` still C, `P2` still exists, and — checked
  via a direct Prisma read of the `Profile` row, not just the
  capability-level `profile.getProfile` (which doesn't expose `deletedAt`)
  — **`deletedAt` was still `null`**. The rejection happened cleanly before
  any destructive write, exactly ADR-039's design.
- **Happy path**: `auth.deleteAccount` with `poolOwnershipAssignments:
  [{poolId: P3, newOwnerId: D}]` → `{ok:true}`. Direct DB/Admin-API reads
  confirmed all four effects in one shot: `P2` no longer exists at all
  (sole-member pool auto-deleted); `P3.ownerId` is now D, with only D's
  membership row remaining; C's `Profile.deletedAt` is set and
  `nicknameBase`/`nicknameDiscriminator` are `null`; and
  `supabaseAdmin.auth.admin.getUserById(C)` returned `"User not found"` —
  the auth user is genuinely hard-deleted, not just soft-deleted.

**Result: matches Model §4/design.md §3.1/ADR-039/ADR-040 exactly. No
discrepancy found.**

### 3.7 A positive finding worth recording (resolves a flagged uncertainty)

`implement-and-test.md`'s original §5 flagged `directed-invite.ts`'s raw
`auth.users`/`public.profiles` cross-schema query as untested-for-real,
with a documented graceful-degradation fallback in case this backend's DB
role lacked `SELECT` on the `auth` schema. **This is now resolved**: an
invite targeted at a real registered user's actual email address (not a
nickname) returned `{ok:true,resolved:true}`, and the server log showed no
"raw query failed" warning — the cross-schema query works exactly as
designed against this project's Postgres role, matching `betmeet-clone`'s
real `resolveUserByEmail` behavior. The `catch`-based fallback in
`directed-invite.ts` never had to fire; it remains in place as legitimate
defense-in-depth, not because it's needed today.

### 3.8 Cleanup

Deleted, in order: all `Prediction` rows for the 4 test users (incl. the
one directly-inserted row), all `PoolDirectedInvite` rows referencing them,
all remaining `PoolMembership` rows, all pools they owned, all 4 `Profile`
rows, then hard-deleted all 4 Supabase auth users via the Admin API
(C's auth user was already gone from the deletion test itself — confirmed
via the expected "User not found" on the cleanup pass). Final residue
check (direct Prisma counts): **zero** remaining predictions, memberships,
pools, profiles, or directed invites for any of the 4 test user IDs.
Stopped the backend server. No leftover files — the throwaway
verification/cleanup scripts used to insert/inspect rows directly (outside
the capability surface) were deleted from `backend/` before finishing;
`git status` on `backend/` shows only this bolt's real source changes.

## 4. Layer 2 — device-level manual test paths (per this bolt's task instructions, not run by this agent)

The user performs Layer 2 manually (standing preference,
`feedback_layer2_manual.md`) — not attempted by this agent, per explicit
instruction. Backend Layer 1 is now genuinely proven (§3), so these device
paths are for-real exercisable the moment the pre-existing, already-documented
blockers from Bolts 3/7 are cleared (mobile `pod install`, and the `pools`
remote's dev server on port 8083) — unchanged by this bolt:

1. Sign in as two different accounts on two devices/simulators (or one
   device + the backend-verified second account), both in the same pool.
2. On device A, save a global prediction for a future match; on device B,
   open that pool's Predictions grid — confirm A's row shows "Hidden until
   kickoff," not a score.
3. On the Predictions screen (host), open a match card, tap a pool chip,
   confirm the score inputs pre-fill correctly (empty for a first-time
   override, the global's values when editing an override that mirrors an
   existing global) and the "Also save as my global prediction" toggle
   only appears when appropriate.
4. Save a dual-save prediction; confirm both the global prediction (on the
   Predictions screen) and the pool override (in the pool's grid) reflect
   the new values.
5. Tap "Use global prediction" on an existing override; confirm the pool
   grid falls back to the global value.
6. From Pool Detail, send a directed invite by nickname; confirm the
   success/error copy matches the outcome (resolved vs. hash-only vs.
   self-invite vs. permission-denied for a non-inviting private-pool
   member).
7. From Pool Settings, transfer ownership to another member; confirm the
   outgoing owner is no longer listed as a pool member and the "Pool
   settings"/kick affordances move to the new owner.
8. From Account Settings → Delete account: verify the confirm-phrase gate,
   the per-pool successor picker for an owned multi-member pool, and that
   a sole-member owned pool is listed as "will be deleted." Confirm
   deletion signs the device out and the account can never sign in again.
9. MF shared-singleton sanity check (same class of risk ADR-034 flagged
   for Bolt 7, now exercised by a cross-bundle mutation for the first
   time): save a pool override from the **host** Predictions screen, then
   navigate into the **pools remote**'s grid for that pool — confirm the
   grid reflects the new override **without a manual pull-to-refresh**,
   proving the `['pools','memberPredictions']` cross-bundle invalidation
   (§design.md §6) actually works against two real bundles, not just
   Jest's single-process QueryClient.

## 4.1 Layer 2 device findings — two real bugs found and fixed (2026-07-03)

The user ran their manual Layer 2 pass (device build against the now-live
backend). Two genuine bugs surfaced — both are exactly the class of thing
Jest's single-bundle/single-process test runner cannot catch, and both are
now fixed:

**Bug 1 — onboarding completion never left the wizard.** Root cause:
`onboarding-wizard-screen.tsx`'s `completeWizard()` called
`getSupabaseAdapter().getSession()` after `profile.completeOnboarding`
succeeded, expecting it to make `onSessionChange` fire with the
now-updated `onboarding_completed` claim. It doesn't — `getSession()` only
decodes whatever JWT is already cached locally; it never asks Supabase for
a new token and never emits an `onAuthStateChange` event, so
`AuthGatedNavigator`'s guard kept reading the stale `false` claim
indefinitely. Confirmed directly by inspecting the cached JWT in the
keychain, which still carried `onboarding_completed: false` after
completion. **Fix**: added `SupabaseAdapter.refreshSession()`
(`src/platform/supabase/supabase-adapter.ts`), which calls the SDK's
`client.auth.refreshSession()` — this mints a real new access token
(re-running the Custom Access Token Hook so the updated claim is actually
stamped) and fires `onAuthStateChange('TOKEN_REFRESHED', ...)` on its own,
which the existing `onSessionChange` → `setSession` → guard-reevaluation
pipeline already handles correctly. `onboarding-wizard-screen.tsx` now
calls `refreshSession()` instead of `getSession()`; the one test asserting
the old call shape was updated to assert `refreshSession()` instead.

**Bug 2 — the `pools` remote crashed on first navigation** with
`Element type is invalid. Received a promise that resolves to: undefined`.
Root cause, found via the actual RedBox stack trace (not just the derived
symptom): `Invariant Violation: Tried to register two views with the same
name RNSVGCircle`. `react-native-svg` is used by both the host and the
`pools` remote (`pool-predictions-screen.tsx` pulls in
`src/shared/competition`'s flag/team badges) but was **not** in either
bundle's MF `shared` config — each bundle registered its own copy of
`react-native-svg`'s Fabric native components, and Fabric's native
component registry is process-global, not bundle-scoped, so the second
registration throws. That throw happens inside React Native's
`guardedWebpackRequire`, which reports it to the RedBox but lets execution
continue with whatever partial `exports` existed at the throw point —
which is exactly why `import('pools/App')` "resolved" to
`{ default: undefined }` instead of visibly rejecting. **This is the same
class of risk ADR-034 flagged for `@shopify/flash-list`/
`@tanstack/react-query` (a Jest-can't-catch MF shared-singleton gap), just
for a third package** — `react-native-svg` specifically, surfaced by
`pools` being the first remote to reuse host-shared, SVG-based UI code.
**Fix**: added `react-native-svg` as a `singleton: true` shared dep to
both `rspack.config.mjs` (host) and `rspack.config.pools-remote.mjs`
(remote), same pattern as ADR-034's existing entries. Manual test path #9
above (the react-query cross-bundle-invalidation sanity check) should be
treated as one instance of a broader "every shared dependency needs to
actually be in both configs' `shared` list, not just the ones a Jest test
happens to exercise" class of risk — worth a deliberate audit pass, not
just incremental fixes as each gap is hit on-device.

Both fixes verified: `yarn tsc --noEmit` and `yarn jest` (578/578) clean
after each change.

## 5. What was explicitly flagged to the user / stopped-and-asked moments

- **Backend Layer 1's real-DB verification is now DONE FOR REAL** (§3) —
  `backend/.env` was restored mid-session; every new/extended capability
  was exercised against the live Supabase database with 4 throwaway users,
  including the headline anti-bias-masking check at the raw API-response
  level, dual-save's happy+failure paths, and account deletion's
  happy+missing-assignment-failure paths. **Every result matched the
  Model/Design/ADR expectations exactly — no masking or atomicity
  discrepancy was found.** The one adaptation needed (§3.1: inserting a
  test row directly via Prisma to construct the "already-started match"
  masking case, since `predictions.save` correctly refuses to create a new
  prediction on an already-locked match) is a test-setup technique, not a
  change to any production code path.
- **`auth.users` raw cross-schema query for email-target resolution**
  (`directed-invite.ts`) — previously flagged as untested; **now confirmed
  working** against this project's real DB role (§3.7): an invite targeted
  at a real user's actual email resolved correctly (`resolved:true`), no
  permission error, no fallback triggered. The `catch`-based
  graceful-degradation path remains in place as defense-in-depth but was
  never exercised for real.
- **PoolDirectedInvite accept/revoke status transitions are not built** —
  confirmed, by grepping `betmeet-clone`'s actual source, that no such UI
  or action exists there either; building one would be inventing scope,
  not porting it (model.md §10).
- **`POOL_INVITE` notification queuing is not built** — Bolt 10 owns
  notification delivery infrastructure, which doesn't exist in this repo
  yet; queuing an inert row nothing will ever process would be premature
  plumbing (model.md §2/§10).
- **Nickname search/typeahead for the directed-invite target field is not
  built** — a UX-polish layer on top of the core capability, explicitly
  deferred (model.md §2), isolated follow-up.
- **POOLS-6's grid reimplements day-grouping locally** rather than reusing
  `src/domain/competition`'s `groupMatchesByDay` — a small, deliberate
  implementation simplification (design.md's `PoolMatchSummary` DTO
  doesn't structurally match `groupMatchesByDay`'s `Match` type), not a
  scope cut; flagged in `pool-predictions-screen.tsx`'s own doc comment.
- **A `yarn install` in this session briefly rewrote `yarn.lock` to Yarn
  Classic format** (wrong binary resolved) — caught and reverted before
  anything was committed; flagged here per this project's "flag
  environment gotchas so they don't recur" discipline (§2). No dependency
  was actually added or removed.
- **ADR-032/ADR-024 re-examinations (§design.md §1/§2) both concluded "no
  change"** — flagged explicitly per the task brief's instruction to show
  the check was actually done, not assumed, mirroring Bolt 7/ADR-017's
  precedent for the same category of decision.

## 6. Bolt closeout

**Bolt 8 is closed at Layer 1, fully — mobile (578 tests) and backend
(real, not contract-only, per ADR-030) both verified.** This is the second
bolt (after Bolt 7) to close with a genuinely-proven backend, and the
first bolt whose backend verification was interrupted by a missing
credential mid-session and then completed for real once it was restored —
worth remembering as a concrete example of the "flag the blocker, don't
route around it" discipline paying off (the runbook written while blocked
was executed verbatim once unblocked, with only one anticipated-in-advance
adaptation, §3.1). Only Layer 2 (device) remains, deferred to the user's
own manual pass per standing preference — not attempted here.
