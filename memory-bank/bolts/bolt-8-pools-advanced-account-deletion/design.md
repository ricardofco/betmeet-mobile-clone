# Bolt 8 — Design

## 1. ADR-032 re-examination (Module Federation placement — task brief's explicit ask)

### 1.1 The question

Bolt 7's `design.md §1` anticipated this exact moment and pre-committed to
a specific shape for Bolt 8's predictions↔pools integration, on the
explicit condition that this bolt "gets to revisit this ADR the same way
ADR-017 revisited Inception's anticipation" if the real implementation
needs more than that anticipated shape. This section checks that
condition against what Model stage §6/§5 actually specified.

### 1.2 What was anticipated (Bolt 7, `design.md §1.3`)

> - Host side: a small new capability read (`pools.getMyPoolsForPicker`-shaped,
>   list of `{id, name}` pairs) called directly through `BackendApiClient` —
>   no import of anything from `src/remotes/pools/` or `src/domain/pools/`'s
>   UI layer.
> - Remote side: POOLS-6's member-prediction grid calls `predictions.*`
>   capabilities directly through the same shared `BackendApiClient`
>   singleton — no JS-level import of host or `predictions` code either.

### 1.3 What Model stage §5/§6 actually specifies

- PREDICTIONS-3's pool-override picker needs exactly a `{id, name}[]` list
  of the viewer's own pool memberships (§6's `PoolPickerEntry` type) — a
  new, purpose-built, lean capability (`pools.getMyPoolsForPicker`, §2
  below), not `pools.getMine()`'s full `PoolSummary[]` and not any
  component from `src/remotes/pools/`.
- POOLS-6's grid (`pools.getMemberPredictions`, §2 below) is a **new**
  backend capability the `pools` remote calls directly — it does not import
  anything from `predictions.*`'s TypeScript types beyond what the backend
  response DTO itself defines, and it does not import any component from
  `src/host/predictions/`.

This is exactly the anticipated shape, evaluated against this bolt's real
Model output, not a hypothetical. **No new cross-bundle JS import is
introduced in either direction.** The only filesystem-shared-root imports
either side needs are `src/domain/pools/` (host importing
`PoolPickerEntry`'s type + the new `predictions-visibility.ts`/
`ownership-transfer.ts` pure functions where relevant) and
`src/domain/competition/`'s day-grouping helpers (pools remote reusing
Bolt 5's pure `fixture-day-grouping.ts` functions for the grid's day
sections) — both are the same "filesystem-shared-root domain import" the
predictions↔competition relationship already established (ADR-017/018),
not a new coupling category, and carry zero MF-boundary cost (no bundle
duplication risk, since these are pure functions, not stateful
singletons requiring `shared: true` MF config).

### 1.4 Decision

**ADR-032 holds, confirmed, not revisited.** `pools` remains this repo's
second real Module Federation remote, unchanged placement. Recorded
formally as ADR-036 (§ADR list below) rather than left as an implicit
non-event, since the task brief specifically asked for this check to be
done and shown, not assumed.

## 2. ADR-024 re-examination (predictions' host-only component/hook tier)

### 2.1 The question

