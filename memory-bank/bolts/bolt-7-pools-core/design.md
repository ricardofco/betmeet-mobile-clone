# Bolt 7 — Design

## 1. Module Federation placement — investigation (task brief's explicit ask)

### 1.1 The question

Per the task brief: Bolt 5 (`competition`) had the exact same "Remote" designation on paper (well — `competition`'s was "Remote **or shared**", a dual label) and ended up shipping as a shared library (ADR-017) because host-placed Predictions had a **render-blocking** dependency on competition's match/team data. Does Bolt 8's "predictions↔pools integration" create a similar pull for Bolt 7's pools UI?

### 1.2 Evidence gathered

1. **`requirements.md §7.4`**: `pools` is listed as **`Remote`** — a single, firm placement, not a dual "Remote or shared" label like `competition` originally had. Rationale given at Inception: *"Cohesive, cohesive dependencies on auth/profile but not a hot-path screen."* This is a materially different starting point than `competition`'s ambiguous framing — Inception already considered pools' relationship to the rest of the app and did not flag it as render-blocking-adjacent.
2. **`domain-overview.md §7`'s cross-feature dependency map** — the full, explicit list of every cross-feature pull in the product:
   ```
   predictions ───────→ profile          (must be onboarded to predict)
   predictions ───────→ competition      (reads match/team/fixture data)
   predictions ───────→ scoring-rankings (reads resolved points for display)
   pools ─────────────→ profile          (must be onboarded to create/manage)
   pools ─────────────→ notifications    (directed invite → POOL_INVITE event)
   pools ─────────────→ scoring-rankings (membership changes invalidate leaderboard cache)
   ```
   There is **no `predictions → pools` edge** anywhere in this map, in either
   bolt's scope. `competition`'s equivalent edge (`predictions → competition`)
   was the exact mechanism that forced ADR-017 — its absence here for pools
   is the strongest single piece of evidence.
3. **What Bolt 8 actually adds to predictions** (`bolt-plan.md`'s Bolt 8
   section): PREDICTIONS-3 (pool override + dual-save) and PREDICTIONS-4
   (reset override). Read literally, these mean: while editing a prediction
   for a specific match (a screen that already renders, powered entirely by
   `competition` + `predictions`' own global-prediction data, per Bolt 6),
   the user gets an **additional, secondary affordance** — "also save this
   as an override for pool X" — which needs to know *which pools the viewer
   belongs to*, not the pools feature's full CRUD/membership/settings
   surface. This is structurally a **small pool-picker read** (a list of
   `{id, name}` pairs for pools the viewer is a member of), not a
   dependency on pools' create/rename/delete/join/kick/visibility screens.
   Contrast with `competition`'s pull: predictions' **primary content** (the
   list of matches to predict on, one row per match) *is* competition's
   fixture data — there was no way to render the Predictions screen's first
   paint at all without it. Pools' relationship to predictions, even after
   Bolt 8, stays a secondary, opt-in, per-row enhancement.
4. **POOLS-6 (predictions grid + anti-bias masking)**, the other half of
   Bolt 8's pools-adjacent scope, is the **inverse** direction: a
   pools-owned screen (a specific pool's member-prediction grid) reading
   predictions data — `pools → predictions`, not `predictions → pools`. A
   remote reading data via the same `predictions.*`/`pools.*` backend
   capability contract (through `BackendApiClient`, not a JS-level import of
   host code) is exactly the shape every other remote already uses (e.g.
   the hypothetical future `education` remote importing `@/shared/scoring`
   — a filesystem-shared *library* import — is a different case from a
   remote calling a *backend capability*, which every remote can already do
   with zero MF-boundary cost, since `BackendApiClient` is a host-bundled
   shared singleton per `system-context.md §4`).
5. **`ScriptManager.setup.js`'s own inline comment** (written at Bolt 0,
   before any of this bolt's work) already anticipates `pools` as a future
   *remote* resolver entry, alongside `competition`, `scoring-rankings`,
   `notifications-preferences`, `admin` — i.e. the scaffold-time assumption
   was never revisited or walked back the way `scoring`'s (ADR-015) or
   `competition`'s (ADR-017) were.
6. **Native-module check** (`system-context.md §4`'s explicit federation
   caveat: "any remote whose feature requires a native module ... needs
   that native module present in the shipped app regardless of placement"):
   this bolt's scope (create/rename/delete/join/leave/kick/visibility/
   membersCanInvite/archive) needs no native module beyond what's already
   linked (no camera/image-picker/SVG/keychain touchpoints) — no blocker to
   remote placement from this angle. `@shopify/flash-list` (Bolt 5) is a JS
   dependency, not a native-linking concern, but **does** need adding to
   both `rspack.config.mjs`'s and the new remote's MF `shared` config (see
   §8) since this bolt's pool-list/member-list screens are the first
   *non-host* FlashList consumers.

### 1.3 Decision

**`pools` ships as this repo's second real Module Federation remote** — a
genuinely new `src/remotes/pools/` bundle with its own
`rspack.config.pools-remote.mjs`, loaded on-demand from the host via
`lazy(() => import('pools/App'))`, the same wiring shape Bolt 0 proved with
`education`. This is the first *feature* remote (not an example/demo shell)
since Bolt 0 — a first-class, deliberate architectural moment, recorded as
ADR-032 (not a rubber-stamp of the Inception-level placement — the
investigation above is the actual justification, done fresh for this
bolt's concrete scope, the same rigor ADR-017 applied to `competition`).

Bolt 8's predictions↔pools integration, when it lands, is expected to need
only:
- On the **predictions** (host) side: a small new capability read
  (`pools.getMyPoolsForPicker`-shaped, list of `{id, name}` pairs) called
  directly through `BackendApiClient` — no import of anything from
  `src/remotes/pools/` or `src/domain/pools/`'s UI layer. If Bolt 8 finds
  it *does* need to literally reuse a pools domain function (e.g.
  `canInvite`), that's a `src/domain/pools/` import — already
  filesystem-shared-root per this bolt's layering (§3), zero MF-boundary
  cost, no different from how Predictions already imports
  `src/domain/competition`'s pure functions without needing all of
  `@/shared/competition`'s UI.
- On the **pools** (remote) side: POOLS-6's member-prediction grid calls
  `predictions.*` capabilities directly through the same shared
  `BackendApiClient` singleton — no JS-level import of host or `predictions`
  code either.

If Bolt 8's actual implementation surfaces a genuine render-blocking pull
that this investigation didn't anticipate, that is new evidence discovered
at Bolt 8's own Design stage, and Bolt 8 gets to revisit this ADR the same
way ADR-017 revisited Inception's anticipation — not a reason to withhold
this bolt's decision now on a hypothetical.

## 2. Backend capability contract (designed together with mobile, per ADR-030)

Capability group `pools.*`, dispatched through the existing
`POST ${baseUrl}/${capability}` / Bearer-JWT contract
(`backend/src/routes/index.ts`, unchanged), added to
`backend/src/routes/handlers.ts`'s `handlers` map:

| Capability | Body | Response (success shape) | Failure shape |
|---|---|---|---|
| `pools.create` | `{ name, type, capacity, membersCanInvite? }` | `{ ok: true, pool: PoolDTO }` | `{ ok: false, error: 'VALIDATION_FAILED' \| 'NAME_TAKEN' }` |
| `pools.rename` | `{ poolId, name }` | `{ ok: true, name }` | `{ ok: false, error: 'NOT_FOUND' \| 'NOT_OWNER' \| 'VALIDATION_FAILED' \| 'NAME_TAKEN' }` |
| `pools.delete` | `{ poolId }` | `{ ok: true }` | `{ ok: false, error: 'NOT_FOUND' \| 'NOT_OWNER' }` |
| `pools.updateVisibility` | `{ poolId, type }` | `{ ok: true, type }` | `{ ok: false, error: 'NOT_FOUND' \| 'NOT_OWNER' \| 'NAME_TAKEN' }` |
| `pools.updateMembersCanInvite` | `{ poolId, membersCanInvite }` | `{ ok: true, membersCanInvite }` | `{ ok: false, error: 'NOT_FOUND' \| 'NOT_OWNER' \| 'NOT_APPLICABLE' }` |
| `pools.joinByToken` | `{ token }` | `{ ok: true, poolId, alreadyMember: boolean }` | `{ ok: false, error: 'NOT_FOUND' \| 'FULL' }` |
| `pools.joinPublic` | `{ poolId }` | `{ ok: true, poolId, alreadyMember: boolean }` | `{ ok: false, error: 'NOT_FOUND' \| 'NOT_PUBLIC' \| 'FULL' }` |
| `pools.leave` | `{ poolId }` | `{ ok: true }` | `{ ok: false, error: 'NOT_FOUND' \| 'NOT_MEMBER' \| 'OWNER_CANNOT_LEAVE' }` |
| `pools.kickMember` | `{ poolId, targetUserId }` | `{ ok: true }` | `{ ok: false, error: 'NOT_FOUND' \| 'NOT_OWNER' \| 'CANNOT_KICK_OWNER' }` |
| `pools.setArchived` | `{ poolId, archived }` | `{ ok: true, archived }` | `{ ok: false, error: 'NOT_MEMBER' }` |
| `pools.getMine` | — | `PoolSummaryDTO[]` (pools the caller is a member of, incl. their own membership row) | — (read-only, no failure shape) |
| `pools.listPublic` | — | `PoolDTO[]` (all `PUBLIC` pools, for discovery) | — |
| `pools.getDetail` | `{ poolId }` | `{ ok: true, pool: PoolDTO, members: PoolMemberDTO[], viewerMembership: PoolMembershipDTO \| null }` | `{ ok: false, error: 'NOT_FOUND' }` |

Follows the exact style already established in `handlers.ts` (business-rule
failures are normal `200` JSON with an `{ok:false,...}` shape, e.g.
`predictions.save`'s `LOCKED`/`VALIDATION_FAILED`; truly exceptional cases —
malformed auth, unexpected DB errors — throw and let the router's generic
`catch` produce a `500`, same as every existing handler). `NOT_FOUND` is
used uniformly for "pool doesn't exist" across every handler that takes a
`poolId`, matching `betmeet-clone`'s real actions' one-shape-per-failure-kind
discipline.

`PoolDTO` (backend response shape, mirrors `src/domain/pools/pool.ts`'s
`Pool` type field-for-field so the mobile-side mapping is a type-level
identity, not a transform):
```ts
{ id, name, type: 'PUBLIC'|'PRIVATE', capacity, memberCount, inviteToken, ownerId, membersCanInvite, createdAt }
```
`inviteToken` is only ever populated in `PoolDTO`s returned to a **member**
of that pool (i.e. `pools.getMine`/`pools.getDetail` for a pool the caller
belongs to) — `pools.listPublic`'s discovery-directory rows omit it
(`inviteToken: null` in that response shape specifically), since a
non-member has no legitimate use for it and it isn't a secret invite
mechanism for a pool you can already join by tapping "Join" in the public
directory. This mirrors `betmeet-clone`'s own `listPublicPools` query,
which never selects `inviteToken` at all.

`PoolMemberDTO`: `{ userId, nickname: string | null, isOwner: boolean, joinedAt: string }`
— `nickname` sourced via the existing `Profile.nicknameBase`/`nicknameDiscriminator`
join, same nullable shape as `profile.getProfile`'s response.

### 2.1 Server-side business-rule placement (mirrors `betmeet-clone`'s real actions, reimplemented fresh — never imported, per requirements.md §7.3)

- **Capacity**: `pools.joinByToken`/`pools.joinPublic` wrap the membership-count
  read + `poolMembership.create` in one `prisma.$transaction`, exactly like
  `betmeet-clone`'s `joinPublicPool`/`joinPoolByToken` — this is the actual
  race-condition guard the Model stage's `hasCapacityFor` is only an
  advisory preview of.
- **Public-name uniqueness**: `pools.create`/`pools.rename`/
  `pools.updateVisibility` (target `PUBLIC` only) each do a `findFirst`
  pre-check, then rely on the DB's partial unique index
  (`pools_public_name_unique`, already in `schema.prisma`) as the final
  guard — a caught unique-constraint violation on write maps to the same
  `NAME_TAKEN` error the pre-check would have produced, closing the TOCTOU
  gap between the pre-check and the write (same pattern `renamePool`/
  `updatePoolVisibility` use, `try { ... } catch { return NAME_TAKEN }`).
- **Invite token generation**: a new `backend/src/services/pool-invite-token.ts`
  (8-char unambiguous alphabet, 12-char fallback after 5 failed uniqueness
  retries) — the backend-side, generation-capable twin of the mobile
  domain's validation-only `invite-token.ts`. Reimplemented fresh against
  `domain-overview.md §5.3`'s spec (cross-checked against
  `betmeet-clone`'s real `invite-token.ts` for the exact alphabet/retry
  shape per the task brief's reference-behavior instruction), never
  imported.
- **No tournament-freeze gate anywhere** in any of these nine mutating
  handlers — deliberately absent, not an oversight (§2.2 below).
- **Owner-only checks** (`rename`/`delete`/`updateVisibility`/
  `updateMembersCanInvite`/`kickMember`) all fetch the pool, compare
  `pool.ownerId === auth.userId`, return `NOT_OWNER` otherwise — the
  backend is the authoritative gate; the mobile domain's `canRename`-family
  predicates (Model stage §6) are advisory UI-affordance gating only.
- **`updateMembersCanInvite`** additionally rejects (`NOT_APPLICABLE`) when
  the pool is `PUBLIC` — mirrors `betmeet-clone`'s real
  `updatePoolMembersCanInvite` guard.
- **`leave`**: rejects the owner (`OWNER_CANNOT_LEAVE`) — no transfer escape
  hatch exists yet (Bolt 8/POOLS-7).
- **`kickMember`**: rejects kicking the owner (`CANNOT_KICK_OWNER`) even if
  somehow requested (defense in depth — the UI never offers a kick action on
  the owner's own row, per Model stage `canKick`).

### 2.2 The "no tournament freeze" rule — explicit review flag (task brief's named subtlety)

None of `pools.joinByToken`, `pools.joinPublic`, `pools.leave`,
`pools.kickMember`, or `pools.delete` reads `Match.status`, any
`Competition`/kickoff field, or any "is the tournament in progress" signal
of any kind. This is **intentional and was checked explicitly**, not merely
"happened to be correct": `domain-overview.md §5.3` states *"An earlier
'freeze' rule (no membership changes mid-tournament) was explicitly
removed; do not reintroduce it without checking whether that decision still
holds"* — checked here, against the current, live `domain-overview.md`
text and the task brief's own restatement, and the removal still holds. A
reviewer should specifically look for the *absence* of any competition-state
read in these five handlers as the actual passing condition, not just "no
bug found." Recorded again as ADR-033 so this isn't only a code comment.

## 3. Mobile-side component tree & layering

```
src/domain/pools/                          framework-free (Model stage, done)
  pool.ts, pool-capacity.ts, invite-token.ts, invite-permission.ts,
  pool-membership-permissions.ts, pool-visibility.ts

src/platform/backend-api/pools-api.ts       new capability group (host-bundled,
                                             same singleton every bundle shares)

src/remotes/pools/                          NEW — the second real MF remote
  index.js                                  remote entry (mirrors src/remotes/education/index.js)
  PoolsRemoteEntry.tsx                      exposed './App' — remote's own internal
                                             stack navigator (see §5)
  screens/
    my-pools-screen.tsx                     list of pools the viewer belongs to (+ discover/join affordances)
    discover-pools-screen.tsx               browse PUBLIC pools, join directly
    create-pool-screen.tsx                  POOLS-1
    pool-detail-screen.tsx                  member list, owner-only settings entry point, leave/archive
    pool-settings-screen.tsx                rename, visibility, membersCanInvite (owner-only, POOLS-4)
    join-by-token-screen.tsx                POOLS-2
  components/
    pool-list-item.tsx                      one row in my-pools/discover lists (FlashList row)
    pool-member-row.tsx                     one row in pool-detail's member list (kick affordance, owner-only)
    invite-token-panel.tsx                  shows/copies the pool's invite token + share affordance (canInvite-gated)
  hooks/
    use-pools-query.ts                      TanStack Query hooks (§6)
  navigation/
    pools-stack-params.ts                   the remote's OWN internal param list (not AppStackParamList)
```

No `src/shared/pools/` tier is introduced — this bolt's pools UI has
exactly one consumer (the `pools` remote itself); same reasoning ADR-024
already established for predictions' host-only UI tier, applied here to a
remote instead of the host. If Bolt 8's POOLS-6 grid ends up needing to be
rendered from *inside* the predictions screen too (a second bundle
consumer), promoting a slice to `src/shared/pools/` at that point is the
right call — not preemptively now.

## 4. Why a remote gets its own internal stack navigator, not routes on `AppStack`

Unlike Bolt 6's Predictions (one screen, registered directly on the host's
`AppStack`), pools is a **multi-screen flow** (list → detail → settings →
create → join-by-token) that lives entirely inside one federated chunk. Two
options:

1. The host's `AppStack` grows five new route entries, each independently
   lazy-loading a piece of the `pools` remote.
2. The `pools` remote exposes **one** `./App` module (a self-contained
   `NativeStackNavigator` with its own five screens inside), and the host
   registers exactly **one** `AppStack` route ("Pools") that mounts it,
   identical in shape to how `education` is already mounted (one
   `RemoteBoundary`-wrapped `lazy(() => import('pools/App'))`).

**Decision: option 2.** Registering five separate remote-chunk routes on
the host's own stack would mean the host needs compile-time knowledge of
the remote's internal screen graph (route names, param shapes) — exactly
the coupling Module Federation boundaries exist to avoid, and a departure
from the `education` precedent Bolt 0 already established. The remote owns
its own internal navigation entirely; the host only knows about one entry
point. `AppStackParamList` gains exactly one new route: `Pools: undefined`.

## 5. Navigation / host screen placement

- New route `Pools` on the host's `AppStack`, tag `['protected']` in
  `screen-registry.ts` (same tag as `Home`/`Predictions` — reachable only
  past the onboarding gate).
- `HomeScreen` gets a new "Pools" navigation button, mounting
  `RemoteBoundary` around `lazy(() => import('pools/App'))` — same shape as
  the existing education-remote demo button, but as a real navigated screen
  (`navigation.navigate('Pools')`) rather than an inline toggle, matching
  how `Predictions` was wired (§4 of Bolt 6's design.md).
- `src/host/federated-modules.d.ts` gains a `declare module 'pools/App'`
  entry (mirrors the existing `education/App` declaration).
- `src/host/script-manager-setup.ts`'s `REMOTES` map gains a `pools` entry
  (dev server on a new port, `8083`, next after `education`'s `8082`) —
  this was already anticipated in that file's own comment (§1.2 point 5).

## 6. State boundaries (TanStack Query + Zustand, per Bolt 0 ADR-004)

| State | Owner | Mechanism |
|---|---|---|
| "My pools" (pools the viewer belongs to) | `pools` remote | `useMyPoolsQuery()` — `['pools', 'mine']` |
| Public pools directory | `pools` remote | `usePublicPoolsQuery()` — `['pools', 'public']` |
| One pool's detail (pool + members + viewer's own membership) | `pools` remote | `usePoolDetailQuery(poolId)` — `['pools', 'detail', poolId]` (the one place this bolt uses a parameterized key, since detail is inherently per-pool, unlike predictions' Bolt 6 flat-key precedent which had exactly one "mine" collection to key) |
| Create/rename/delete/join/leave/kick/visibility/membersCanInvite/archive mutations | `pools` remote | One `useMutation` per action in `use-pools-query.ts`, each invalidating the relevant query key(s) on success (`['pools','mine']` always; `['pools','detail',poolId]` when a detail-page action; `['pools','public']` additionally on visibility-change or create-as-public) |
| In-progress create/rename form fields | `pools` remote | Local component state (`useState`), same "ephemeral, single-owner" reasoning as ADR-020/Bolt 6's per-row edit state — no Zustand store |
| Invite-token copy/share affordance state | `pools` remote | Local component state (a "copied!" toast flag) |

No new Zustand store. There is no cross-cutting pools-specific UI toggle
analogous to `competition-store.ts`'s past-matches flag or a
multi-consumer piece of client state that would justify one.

## 7. `pools-api.ts` capability group (new, mobile side)

Same seam pattern as `competition-api.ts`/`predictions-api.ts`/
`profile-api.ts` — typed wrappers around `BackendApiClient.request()`, no
new transport, living in `src/platform/backend-api/` (host-bundled shared
singleton, reachable from the `pools` remote exactly like `predictions-api.ts`
is reachable from the host — both go through the one `getBackendApiClient()`
instance already registered as an MF shared singleton per `system-context.md
§4`'s "Shared singletons / host-bundled libraries" list, which already
names "Backend-API client" explicitly):

```ts
poolsApi.createPool(input: CreatePoolInput): Promise<CreatePoolResponse>
poolsApi.renamePool(input: { poolId; name }): Promise<RenamePoolResponse>
poolsApi.deletePool(poolId: string): Promise<DeletePoolResponse>
poolsApi.updateVisibility(input: { poolId; type }): Promise<UpdateVisibilityResponse>
poolsApi.updateMembersCanInvite(input: { poolId; membersCanInvite }): Promise<UpdateMembersCanInviteResponse>
poolsApi.joinByToken(token: string): Promise<JoinResponse>
poolsApi.joinPublic(poolId: string): Promise<JoinResponse>
poolsApi.leavePool(poolId: string): Promise<LeaveResponse>
poolsApi.kickMember(input: { poolId; targetUserId }): Promise<KickResponse>
poolsApi.setArchived(input: { poolId; archived }): Promise<SetArchivedResponse>
poolsApi.getMine(): Promise<PoolSummary[]>
poolsApi.listPublic(): Promise<Pool[]>
poolsApi.getDetail(poolId: string): Promise<PoolDetailResponse>
```

Response types are discriminated unions matching §2's table
(`{ok:true,...} | {ok:false,error:...}`), mirroring `predictions-api.ts`'s
`SavePredictionResponse` shape exactly — no new response-envelope
convention introduced.

## 8. Performance / bundle-size considerations

- **This is the first non-`education` feature remote** — its own rspack
  config (`rspack.config.pools-remote.mjs`) must mirror `rspack.config.
  education-remote.mjs`'s `sharedDeps()` list exactly (react,
  react-native, `@react-navigation/native`, `@react-navigation/
  native-stack`, `react-native-safe-area-context`, `react-native-screens`),
  **plus one addition**: `@shopify/flash-list`, since this bolt's
  `my-pools-screen.tsx`/`discover-pools-screen.tsx`/pool-detail member list
  use it (Bolt 5's `vercel-react-native-skills`-driven precedent: FlashList
  over FlatList/ScrollView.map for any list that can grow — a public-pools
  directory or a 100-capacity member list both qualify). `@shopify/
  flash-list` must be added to **both** `rspack.config.mjs`'s (host, eager)
  and the new remote's (non-eager) `sharedDeps()` — otherwise the remote
  bundles its own duplicate copy, defeating the singleton guarantee ADR-002
  established. This is a **new** shared-singleton entry, not previously
  needed since Bolt 5/6 only used FlashList from the host bundle.
- **List perf**: same `vercel-react-native-skills` discipline as Bolt 5/6 —
  `useMemo`/`useCallback`-stabilized `renderItem`/`keyExtractor`,
  `React.memo`-wrapped row components (`PoolListItem`/`PoolMemberRow`), no
  inline function/object literals passed as list props.
- **No new native module** — confirmed in §1.2 point 6.
- **Remote-download fallback**: the `Pools` entry point wraps
  `lazy(() => import('pools/App'))` in the existing `RemoteBoundary`
  (retry-on-failure UI), same as `education` — no new fallback pattern
  needed.

## 9. Testing approach preview

- Domain (Model stage, already written): unit tests for
  `validatePoolCapacity`/`hasCapacityFor`, `validatePoolName`,
  `isPlausibleInviteToken`/`normalizeInviteToken`, `canInvite`, the six
  membership predicates, `isVisibilityChangeNoOp`/
  `requiresNameUniquenessCheck`.
- Component (RNTL): `pool-list-item`, `pool-member-row`,
  `invite-token-panel`, each screen (`my-pools-screen`,
  `discover-pools-screen`, `create-pool-screen`, `pool-detail-screen`,
  `pool-settings-screen`, `join-by-token-screen`) covering loading/error/
  loaded/action states, and the explicit **"no freeze gate" regression
  test** — a leave/kick/delete/join action succeeds against a fixture pool
  whose associated match/competition state is set to "in progress",
  proving no client-side gate silently blocks the action either (mirrors
  the backend-side review flag in §2.2, covered on the mobile side too so
  the regression is caught at both layers).
- Hooks: `use-pools-query.ts`'s query-key invalidation contract per
  mutation (mirrors `use-predictions-query.test.tsx`'s shape).
- Backend: real curl + DB verification (not just handler unit tests) per
  the task brief — see `implement-and-test.md` for the exact script,
  covering create/rename/delete/visibility/membersCanInvite/joinByToken/
  joinPublic/leave/kick/setArchived, capacity-at-2 race behavior, and
  public-name-uniqueness collision behavior.
- Device/E2E (Layer 2, `agent-device` conventions): documented manual test
  paths in `implement-and-test.md`, runnable for real since the backend is
  live (first bolt where Layer 2 isn't contract-only).
