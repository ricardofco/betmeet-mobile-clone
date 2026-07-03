# Bolt 8 — Model

This bolt covers **POOLS-3** (directed invites by nickname/email), **POOLS-6**
(pool predictions grid + anti-bias masking), **POOLS-7** (ownership
transfer), **PREDICTIONS-3** (pool-scoped override + atomic dual-save),
**PREDICTIONS-4** (reset a pool override back to the global prediction), and
**AUTH-6** (account deletion, sequenced here because its acceptance
criteria need POOLS-7's transfer capability first). Source: `bolt-plan.md`'s
Bolt 8 section, cross-referenced against `domain-overview.md §5.1/§5.3/§5.4`
and — since `memory-bank/intents/liga-mundial-mobile-migration/units/` is
still not present in this repo (same gap Bolt 5/6/7 hit, resolved the same
way each time) — against `betmeet-clone`'s actual, real source code for
every business rule this bolt touches:
`src/features/pools/actions/create-directed-invite.ts`,
`src/features/pools/services/account-deletion.ts`,
`src/features/pools/actions/load-owned-pools-for-deletion.ts`,
`src/features/auth/actions/delete-account.ts`,
`src/features/pools/queries.ts` (`getPoolMemberPredictions` — the
anti-bias masking source of truth), `src/features/pools/components/
pool-predictions-view.tsx` / `pool-predictions-view-helpers.ts`,
`src/features/predictions/actions/save-prediction.ts`, and
`src/features/predictions/actions/reset-prediction-override.ts`. Per the
task brief and this repo's standing rule (`feedback_spec_conflicts`),
disagreements between memory-bank docs are resolved against this real code,
not by picking a doc.

**One deliberate mobile-specific deviation from `betmeet-clone`, flagged
up front**: in the web app, ownership transfer (POOLS-7) exists **only**
as a side-effect of account deletion (`transferOwnedPoolsForAccountDeletion`)
— there is no standalone "transfer ownership" UI anywhere in
`betmeet-clone`. This repo's own bolt-plan and Bolt 7's `model.md`/
`design.md` (§10, §2.2) both treat POOLS-7 as its **own** story, and
Bolt 7's `pool-settings-screen.tsx` explicitly says *"there is no
ownership-transfer escape hatch here (Bolt 8/POOLS-7)"* in a way that reads
as "add one" (a settings-screen affordance), not "add it only inside
deletion." This bolt therefore ships **two** transfer paths: (1) a
voluntary, standalone "Transfer ownership" action in Pool Settings (new,
mobile-only — no `betmeet-clone` equivalent, a reasonable product
improvement, not a fidelity break since it's additive, not a rule change),
and (2) the mandatory reassign-or-delete flow inside account deletion
(faithful port of `transferOwnedPoolsForAccountDeletion`). Both share the
same underlying ownership-transfer domain predicate.

## 1. Ubiquitous language

| Term | Meaning |
|---|---|
| **Directed invite** | An invitation targeted at one specific person (by `nickname#NNNN` or email), as opposed to POOLS-1/2's untargeted, shareable invite token. Stored as a `PoolDirectedInvite` row, `status: PENDING` on creation. |
| **Target** | The raw string a member types to direct an invite — either `base#NNNN` (nickname + 4-digit discriminator) or an email address. Parsed, never guessed: a string containing `@` is treated as an email; otherwise it must match `base#NNNN` or the invite is rejected as unresolvable. |
| **Anti-bias masking** | The rule that another pool member's prediction for a given match is invisible (fields nulled, not just visually hidden) until that match's kickoff has passed. The viewer's own prediction is never masked. This is a **server-response-level** guarantee, not a UI-level one — the exact distinction the task brief calls out as the one privacy-critical risk in this bolt. |
| **Global prediction** | A `Prediction` row with `poolId = null` — the user's one prediction for a match, used by every pool's leaderboard unless overridden. |
| **Pool override** | A `Prediction` row with `poolId` set to a specific pool — takes precedence over the global prediction for that pool's leaderboard/grid only. |
| **Dual-save** | Saving a pool override **and** the global prediction in one atomic request (`alsoSaveAsGlobal: true`) — used when the user has no global prediction yet for that match and wants both written together, all-or-nothing. |
| **Reset override** | Deleting a pool override row, reverting the member's prediction in that pool's view back to whatever their global prediction is (or "no prediction" if they have none). |
| **Ownership transfer** | Reassigning `Pool.ownerId` to another current member. The outgoing owner's membership row is removed as part of the same operation (an owner can't become a regular "past owner" member — they either stay owner or leave entirely, matching `betmeet-clone`'s `transferOwnedPoolsForAccountDeletion`, which always deletes the departing owner's membership row after reassigning). |
| **Account deletion** | A two-step, irreversible workflow: (1) every pool the user owns is either transferred (owner picks a successor from current members) or deleted outright (if it has no other members), (2) the `Profile` is soft-deleted (nickname released) and the Supabase auth user is hard-deleted. A soft-deleted account can never sign in again. |

## 2. Directed invites (POOLS-3)

Ground truth: `create-directed-invite.ts` + `domain-overview.md §5.3`.

- **Target resolution** — two shapes, parsed client-side for fast
  validation, resolved server-side (needs a DB read either way):
  - Contains `@` → treated as an email. Server looks up a matching
    confirmed profile by email (case-insensitive); if none exists, the
    invite is still created but stores a **privacy-preserving SHA-256 hash**
    of the normalized email (`invitedEmailHash`), never the raw email,
    for a later signup to resolve (out of this bolt's scope to actually
    resolve on signup — that reconciliation isn't built anywhere in
    `betmeet-clone` either, it's a documented "presumably resolved later"
    gap per `domain-overview.md §5.3`, faithfully carried over, not
    invented).
  - Otherwise → must match `base#NNNN` (base = nickname base, `NNNN` = the
    4-digit discriminator). Server resolves to a `Profile` by
    case-insensitive base + exact discriminator match, excluding
    soft-deleted profiles (`deletedAt: null`).
  - Neither shape resolves to a real user **and** it's not an email format
    either → `VALIDATION_FAILED` (mirrors `betmeet-clone`'s "no encontramos
    un usuario" error, generalized to a stable error code).
  - Resolves to the inviter themself → `SELF_INVITE` (`betmeet-clone`:
    *"No puedes invitarte a ti mismo"*).
- **Permission gate** (reuses POOLS-2's `canInvite` rule, now enforced as a
  real write-capability gate, not just UI-affordance gating like Bolt 7):
  owner always allowed; PUBLIC-pool member always allowed (no toggle);
  PRIVATE-pool non-owner member allowed only if `pool.membersCanInvite`.
  Not a member at all → `NOT_MEMBER`.
- **Idempotent re-invite**: inviting the same resolved user to the same
  pool a second time **upserts** the existing `PoolDirectedInvite` row back
  to `PENDING` (mirrors `betmeet-clone`'s `upsert` on
  `poolId_invitedUserId`) rather than erroring or creating a duplicate.
  Email-hash-only invites (no resolved user) always `create` a new row —
  there's no unique constraint to upsert against for those (the schema's
  `@@unique([poolId, invitedUserId])` doesn't apply when `invitedUserId`
  is null).
- **Notification queuing is explicitly out of scope for this bolt** — see
  §9. `domain-overview.md §5.3`/§7 note a directed invite queues a
  `POOL_INVITE` notification event, but this repo's notification
  *delivery* infrastructure (Bolt 10) doesn't exist yet; queuing an inert
  `notification_events` row that nothing will ever process would be
  premature plumbing, not a faithful port of a working feature.
- **Nickname search/typeahead** (`betmeet-clone`'s `searchNicknames` +
  `directed-invite-form.tsx`'s debounced dropdown) is **explicitly out of
  scope** — see §9. The core AC (target a specific user, get a real
  privacy-relevant permission/resolution outcome) doesn't need it; it's a
  UX-polish layer on top, isolated to one future follow-up component.

`src/domain/pools/directed-invite-target.ts` (new):
```
type ParsedInviteTarget =
  | { kind: 'email'; email: string }
  | { kind: 'nickname'; base: string; discriminator: string }
  | { kind: 'unresolvable'; raw: string };

parseInviteTarget(raw: string): ParsedInviteTarget
isPlausibleInviteTarget(raw: string): boolean   // 3–120 chars trimmed, mirrors CreateDirectedInviteSchema's bounds
```
This is a **format-only** parser — it never claims a nickname/email
actually exists (that needs the DB). Actual resolution, the permission
gate, the self-invite check, and the upsert-vs-create branch are
backend-only, same "advisory client, authoritative server" split every
prior pools rule uses (ADR-023/ADR-035 precedent).

## 3. Ownership transfer (POOLS-7)

- **Standalone transfer** (new mobile affordance, Pool Settings):
  owner-only (`canTransferOwnership` = `isOwner`), target must be a
  **current member who is not already the owner**. On success: `ownerId`
  reassigned, the outgoing owner's `PoolMembership` row is **removed**
  (they are no longer a member at all — matches the deletion-flow
  precedent of "transfer always drops the old owner's membership," applied
  consistently here so the two transfer paths behave identically, not as
  two different rules).
- **No candidate available** (pool has no other members): the standalone
  transfer action is simply not offered (the UI hides/disables it) — there
  is nothing to validate server-side for this case since the UI never
  sends the request; the owner's only options remain "invite someone
  first" or "delete the pool."
- Reuses the exact same underlying reassignment logic the account-deletion
  flow's per-pool transfer step uses (§4) — one backend service function,
  two capabilities calling into it (a single-pool synchronous call for the
  standalone case; an all-owned-pools transactional loop for deletion).

`src/domain/pools/ownership-transfer.ts` (new):
```
type MemberForTransfer = { userId: string; isOwner: boolean };
isValidTransferTarget(candidateUserId: string, viewerId: string, members: MemberForTransfer[]): boolean
  // candidate exists in members, candidate is not already the owner, candidate !== current owner id
```

## 4. Account deletion (AUTH-6)

Ground truth: `delete-account.ts` + `account-deletion.ts` +
`load-owned-pools-for-deletion.ts` + `domain-overview.md §5.1`/`§6`.

Two-step, irreversible:
1. **Reassign or delete every pool the user owns**, in one transaction:
   - Pool has ≥1 other member → the deleting user **must** pick a
     successor from that pool's current members before deletion can
     proceed (client-side gate: `allOwnersAssigned`, §4's data shape).
     Submitting without a required assignment is rejected server-side too
     (`MISSING_ASSIGNMENT`), not just client-validated — the deletion
     capability re-derives "which pools need an assignment" itself rather
     than trusting the client's `poolOwnershipAssignments` payload blindly
     (mirrors `betmeet-clone`'s `transferOwnedPoolsForAccountDeletion`,
     which recomputes `getOwnedPoolsNeedingTransfer` server-side and
     throws `MISSING_ASSIGNMENT:<poolId>` for any pool without a valid
     assignment in the map).
   - Pool has zero other members → deleted outright, no assignment needed.
   - The user's **remaining** (non-owner) pool memberships are also
     removed as part of the same transaction.
   - **All-or-nothing**: if any pool in the batch is missing a required
     assignment, or a DB write fails, the **entire transaction rolls
     back** — no partial transfer, no partially-deleted account. This is
     the task brief's named data-integrity risk; the failure-path test
     (submit deletion with a pool intentionally missing its assignment,
     assert the pool's `ownerId` is unchanged and the profile is **not**
     soft-deleted) is as important as the happy path.
2. **Soft-delete the `Profile`** (`deletedAt` set, `nicknameBase`/
   `nicknameDiscriminator` nulled to release the nickname — the unique
   index doesn't consider `deletedAt`, so leaving the old values in place
   would permanently block that `base#NNNN` combination) **and
   hard-delete the Supabase auth user** via the Admin API, in that order —
   if the hard-delete fails, the soft-delete has already happened (this
   matches `betmeet-clone`'s own ordering and its own accepted risk: a
   soft-deleted-but-not-yet-hard-deleted profile is treated as
   "effectively gone" by every sign-in/session check regardless, so this
   isn't a new correctness gap introduced by this port).
- **Confirmation phrase** gate (`"delete my account"`, typed exactly) is a
  client-side-only UX safety rail — not a security boundary, not
  re-validated server-side (matches `betmeet-clone`; the real
  authorization boundary is the bearer JWT identifying which account is
  being deleted, not the typed phrase).
- **Forced sign-out after success**: the mobile client calls
  `SupabaseAdapter.signOut()` itself immediately after a successful
  `{ok:true}` response (mirrors `betmeet-clone`'s explicit
  `supabase.auth.signOut()` right after `deleteAccount` succeeds — a
  hard-deleted auth user's existing access token is still
  cryptographically valid until its own expiry, so an explicit client-side
  sign-out is not redundant, it's the only thing that actually clears the
  now-stale local session before the JWT would otherwise naturally
  expire). `AuthGatedNavigator`'s existing guard (AUTH-7, Bolt 1) then
  reacts to the now-null session exactly like any other sign-out — no new
  guard branch needed. This also covers the `account_deleted` claim path
  the guard already has (`domain-overview.md §6` rule 1) for the edge case
  of a *different* device/session for the same account still holding a
  live token after deletion.

`src/domain/auth/account-deletion.ts` (new):
```
type OwnedPoolTransfer = { poolId: string; poolName: string; candidates: { userId: string; nickname: string | null }[] };
type OwnershipAssignment = { poolId: string; newOwnerId: string };

poolsNeedingAssignment(owned: OwnedPoolTransfer[]): OwnedPoolTransfer[]   // candidates.length > 0
poolsToBeDeleted(owned: OwnedPoolTransfer[]): OwnedPoolTransfer[]        // candidates.length === 0
allOwnersAssigned(owned: OwnedPoolTransfer[], assignments: OwnershipAssignment[]): boolean
  // every pool in poolsNeedingAssignment(owned) has a matching, valid entry in assignments

export const DELETE_ACCOUNT_CONFIRM_PHRASE = 'delete my account';
```
All four functions are pure and framework-free — same tier as the rest of
`src/domain/auth/` (ADR-003 precedent: domain classifies/validates, the
platform layer calls the SDK/API and hands off).

## 5. Predictions grid + anti-bias masking (POOLS-6)

Ground truth: `queries.ts`'s `getPoolMemberPredictions` (the actual masking
implementation) + `pool-predictions-view-helpers.ts` + `domain-overview.md
§5.3`: *"A league's member list shows another member's prediction for a
match only after that match has kicked off (anti-bias) — the viewer always
sees their own immediately."*

- **The masking rule, precisely** (from the real query, not paraphrased):
  ```
  started = match.kickoffAt != null && match.kickoffAt <= now
  hidden  = row.userId !== viewerUserId && !started
  ```
  A match with no kickoff time yet (`kickoffAt === null`) is **never**
  "started," so every other member's prediction for it stays masked
  indefinitely until a kickoff time is assigned and passes — this is not
  an edge case to special-case away, it's the correct behavior falling
  naturally out of the rule as written.
- **What gets nulled when `hidden` is true** — not just "not rendered,"
  actually absent from the response payload the server sends:
  `predictedHome`, `predictedAway`, `totalPoints`, `matchedCase` all become
  `null`; `isOverride` becomes `false`; `hasGlobal` becomes `false`. The
  row's *identity* fields (`userId`, `nickname`, `matchId`, `kickoffAt`,
  match metadata) are never masked — only the prediction content and its
  derived scoring/override metadata. This exact field list is what the
  API-response-level verification (Test stage) checks for, per the task
  brief's explicit instruction to verify this "at the API-response level,
  not just the UI."
- **The viewer's own row is never masked**, regardless of kickoff — they
  always see and can edit their own prediction (their edit affordance is
  gated separately, by the kickoff-lock rule PREDICTIONS-1 already
  established, not by this masking rule).
- **Scoring fields will read as `null` for every row right now** —
  `totalPoints`/`matchedCase` come from `prediction_scores`, a table
  nothing in this repo populates yet (no admin-force-result flow, no
  provider-sync scoring sweep — both are Bolt 9/12 scope). The DTO shape
  includes these fields for forward compatibility (so Bolt 9 doesn't need
  to widen the response again), but this bolt's own tests only assert
  "null because masked" vs. "null because unscored" are distinguishable
  where it matters (masked also forces `isOverride`/`hasGlobal` false;
  unscored-but-visible leaves those as their real values).
- **Not in scope for this bolt**: the "pre-join" rule (`domain-overview.md
  §5.3`'s *"a pool's leaderboard only counts a member's points for matches
  whose kickoff is after they joined"*) — that's a **leaderboard**
  computation concern (Bolt 9), not a masking/privacy concern. This bolt's
  grid does not attempt to distinguish "no prediction because not in the
  pool yet" from "no prediction at all" — both simply render as "no
  prediction," which is truthful and not privacy-sensitive either way.

`src/domain/pools/predictions-visibility.ts` (new — a duplicate, advisory
mirror of the backend's authoritative rule, same category of intentional
duplication ADR-016's checklist item 3 already accepts for
`invite-token.ts`/`pool-invite-token.ts`, and `prediction-eligibility.ts`
already accepts across the same mobile/backend runtime boundary):
```
type MatchForVisibility = { kickoffAt: string | null };
isMemberPredictionVisible(match: MatchForVisibility, now: string, rowUserId: string, viewerUserId: string): boolean
```
This mobile-side copy is used **only** for a defense-in-depth UI check and
for the copy shown in a masked cell ("Hidden until kickoff") — it is
**never** the reason a value is or isn't visible; by the time a response
reaches the client, a masked cell's numeric fields are already `null`.
This is called out explicitly because it is the single highest-consequence
distinction in this entire bolt: an implementation that "hides" a value
only by not *rendering* a real number the server already sent would be a
genuine privacy bug even if the UI looked identical.

## 6. Pool-scoped prediction override + dual-save (PREDICTIONS-3)

Ground truth: `save-prediction.ts` + `domain-overview.md §5.4`: *"A
pool-scoped prediction ('override') and a global prediction can be saved
together atomically in one request."*

- A prediction is uniquely identified by `(userId, matchId, poolId)` —
  `poolId: null` is the global slot, any other pool id is that pool's
  override slot. These are genuinely separate rows (DB-enforced via the
  two partial unique indexes already in `schema.prisma`:
  `predictions_user_match_global_uk` where `pool_id IS NULL`,
  `predictions_user_match_pool_uk` where `pool_id IS NOT NULL`) — Bolt 6
  already shaped `SavePredictionInput`/`MyPrediction` to carry `poolId`
  for exactly this reason (`activeContext.md`'s standing note), so no type
  widening is needed here, only new call sites that populate it.
- **Regular pool-scoped save** (`poolId` set, `alsoSaveAsGlobal` absent or
  `false`): writes/updates only the override row. The global prediction,
  if any, is untouched.
- **Dual-save** (`poolId` set, `alsoSaveAsGlobal: true`): writes the global
  row **and** the override row in one DB transaction — both succeed or
  neither does. `betmeet-clone`'s own comment on this is exact and worth
  quoting since it's the spec: *"Dual-save atómico: la global y el
  override del pool, todo o nada. Si la segunda escritura falla, la
  transacción revierte también la global."* The failure-path test this
  bolt must have (per the task brief): force the second write to fail
  (e.g. a locked/invalid state introduced between the two upserts isn't
  reproducible via normal input, so the test exercises this at the
  handler level by asserting the transaction wrapper — see
  `implement-and-test.md` for how this is actually exercised without a
  fault-injection hook, since Prisma's `$transaction` already gives an
  all-or-nothing guarantee for free once both writes are inside it; the
  test proves *that property*, not a contrived mid-transaction crash).
- **When is dual-save offered, not just always-on?** Read literally from
  `betmeet-clone`'s UI: only when the user has **neither** a global **nor**
  an override prediction yet for that match in that pool (`hasPrediction`
  false in the grid cell). If a global prediction already exists and the
  user is only adding/editing a pool override, it's a **regular**
  pool-scoped save (no `alsoSaveAsGlobal`) — the existing global is left
  exactly as-is. Mobile mirrors this exact condition, not a simplified
  "always show a dual-save toggle" version, since offering to silently
  overwrite an existing global prediction the user didn't ask to change
  would be a real behavior regression, not a simplification.
- **Same eligibility/validation rules as PREDICTIONS-1/2 apply per scope**:
  the server re-checks kickoff-lock and score-bounds/penalty-winner
  validation independently for whichever row(s) are being written — this
  bolt does not introduce new validation rules, it reuses
  `isMatchEditable`/`validateScoreBounds`/`validatePenaltyWinnerRule`
  (backend) and `getPredictionEligibility`/`validatePredictionEntry`
  (mobile domain), unchanged, against a `poolId`-aware existing-row lookup.
- **Not a membership bypass**: saving a pool override requires the viewer
  to actually be a member of that pool (`NOT_MEMBER` otherwise) — checked
  server-side regardless of what the mobile UI's pool-picker offers (the
  picker only ever lists pools `pools.getMyPoolsForPicker` returns, which
  is already scoped to the viewer's own memberships, but this is still not
  trusted as the authorization boundary — same "advisory client,
  authoritative server" discipline as every other pools rule).

`src/domain/predictions/pool-override.ts` (new):
```
type ExistingPredictionsForMatch = { hasGlobal: boolean; hasOverride: boolean };
shouldOfferDualSave(existing: ExistingPredictionsForMatch): boolean   // !hasGlobal && !hasOverride
```
This is the only new pure predicate PREDICTIONS-3 needs — everything else
(score bounds, penalty-winner rule, kickoff eligibility) is Bolt 6's
existing `src/domain/predictions/` module, reused unchanged.

## 7. Reset override (PREDICTIONS-4)

Ground truth: `reset-prediction-override.ts` + `domain-overview.md §5.4`:
*"Resetting a pool override deletes only that override row, reverting the
member to their global prediction for that match in that pool's view."*

- Deletes the `(userId, matchId, poolId)` row where `poolId` is the
  specific pool — the global row (`poolId: null`), if any, is untouched
  and becomes what's shown/used for that pool going forward (or "no
  prediction" if there was never a global one either).
- Requires membership in the pool (`NOT_MEMBER` otherwise) — same
  server-side check as save.
- **Idempotent-safe**: deleting a row that doesn't exist (already reset,
  or never had an override) is not an error — `deleteMany` naturally
  no-ops, matching `betmeet-clone`'s own implementation (`prisma.
  prediction.deleteMany`, not `delete`, specifically so a second reset
  click / a race with another device doesn't throw).
- **No kickoff-lock check on reset itself** — resetting doesn't touch
  scores, it just removes an override row; `betmeet-clone`'s
  `resetPredictionOverride` never calls `isMatchEditable`. This is
  deliberate, not an oversight (a user should always be able to fall back
  to their global prediction, even post-kickoff, since the override row
  being deleted was itself locked/immutable already if the match started
  — deleting a locked override doesn't un-lock anything, it just removes
  which value was being used for that pool's view).

No new domain function needed — "can this override be reset" reduces to
"does an override row exist for this match+pool," which is already visible
data (`MyPrediction[]` from Bolt 6, filtered by `poolId`), not a rule.

## 8. Data shapes

`src/domain/pools/pool.ts` — additive changes only, no breaking change to
Bolt 7's existing exports:
```ts
// existing types (Pool, PoolMembership, PoolMember, PoolSummary, PoolVisibility) unchanged
export type PoolPickerEntry = { id: string; name: string };
```

`src/domain/pools/directed-invite-target.ts` (new, §2):
```ts
export type ParsedInviteTarget =
  | { kind: 'email'; email: string }
  | { kind: 'nickname'; base: string; discriminator: string }
  | { kind: 'unresolvable'; raw: string };
```

`src/domain/pools/ownership-transfer.ts` (new, §3):
```ts
export type MemberForTransfer = { userId: string; isOwner: boolean };
```

`src/domain/auth/account-deletion.ts` (new, §4):
```ts
export type OwnedPoolTransfer = {
  poolId: string;
  poolName: string;
  candidates: { userId: string; nickname: string | null }[];
};
export type OwnershipAssignment = { poolId: string; newOwnerId: string };
```

`src/domain/pools/predictions-visibility.ts` (new, §5):
```ts
export type MatchForVisibility = { kickoffAt: string | null };
```

Backend response DTO for the predictions grid (`pools.getMemberPredictions`,
new capability — design.md finalizes the exact wire shape):
```ts
type PoolMemberPredictionCell = {
  matchId: string;
  userId: string;
  predictedHome: number | null;   // null if unscored-but-empty OR masked
  predictedAway: number | null;
  totalPoints: number | null;     // always null today — see §5
  matchedCase: 'EXACT' | 'RESULT' | 'PARTIAL' | 'MISS' | null;
  isOverride: boolean;            // forced false when hidden
  hasGlobal: boolean;             // forced false when hidden
  hidden: boolean;                // true only for other members, pre-kickoff
};
```

`src/domain/predictions/pool-override.ts` (new, §6):
```ts
export type ExistingPredictionsForMatch = { hasGlobal: boolean; hasOverride: boolean };
```

## 9. ADR-016 duplicate-detection checklist (applied here)

Per ADR-016's three-item code-review gate:
1. No local re-derivation of `ScoringRuleSet`/`computeScore` — this bolt's
   `totalPoints`/`matchedCase` fields are **read-only passthroughs** of
   whatever `prediction_scores` already contains (currently always empty),
   never recomputed here.
2. No local re-implementation of `getPredictionEligibility`/kickoff-lock —
   PREDICTIONS-3/4 reuse Bolt 6's existing eligibility check unchanged; the
   backend reuses `isMatchEditable`/`validateScoreBounds`/
   `validatePenaltyWinnerRule` from `prediction-eligibility.ts` unchanged.
3. The anti-bias masking predicate (§5) and the invite-target parsing
   shape (§2) are each defined **once** on the mobile side
   (`src/domain/pools/predictions-visibility.ts`,
   `src/domain/pools/directed-invite-target.ts`) and **once**, independently
   authored, on the backend (same accepted cross-runtime duplication
   category as `pool-permissions.ts`/`prediction-eligibility.ts` already
   established — not a new precedent).

## 10. Explicitly out of scope (this bolt)

- Accepting/revoking a directed invite as its own tracked transition
  (`PENDING → ACCEPTED | REVOKED | EXPIRED`, `domain-overview.md §4.6`) —
  `betmeet-clone` itself has no accept/revoke UI or action anywhere in its
  real code (grepped, confirmed absent); a directed invite functions
  purely as "share this pool's existing invite token with one specific,
  named person" — joining still happens through the ordinary
  `pools.joinByToken`/`pools.joinPublic` capabilities Bolt 7 already
  shipped, unchanged. Building out invite-status transitions that don't
  exist in the source of truth would be inventing scope, not porting it.
- `POOL_INVITE` notification event queuing/delivery — Bolt 10 (§2).
- Nickname search/typeahead for the directed-invite target field — a UX
  layer, isolated follow-up (§2).
- The "pre-join" leaderboard exclusion rule and any leaderboard/ranking
  computation at all — Bolt 9 (§5).
- Actually computing/persisting `prediction_scores` rows (admin
  force-result, provider-sync scoring sweep) — Bolt 9/12; this bolt's
  grid just reads whatever is there (currently nothing).
- Resolving an email-hash directed invite to a real account on that
  email's later signup — a documented, pre-existing gap in
  `betmeet-clone` itself (`domain-overview.md §5.3`: *"presumably resolved
  on later signup"* — never actually implemented there), not something
  this bolt invents a mechanism for.