ADR-024 (Bolt 6) said `src/host/predictions/` stays host-only, "promote on
second consumer." Bolt 8 is the first bolt where a second surface
(POOLS-6's grid, living in the `pools` remote) needs to render
prediction-shaped UI. Does this second consumer force a promotion to
`src/shared/predictions/`?

### 2.2 What the two surfaces actually need, compared

| | `PredictionsScreen` (host, Bolt 6) | POOLS-6 grid (`pools` remote, this bolt) |
|---|---|---|
| Unit of UI | One card per match, **one** user's editable prediction | One grid: columns = matches, rows = **every pool member**, mostly read-only |
| Editable surface | Every visible row (the viewer's own predictions) | Only the viewer's own row; every other row is masked pre-kickoff and never editable regardless |
| Penalty-winner entry | Yes (`PenaltyWinnerSelector`) | No — POOLS-6's AC is masking + override display, not full prediction entry; overriding *with* a penalty winner is still possible but reuses the existing global-prediction-entry surface (PREDICTIONS-1/2, Bolt 6) for the underlying score/penalty input, not a re-hosted copy of it in the grid |
| Score breakdown panel | Yes (`ScoreBreakdownPanel`, post-match) | No — the grid shows a compact points badge, not the full breakdown explainer |
| List shape | Day-grouped `FlashList` of match rows | Day-grouped `FlashList` of match rows **containing member sub-rows** — a materially different nested-list shape |

The only literally-identical sub-widget between the two is a numeric
score stepper (`PredictionScoreInput` — an input/`Text` pair with
+/- controls, ~40 lines, no business logic beyond clamping 0-20). Every
other piece (`PenaltyWinnerSelector`, `ScoreBreakdownPanel`,
`PredictionMatchCard`, `PredictionsFixtureList`) is either entirely
inapplicable to the grid or shaped for a single-user card, not a
multi-member grid cell.

### 2.3 Decision

**ADR-024 holds, not promoted.** POOLS-6's grid gets its own small,
remote-owned components (`src/remotes/pools/components/prediction-grid-*`,
§4 below) rather than a `src/shared/predictions/` tier. The one
genuinely-identical widget (the score stepper) is **duplicated** as a
small, physically separate component
(`src/remotes/pools/components/pool-score-stepper.tsx`, ~40 lines) instead
of promoting all of `src/host/predictions/components/` to shared status for
its sake. This mirrors ADR-025's exact reasoning (Bolt 6, "duplicates only
~40 lines of FlashList wiring" rather than eroding a single-purpose
component's shape) and ADR-018's precedent that promotion to a shared tier
is justified by *genuine* multi-consumer need of the **same** UI shape, not
by two features both happening to touch related data. Recorded as ADR-037.

If a future bolt needs the *editable* prediction-entry surface itself
(score + penalty-winner + validation) reused verbatim inside the pools
remote — not just a read-mostly grid — that would be the actual trigger
for promotion, and should revisit both ADR-024 and ADR-037 together at
that time.

## 3. Backend capability contract (designed together with mobile, per ADR-030)

All new/changed capabilities dispatch through the existing
`POST ${baseUrl}/${capability}` / Bearer-JWT contract, unchanged
(`backend/src/routes/index.ts`).

| Capability | Body | Success | Failure |
|---|---|---|---|
| `pools.createDirectedInvite` | `{ poolId, target }` | `{ ok: true, resolved: boolean }` (`resolved` = a real user was matched, vs. an email-hash-only invite) | `{ ok: false, error: 'VALIDATION_FAILED' \| 'NOT_FOUND' \| 'NOT_MEMBER' \| 'PERMISSION_DENIED' \| 'SELF_INVITE' \| 'UNRESOLVABLE' }` |
| `pools.getMyPoolsForPicker` | — | `PoolPickerEntry[]` (`{ id, name }[]`, pools the caller is a member of) | — (read-only) |
| `pools.transferOwnership` | `{ poolId, newOwnerId }` | `{ ok: true }` | `{ ok: false, error: 'NOT_FOUND' \| 'NOT_OWNER' \| 'INVALID_TARGET' }` |
| `pools.getOwnedPoolsForDeletion` | — | `OwnedPoolTransfer[]` | — (read-only) |
| `pools.getMemberPredictions` | `{ poolId }` | `{ ok: true, matches: PoolMatchSummary[], predictions: PoolMemberPredictionCell[] }` | `{ ok: false, error: 'NOT_FOUND' \| 'NOT_MEMBER' }` |
| `predictions.save` (extended, not new) | `{ matchId, poolId, homeScore, awayScore, penaltyWinner, alsoSaveAsGlobal? }` | unchanged success shape | unchanged failure shape, **plus** `'NOT_MEMBER'` when `poolId` is set and the caller isn't a member of that pool |
| `predictions.resetOverride` | `{ matchId, poolId }` | `{ ok: true }` | `{ ok: false, error: 'NOT_MEMBER' }` |
| `auth.deleteAccount` | `{ poolOwnershipAssignments: { poolId, newOwnerId }[] }` | `{ ok: true }` | `{ ok: false, error: 'MISSING_ASSIGNMENT' \| 'TRANSFER_FAILED' \| 'DELETE_FAILED' }` |

`PoolMatchSummary` (new, purpose-built for the grid — deliberately **not**
a reuse of `competition.getFixture()`'s `Match` DTO, same "own DTO, small
accepted duplication" category already established between
`pool-permissions.ts`/`prediction-eligibility.ts`'s mobile/backend
duplication, applied here to a same-side-of-the-boundary DTO instead):
```ts
{
  matchId: string;
  kickoffAt: string | null;
  matchStatus: string;
  homeTeam: { fifaCode: string } | { placeholder: string } | null;
  awayTeam: { fifaCode: string } | { placeholder: string } | null;
  homeScore: number | null;
  awayScore: number | null;
}
```

`PoolMemberPredictionCell`: exactly the shape Model §5/§8 specifies —
`{ matchId, userId, predictedHome, predictedAway, totalPoints, matchedCase, isOverride, hasGlobal, hidden }`.

### 3.1 Server-side business-rule placement (reimplemented fresh, never imported, per `requirements.md §7.3`)

- **`pools.createDirectedInvite`**: reuses the exact permission logic
  `pools.getDetail`/Bolt 7 already established (`isOwner` / `PUBLIC` /
  `membersCanInvite`), re-derived server-side from the pool row, never
  trusting a client-supplied "I'm allowed to invite" flag. Target
  resolution (`base#NNNN` vs. email) happens against `Profile`, excluding
  `deletedAt IS NOT NULL` rows — matches `betmeet-clone`'s real query
  exactly (`create-directed-invite.ts`'s `resolveUserByTarget`). Email
  hashing uses Node's built-in `crypto.createHash('sha256')` — no new
  dependency, same module Node's `pool-invite-token.ts` already has access
  to via the runtime, just not yet imported there.
- **`pools.getMyPoolsForPicker`**: a lean read, `poolMembership.findMany({
  where: { userId }, include: { pool: { select: { id, name } } } })` —
  intentionally not reusing `getMine`'s handler (which does a heavier
  `_count`/`membersCanInvite`/`inviteToken` join the picker never needs).
- **`pools.transferOwnership`**: owner-only (`isOwner` check, `NOT_OWNER`
  otherwise), target must be a **current member and not already the
  owner** (`INVALID_TARGET` otherwise — covers both "not a member" and
  "already the owner" in one error code, since the UI never offers either
  as a selectable option so a client sending either represents either a
  stale UI state or a hand-crafted request, not a case needing granular
  messaging). On success: `prisma.$transaction` reassigning `ownerId` and
  deleting the outgoing owner's `PoolMembership` row, both in one write
  (§ADR-039/040).
- **`pools.getOwnedPoolsForDeletion`** / **`auth.deleteAccount`**: a new
  `backend/src/services/account-deletion.ts` service, independently
  authored against `domain-overview.md §5.1`/Model §4 (cross-checked
  against `betmeet-clone`'s real `account-deletion.ts` for the exact
  transaction shape per the task brief's reference-behavior instruction,
  never imported). `auth.deleteAccount`'s handler: re-derives
  `getOwnedPoolsForDeletion(auth.userId)` itself server-side (does **not**
  trust the client's `poolOwnershipAssignments` list as complete or
  correct) and validates every pool needing an assignment has one before
  writing anything; only then does the transfer-or-delete transaction run,
  followed by the profile soft-delete + `supabaseAdmin.auth.admin.
  deleteUser()` hard-delete (§ADR-039).
- **`predictions.save`** (extended): the existing handler gains (1) a
  `poolMembership` existence check when `poolId` is set (`NOT_MEMBER`
  otherwise — mirrors `betmeet-clone`'s `savePrediction`'s own membership
  check, ported verbatim, not previously needed since Bolt 6 never sent a
  non-null `poolId`), and (2) when `alsoSaveAsGlobal === true` **and**
  `poolId` is set, both the global (`poolId: null`) and override
  (`poolId` set) upserts happen inside one `prisma.$transaction` instead
  of the existing single-row write (§ADR-039). Every existing check
  (score bounds, penalty-winner rule, kickoff eligibility, lock-clearing
  on a previously-locked row) is unchanged and applies independently to
  each row being written in the transaction.
- **`predictions.resetOverride`**: `prisma.prediction.deleteMany({ where:
  { userId, matchId, poolId } })` — `deleteMany` (not `delete`) so a
  repeat/racing reset is a no-op success, not a `NOT_FOUND` error, matching
  `betmeet-clone`'s real handler exactly. Requires pool membership
  (`NOT_MEMBER` otherwise); no kickoff-lock check (Model §7).
- **`pools.getMemberPredictions`**: requires the caller to be a pool
  member (`NOT_FOUND` if the pool itself doesn't exist, `NOT_MEMBER` if it
  exists but the caller isn't in it — defense in depth, same shape as
  `betmeet-clone`'s real `getPoolMemberPredictions` returning `null` for a
  non-member). Fetches every member's predictions for every match (global
  **and** pool-scoped for this pool, exactly like the real query's
  `OR: [{ poolId }, { poolId: null }]`), resolves override-vs-global
  precedence per `(userId, matchId)` pair, then applies the masking rule
  (§3.2) as the **very last step**, immediately before building the
  response object — not as an early filter, so the "what got nulled" code
  path is a single, auditable block (mirrors the real query's structure,
  which computes `hidden` once per row and applies it to exactly the
  fields Model §5 lists).

### 3.2 Anti-bias masking — explicit review flag (task brief's named, privacy-critical risk)

The masking computation lives **only** in `pools.getMemberPredictions`'s
handler, server-side, and is the **only** place any other member's
`predictedHome`/`predictedAway`/`totalPoints`/`matchedCase` fields are
ever read from the DB and serialized into a response. There is no
alternate code path (no second `predictions.*` capability that could leak
an unmasked view of another member's pool-scoped prediction) — a reviewer
checking this bolt should confirm that fact by inspecting the full set of
`predictions.*`/`pools.*` handlers, not just this one function in
isolation (`predictions.save`'s existing `getMyPredictions` handler only
ever returns the **caller's own** predictions, filtered by
`userId: auth.userId` — already un-leakable by construction, unaffected
by this bolt, confirmed unchanged).

This is the Test stage's headline requirement, restated here as a design
constraint, not just a test-writing reminder: **the failure mode being
defended against is a raw HTTP response body containing another member's
score for a not-yet-kicked-off match** — a curl against the live capability
with two real test users (one predicts, the other requests the grid before
kickoff) is the only test that actually proves this, matching the task
brief's explicit "verify at the API-response level, not just the UI"
instruction. Recorded as ADR-038, including a permanent instruction that
any future change to this handler must re-run that same curl-level check,
not just its Jest-level unit test (Jest runs in one process and cannot
distinguish "value is null because the component chose not to render it"
from "value is null because the server never sent it" the way a raw HTTP
response body inspection can).

## 4. Mobile-side component tree & layering

```
src/domain/pools/                                   framework-free, additive to Bolt 7
  directed-invite-target.ts    NEW  (§2 model.md)
  ownership-transfer.ts        NEW  (§3 model.md)
  predictions-visibility.ts    NEW  (§5 model.md)
  pool.ts                      EXTENDED — + PoolPickerEntry

src/domain/predictions/                             framework-free, additive to Bolt 6
  pool-override.ts             NEW  (§6 model.md)

src/domain/auth/                                    framework-free, additive to Bolt 1-3
  account-deletion.ts          NEW  (§4 model.md)

src/platform/backend-api/
  pools-api.ts                 EXTENDED — + createDirectedInvite, getMyPoolsForPicker,
                                          transferOwnership, getOwnedPoolsForDeletion,
                                          getMemberPredictions
  predictions-api.ts           EXTENDED — + resetOverride; savePrediction's input type
                                          gains alsoSaveAsGlobal?: boolean
  auth-api.ts                  NEW  — first `auth.*` capability-group module beyond the
                                       original resendConfirmation-on-the-interface shape
                                       (Bolt 1); follows the now-dominant *-api.ts pattern
                                       every later bolt has used (profile/competition/
                                       predictions/pools) rather than growing
                                       BackendApiClient's own interface further.
                                       deleteAccount(input) → DeleteAccountResponse

src/host/predictions/
  components/
    prediction-match-card.tsx  EXTENDED — + inline PoolOverridePicker row (§5 below)
    pool-override-picker.tsx   NEW — chip row: "Global" + one chip per
                                PoolPickerEntry; no new native dependency
                                (plain Pressable row, same "small bounded
                                list, plain component, not FlashList"
                                precedent as ADR-014's avatar picker)
  hooks/
    use-predictions-query.ts   EXTENDED — + usePoolsForPickerQuery,
                                useResetOverrideMutation; useSavePredictionMutation's
                                invalidation extended (§6 below)

src/host/settings/
  screens/
    delete-account-screen.tsx  NEW — AUTH-6's confirm-phrase + pool-transfer UI
    account-settings-screen.tsx EXTENDED — + "Delete account" row (Account section)
  hooks/
    use-account-deletion-query.ts  NEW — useOwnedPoolsForDeletionQuery,
                                    useDeleteAccountMutation
  navigation/ (auth-stack-params.ts, screen-registry.ts — both in
               src/host/auth/navigation/, extended not moved)
    SettingsStackParamList       EXTENDED — + DeleteAccount: undefined
    SCREEN_REGISTRY               EXTENDED — + DeleteAccount: ['protected']

src/remotes/pools/
  screens/
    pool-detail-screen.tsx      EXTENDED — + DirectedInviteForm panel,
                                 + "Predictions" button navigating to PoolPredictions
    pool-settings-screen.tsx    EXTENDED — + "Transfer ownership" danger-zone section
    pool-predictions-screen.tsx NEW — POOLS-6's day-grouped member-prediction grid
  components/
    directed-invite-form.tsx    NEW — target input + submit, canInvite-gated (reuses
                                 Bolt 7's existing invite-permission.ts predicate)
    transfer-ownership-panel.tsx NEW — member picker (Pressable rows, reuses
                                 pool-member-row.tsx's row shape) + confirm
    prediction-grid-day-section.tsx  NEW — one day's FlashList section (matches ×
                                 members), reuses src/domain/competition's
                                 day-key/day-label pure functions
    prediction-grid-cell.tsx    NEW — one member's cell for one match (masked /
                                 preJoin-free / editable-if-viewer states)
    pool-score-stepper.tsx      NEW — small, deliberately duplicated score input
                                 (§2.3 — not imported from src/host/predictions/)
  hooks/
    use-pools-query.ts          EXTENDED — + useMyPoolsForPickerQuery (actually only
                                 needed remote-side if the grid itself offers a picker;
                                 §5 clarifies this lives host-side instead — see note)
    use-pool-predictions-query.ts NEW — usePoolMemberPredictionsQuery(poolId)
```

**Note on `useMyPoolsForPickerQuery` placement**: only the **host**
predictions screen needs the pool picker (§1.3/§5) — the pools remote's own
grid already knows which pool it's showing (it's the screen's route param)
and never needs a picker. `useMyPoolsForPickerQuery` therefore lives in
`src/host/predictions/hooks/use-predictions-query.ts`, not in the `pools`
remote at all — struck from the remote's file list above; kept here as an
explicit correction so a future reader doesn't wonder why it's missing.

No `src/shared/pools/` or `src/shared/predictions/` tier introduced (§1/§2
above, ADR-036/ADR-037).

## 5. Predictions-screen integration — exact interaction (PREDICTIONS-3/4)

`PredictionMatchCard` (host) gains, below the existing score inputs and
above the save button:

1. `usePoolsForPickerQuery()` result rendered as a `PoolOverridePicker` —
   hidden entirely if the viewer belongs to zero pools (no new UI clutter
   for the common case). Default selection: `null` (global, Bolt 6's
   existing unchanged behavior).
2. Selecting a pool chip switches the card's local draft state
   (`homeScore`/`awayScore`/`penaltyWinner`) to that pool's existing
   override if one exists (read from the same `MyPrediction[]` the card
   already has via `row` — Bolt 6's join already includes pool-scoped rows
   in `predictionsApi.getMyPredictions()`'s response, just previously
   filtered out client-side in `useMatchesWithMyPredictions`'s global-only
   filter; this bolt adds a second, pool-aware lookup map alongside the
   existing global one, not a new query), or to the current **global**
   values as a starting point if no override exists yet for that pool
   (matches `betmeet-clone`'s `handleStartEdit` pre-fill behavior exactly).
3. `shouldOfferDualSave(existing)` (Model §6) decides whether a "Also save
   as my global prediction" checkbox appears — only when the selected pool
   has neither a global nor a pool override yet for this match.
4. Save button's `onSave` payload includes the selected `poolId` and, when
   the checkbox is checked, `alsoSaveAsGlobal: true`.
5. When an override already exists for the selected pool (`isOverride &&
   hasGlobal`, Model §5/§8's cell shape — reusing the exact same nullable
   fields already present in `MyPrediction`, no new type needed for this
   check since it's the caller's own row, never masked), a small "Use
   global prediction" text button appears, calling
   `useResetOverrideMutation()`.

This keeps `PredictionMatchCard` a single component (no new screen, no new
route) — consistent with Bolt 6's precedent that per-row edit state is
local and ephemeral, now extended to also carry "which scope am I editing"
as local state, not lifted to Zustand or a query (single-owner,
single-consumer, same ADR-020/ADR-025 reasoning).

## 6. State boundaries (TanStack Query + Zustand)

| State | Owner | Mechanism |
|---|---|---|
| Viewer's pools for the override picker | host (`predictions`) | `usePoolsForPickerQuery()` — `['pools', 'forPicker']`, flat key, own cache slice separate from `['pools','mine']` (different DTO shape, different invalidation cadence — pool membership changes are rare relative to prediction saves) |
| Pool member-prediction grid | `pools` remote | `usePoolMemberPredictionsQuery(poolId)` — `['pools', 'memberPredictions', poolId]` |
| Owned-pools-needing-transfer (delete-account modal) | host (`settings`) | `useOwnedPoolsForDeletionQuery()` — `['pools', 'ownedForDeletion']`, only fetched while the delete-account screen is mounted (`enabled` gate, same pattern `usePoolDetailQuery` already uses for its `poolId.length > 0` gate) |
| Directed-invite / transfer-ownership / reset-override mutations | `pools` remote / host | `useMutation`, each invalidating its own relevant key(s) — `pools.createDirectedInvite` invalidates nothing observable client-side (no list shows pending invites in this bolt's scope, §model.md §10); `pools.transferOwnership` invalidates `['pools','detail',poolId]` and `['pools','mine']`; `predictions.resetOverride` invalidates `MY_PREDICTIONS_QUERY_KEY` **and** broadly invalidates the `['pools','memberPredictions']` key prefix (see next row) |
| Cross-bundle invalidation for the dual-save / reset-override mutations | shared `QueryClient` (ADR-034's MF singleton) | `useSavePredictionMutation`/`useResetOverrideMutation` (host-owned hooks) call `queryClient.invalidateQueries({ queryKey: ['pools', 'memberPredictions'] })` (a **partial**-key prefix invalidation, matching every mounted `usePoolMemberPredictionsQuery(poolId)` regardless of which pool) whenever the mutation's variables include a non-null `poolId` — this works today, without any new cross-bundle import, purely because `@tanstack/react-query` is already a Module-Federation-shared singleton (ADR-034): the host and the `pools` remote share the exact same `QueryClient` instance, so a plain string-array key convention is sufficient coordination, the same way the `capability` string names themselves are a shared-by-convention contract with zero import coupling |
| Delete-account confirm-phrase, per-pool successor selections | host (`settings`) | Local `useState` in `delete-account-screen.tsx` — single-owner, single-screen, discarded on unmount, same category as every prior confirm-modal's local state |
| Pool-override picker's "which pool is selected" (per card) | host (`predictions`) | Local `useState` inside `PredictionMatchCard`, alongside the existing draft score state (§5) |

No new Zustand store. Every new piece of state is either server state
(TanStack Query) or genuinely single-owner ephemeral UI state.

## 7. Navigation changes

- `SettingsStackParamList` (`src/host/auth/navigation/auth-stack-params.ts`)
  gains `DeleteAccount: undefined`; `SCREEN_REGISTRY` gains
  `DeleteAccount: ['protected']` — same tag as every other Settings row,
  no new guard branch (AUTH-6's forced-sign-out-on-success is handled by
  the existing guard reacting to a cleared session, Model §4, not a new
  screen class).
- `PoolsStackParamList` (`src/remotes/pools/navigation/pools-stack-params.ts`)
  gains exactly one new route: `PoolPredictions: { poolId: string }`.
  Directed-invite and transfer-ownership are **not** new routes — both
  ship as inline panels/sections on `PoolDetailScreen`/`PoolSettingsScreen`
  respectively (§4), matching the existing `InviteTokenPanel` pattern
  rather than growing the remote's internal stack for what are single-form
  interactions.
- `PoolDetailScreen` gains a new "Predictions" button (visible to any
  member, not owner-gated) navigating to `PoolPredictions`, alongside the
  existing settings/leave/archive buttons.
- `AppStackParamList` is **unchanged** — no new host-level route.

## 8. `pools-api.ts` / `predictions-api.ts` / `auth-api.ts` — new capability wrappers

Same seam pattern as every prior `*-api.ts` (typed wrapper around
`BackendApiClient.request()`, discriminated-union response types matching
§3's table):

```ts
// pools-api.ts additions
poolsApi.createDirectedInvite(input: { poolId; target }): Promise<CreateDirectedInviteResponse>
poolsApi.getMyPoolsForPicker(): Promise<PoolPickerEntry[]>
poolsApi.transferOwnership(input: { poolId; newOwnerId }): Promise<TransferOwnershipResponse>
poolsApi.getOwnedPoolsForDeletion(): Promise<OwnedPoolTransfer[]>
poolsApi.getMemberPredictions(poolId: string): Promise<PoolMemberPredictionsResponse>

// predictions-api.ts additions
predictionsApi.resetOverride(input: { matchId; poolId }): Promise<ResetOverrideResponse>
// SavePredictionInput gains: alsoSaveAsGlobal?: boolean

// auth-api.ts (new file)
authApi.deleteAccount(input: { poolOwnershipAssignments: { poolId; newOwnerId }[] }): Promise<DeleteAccountResponse>
```

## 9. Performance / bundle-size considerations

- **No new native dependency** — the pool-override picker and the
  transfer-ownership target picker are both plain `Pressable` rows (small,
  bounded lists: a user's own pool memberships, a single pool's member
  list), same "plain component, not FlashList" precedent as ADR-014.
  `@react-native-clipboard/clipboard`'s deferral (Bolt 7) is unaffected —
  this bolt introduces no new copy-to-clipboard surface.
- **`PoolPredictionsScreen`'s grid is the one genuinely list-heavy new
  surface** — `FlashList` (already an MF-shared singleton per ADR-034, no
  new shared-config entry needed), day-grouped exactly like Bolt 5's
  fixture list, `React.memo`-wrapped cell/row components, stable
  `keyExtractor`/`renderItem` (`vercel-react-native-skills` discipline,
  same as every prior list in this repo).
- **`PredictionMatchCard`'s new picker must not regress Bolt 6's per-row
  isolation guarantee** — the pool-picker selection state is local to each
  card (§5/§6), so selecting a pool override on one match's card still
  never re-renders sibling cards, preserving ADR-025's "typing in one row
  never re-renders sibling rows" property extended to "picking a pool in
  one row never re-renders sibling rows" too.
- **No rspack/MF config changes** — no new remote, no new shared-singleton
  dependency (FlashList and TanStack Query are already shared per
  ADR-022/ADR-034).

## 10. Testing approach preview

- **Domain** (framework-free, Jest): `directed-invite-target.ts`,
  `ownership-transfer.ts`, `predictions-visibility.ts`,
  `account-deletion.ts`, `pool-override.ts` — pure-function unit tests,
  same style as every prior domain module.
- **Backend Layer 1 (real, per ADR-030)**: booted server + throwaway
  Supabase test users, curl-level verification of every new/extended
  capability, **specifically including**:
  - The anti-bias masking API-response-level check (§3.2) — two real
    users, one predicts on a not-yet-kicked-off match, the other requests
    `pools.getMemberPredictions` and the raw JSON body is asserted to
    contain `null`/`false` in exactly the fields Model §5 lists, not just
    "the UI doesn't show it."
  - Dual-save's all-or-nothing property under a genuine failure path (not
    just happy path) — §3.1's note on how this is actually exercised
    without a fault-injection hook.
  - Account deletion's all-or-nothing property when a required assignment
    is missing — assert the pool's `ownerId` is unchanged and the profile
    is **not** soft-deleted after a rejected `MISSING_ASSIGNMENT` request.
  - Ownership transfer (standalone) success + `NOT_OWNER`/`INVALID_TARGET`
    rejection paths.
- **Component tests** (React Native Testing Library): `PoolOverridePicker`,
  `DirectedInviteForm`, `TransferOwnershipPanel`, `DeleteAccountScreen`,
  `PoolPredictionsScreen`'s masked-cell rendering (query by role, not
  testID, per the skill's guidance; `userEvent` for interaction).
- **Layer 2 (device)**: per the task instructions, **not run by this
  agent** — the user performs manual device verification. Test paths are
  documented in `implement-and-test.md` for that manual pass.

## 11. ADRs this stage produces

- **ADR-036**: ADR-032 re-examination — confirmed, no change to `pools`
  remote placement (§1).
- **ADR-037**: ADR-024 re-examination — confirmed, predictions' host-only
  tier stays host-only; POOLS-6 gets its own small remote-owned components,
  one ~40-line score-stepper deliberately duplicated rather than promoted
  (§2).
- **ADR-038**: anti-bias masking is computed exclusively server-side in
  `pools.getMemberPredictions`, with a permanent instruction that any
  future change to that handler must be re-verified at the raw
  API-response level, not just via its Jest unit test (§3.2).
- **ADR-039**: dual-save (`predictions.save`) and account deletion's
  per-pool transfer-or-delete batch (`auth.deleteAccount`) both use
  `prisma.$transaction` as the atomicity boundary — no app-level
  compensating writes, extending ADR-035's "DB transaction as the real
  guard" pattern from pools' capacity/name-uniqueness races to a second
  category of risk (multi-row all-or-nothing correctness, not a
  concurrency race).
- **ADR-040**: ownership transfer ships as two capabilities
  (`pools.transferOwnership` for the new, mobile-specific standalone
  affordance; `auth.deleteAccount`'s internal batch logic for the
  mandatory reassign-or-delete-during-deletion path) sharing one backend
  service function — records the technical shape of the Model stage's
  already-approved product decision (standalone transfer, a deliberate
  deviation from `betmeet-clone`), not the business-rule decision itself.
