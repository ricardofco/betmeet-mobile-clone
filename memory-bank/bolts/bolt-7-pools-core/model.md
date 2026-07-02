# Bolt 7 — Model

This bolt covers **POOLS-1** (create/rename/delete a pool), **POOLS-2**
(join by invite token / join a public pool directly, leave, kick), **POOLS-4**
(visibility + `membersCanInvite` settings), and **POOLS-5** (personal
archive/unarchive of a membership). Source: `bolt-plan.md`'s Bolt 7 section,
cross-referenced against `domain-overview.md §5.3` ("Leagues (pools)"),
since the `units/unit-06-pools/` story files the bolt plan references are
not present in this repo — same gap Bolt 5/6 hit, resolved the same way
(direct reconciliation against `domain-overview.md`, no ambiguity found, no
reconciliation ADR needed, matching Bolt 6's precedent).

**Explicitly out of scope** (Bolt 8 per bolt-plan.md): POOLS-3 (directed
invites by nickname/email), POOLS-6 (predictions grid + anti-bias masking),
POOLS-7 (ownership transfer), and the two prediction-side stories that need
pools to exist first (PREDICTIONS-3 dual-save, PREDICTIONS-4 reset
override).

## 1. Ubiquitous language

| Term | Meaning |
|---|---|
| **Pool** (a.k.a. "league" in the web app's Spanish-first copy) | A named group of members competing against each other's predictions. `PUBLIC` or `PRIVATE`. |
| **Capacity** | Max member count, 2–100 inclusive, set at creation, immutable after (no story in this bolt's scope changes capacity post-creation — `betmeet-clone`'s real actions have no `updateCapacity`). |
| **Owner** | The member who created the pool. Exactly one per pool, never null, cannot leave/be kicked — must delete the pool (transfer is Bolt 8/POOLS-7). |
| **Membership** | A `(poolId, userId)` row. Each member can personally archive/unarchive their own membership — cosmetic, does not affect scoring or the member list others see. |
| **Invite token** | An 8-char code from an unambiguous alphabet (`ABCDEFGHJKMNPQRSTUVWXYZ23456789` — excludes `0/O/1/I/L`), unique across all pools, doubling as both a shareable code and a deep-link parameter. 12-char fallback if 8-char generation collides repeatedly. |
| **`membersCanInvite`** | A PRIVATE-pool-only owner toggle (defaults on) controlling whether non-owner members can also invite. Meaningless for PUBLIC pools (any member can always invite there — no toggle to read). |
| **Tournament freeze** | A **removed** rule. An earlier version of this domain gated membership changes (join/leave/kick/delete) while the competition was in progress. This bolt's own stories (and `domain-overview.md §5.3`'s explicit callout) require that gate to **not** exist. Named here specifically so nobody reintroduces it by analogy with `predictions`' kickoff-lock (a different, still-valid gate on a different resource). |

## 2. Capacity rule (POOLS-1, POOLS-2)

- **2–100 members inclusive**, checked in two places:
  1. **Creation**: `capacity` itself must be an integer in `[2, 100]` — a
     client-side form-validation concern (`validatePoolCapacity`).
  2. **Join time**: current member count `>= capacity` blocks a new join —
     this is a **transactional** check on the backend (current membership
     count read and the new membership insert must happen in one
     transaction, otherwise two concurrent joins on a `capacity=2` pool with
     1 existing member could both succeed — see `betmeet-clone`'s
     `joinPublicPool`/`joinPoolByToken`, both wrapped in `prisma.$transaction`).
     The client-side mirror of this check (`hasCapacityFor`) is **advisory
     only** — same "advisory client, authoritative server" discipline
     ADR-023 established for predictions' kickoff-lock, applied here to a
     different resource.

`src/domain/pools/pool-capacity.ts`:
```
validatePoolCapacity(capacity: number): boolean         // 2 <= capacity <= 100, integer
hasCapacityFor(memberCount: number, capacity: number): boolean  // memberCount < capacity
```

## 3. Name rules (POOLS-1, POOLS-4)

- 3–60 chars, trimmed (`validatePoolName`).
- **Public** pool names must be unique among public pools — private pools
  may repeat names freely. This uniqueness check applies at three points:
  create (if `type === 'PUBLIC'`), rename (if the pool's current type is
  `PUBLIC`), and visibility-change-to-public (checked against the target
  type, not the current one). The DB's partial unique index
  (`pools_public_name_unique`, `schema.prisma`'s `Pool.name` field —
  `@unique(where: type = 'PUBLIC')`) is the final authoritative guard; the
  backend's pre-check (`findFirst` before the write) is a friendlier error
  message, same "pre-check + DB constraint as final guard" shape
  `betmeet-clone`'s real actions use verbatim.
- This client-side name validation (`validatePoolName`) is advisory only —
  the *uniqueness* half specifically cannot be checked client-side at all
  (needs a DB round-trip), so the mobile domain layer only owns the
  length/trim shape check; uniqueness is inherently a backend-only rule,
  surfaced to the UI as a save-time error, not a live-typing check.

## 4. Invite token (POOLS-1, POOLS-2)

- Alphabet: `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (32 chars — the 26 letters
  minus `O/I/L`, digits `2-9`, i.e. `0/1` excluded too). 8 chars by default.
- Generation and uniqueness-retry is **backend-only** (needs `crypto` +
  a DB existence check per attempt) — no mobile domain function generates a
  token. The mobile domain layer only validates **token input shape** when a
  user types/pastes a join code: `isPlausibleInviteToken(token)` — 6-12
  chars (the web app's own `JoinByTokenSchema` accepts 6-12 to tolerate
  either the 8-char default or the 12-char collision fallback), matched
  case-insensitively against the alphabet (excluded chars rejected as a fast
  fail before even hitting the network). This mirrors
  `betmeet-clone`'s `JoinByTokenSchema` bounds exactly (`min(6).max(12)`).
- The backend uppercases the token before lookup (`token.toUpperCase()`,
  `betmeet-clone`'s real `joinPoolByToken`) — mobile does the same before
  sending, so a user typing lowercase still works.

`src/domain/pools/invite-token.ts`:
```
INVITE_TOKEN_ALPHABET: string           // exported so the UI can hint/validate keystrokes
isPlausibleInviteToken(token: string): boolean
normalizeInviteToken(token: string): string   // trim + uppercase
```

## 5. Invite permission (POOLS-2 — who can share/generate an invite affordance)

`canInvite(pool, viewerIsOwner)` — evaluated client-side to decide whether
to show the "invite" affordance at all (advisory UI gating; the backend
capability itself doesn't need a permission check in this bolt's scope,
since Bolt 7 has no directed-invite creation capability — POOLS-3 is Bolt
8. This bolt's invite surface is just "show/copy the pool's invite token",
which every current member can already see by virtue of being a member —
so `canInvite` here really just gates whether the *share* button is shown,
not any write capability):

```
owner                                    → can always invite
member of a PUBLIC pool                  → can always invite (no toggle)
member of a PRIVATE pool                 → can invite only if pool.membersCanInvite === true
```

`src/domain/pools/invite-permission.ts`:
```
type PoolForInvitePermission = { type: 'PUBLIC' | 'PRIVATE'; membersCanInvite: boolean }
canInvite(pool: PoolForInvitePermission, viewerIsOwner: boolean): boolean
```

## 6. Membership action rules (POOLS-2, POOLS-4, POOLS-5)

All pure predicates over `(pool, viewerId)`, all **advisory** (backend
re-checks ownership/membership with its own DB read regardless of what the
client believes — same "advisory client, authoritative server" pattern):

```
isOwner(pool, userId): boolean                       // pool.ownerId === userId
canLeave(pool, userId): boolean                       // member, but NOT owner (owner must delete/transfer)
canKick(pool, viewerId, targetUserId): boolean         // viewer is owner AND targetUserId !== pool.ownerId
canDelete(pool, userId): boolean                       // owner only
canRename(pool, userId): boolean                       // owner only
canUpdateVisibility(pool, userId): boolean             // owner only
canUpdateMembersCanInvite(pool, userId): boolean       // owner only AND pool.type === 'PRIVATE'
                                                        // (the toggle is meaningless/rejected for PUBLIC pools)
```

**No function in this module ever reads a competition/tournament-state
input.** This is deliberate, not an oversight — see §1's "Tournament
freeze" entry. Joining, leaving, kicking, and deleting are unconditionally
allowed at any time regardless of competition phase
(`domain-overview.md §5.3`: *"An earlier 'freeze' rule ... was explicitly
removed; do not reintroduce it without checking whether that decision still
holds."* — checked here, in this Model stage, explicitly: it still holds,
per the task brief's restatement of the same rule. Flagged again in
ADR-032 and in the Implement-stage review checklist so it isn't
reintroduced by accident later.)

`src/domain/pools/pool-membership-permissions.ts` holds all six predicates
above plus `isOwner`.

## 7. Visibility change rule (POOLS-4)

- Owner-only (`canUpdateVisibility`, §6).
- Idempotent: setting to the pool's current type is a no-op success, not an
  error (`betmeet-clone`'s `updatePoolVisibility` returns `{success:true}`
  immediately if `pool.type === parsed.data.type`).
- `PUBLIC → PRIVATE`: always allowed, no uniqueness check (leaving the
  public directory can't collide with anything).
- `PRIVATE → PUBLIC`: re-checks name uniqueness among public pools (§3) —
  backend-only, same pre-check + DB-constraint shape.
- Members and the invite token are preserved across a visibility change —
  no domain function needs to touch membership rows or regenerate the
  token; this is simply "not clearing anything," documented here since it's
  easy to assume a visibility change resets something and it does not.

`src/domain/pools/pool-visibility.ts`:
```
type PoolVisibility = 'PUBLIC' | 'PRIVATE'
isVisibilityChangeNoOp(currentType: PoolVisibility, targetType: PoolVisibility): boolean
requiresNameUniquenessCheck(targetType: PoolVisibility): boolean   // true only when targetType === 'PUBLIC'
```

## 8. Data shapes

`src/domain/pools/pool.ts`:
```ts
export type PoolVisibility = 'PUBLIC' | 'PRIVATE';

export type Pool = {
  id: string;
  name: string;
  type: PoolVisibility;
  capacity: number;
  memberCount: number;
  inviteToken: string;       // only ever shown to members; never exposed for pools the viewer hasn't joined
  ownerId: string;
  membersCanInvite: boolean;
  createdAt: string;
};

export type PoolMembership = {
  poolId: string;
  userId: string;
  joinedAt: string;
  archivedAt: string | null;   // this member's personal archive state (POOLS-5)
};

export type PoolMember = {
  userId: string;
  nickname: string | null;     // null if the member hasn't completed nickname assignment yet — same nullability as ProfileSnapshot.nickname
  isOwner: boolean;
  joinedAt: string;
};

export type PoolSummary = Pool & { viewerMembership: PoolMembership | null };
```

`PoolMember.nickname` reuses the same nullable-nickname shape
`profile-api.ts`'s `ProfileSnapshot` already established — no new
nullability convention introduced.

## 9. ADR-016 duplicate-detection checklist (applied here)

Per ADR-016's three-item code-review gate:
1. No local re-derivation of `ScoringRuleSet`/`computeScore`/penalty-winner
   logic anywhere in `src/domain/pools/` — this bolt has zero scoring
   surface (leaderboard/points are Bolt 9's domain, `domain-overview.md
   §5.6` — pools only tracks membership, not points).
2. No local re-implementation of `getPredictionEligibility`/kickoff-lock —
   confirmed not applicable; pools never reads match/kickoff data in this
   bolt's scope.
3. Invite-token alphabet/length constants defined **once**, in
   `src/domain/pools/invite-token.ts` — not duplicated into any component
   or the backend's own token generator (the backend has its own physical
   copy, `backend/src/services/pool-invite-token.ts`, necessarily — a
   Node/mobile domain-logic split, not a same-runtime duplication; this is
   the same category of unavoidable duplication `prediction-eligibility.ts`
   already accepted between mobile's advisory copy and the backend's
   authoritative copy, not a new precedent).

## 10. Explicitly out of scope (this bolt)

- POOLS-3 (directed invites by nickname/email, invite-token generation
  itself, invite creation permission enforcement as a write capability) —
  Bolt 8.
- POOLS-6 (predictions grid, anti-bias masking of other members'
  predictions) — Bolt 8.
- POOLS-7 (ownership transfer) — Bolt 8. `leavePool`'s "owner cannot leave"
  rule has no transfer escape hatch in this bolt; the UI must say "delete
  the pool" only, not reference a transfer flow that doesn't exist yet.
- Leaderboard / per-member points, "only counts points for matches whose
  kickoff is after they joined" (`domain-overview.md §5.3`'s last-but-one
  bullet) — Bolt 9 (Scoring & rankings).
- Capacity change after creation — no story requests it, and
  `betmeet-clone` has no such action either.
