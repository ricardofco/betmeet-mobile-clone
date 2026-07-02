# Bolt 7 — Implement & Test

## 1. What was built

### Mobile side

- **Domain** (`src/domain/pools/`, framework-free): `pool.ts` (data
  shapes), `pool-capacity.ts` (2-100 validation + advisory
  `hasCapacityFor`), `pool-name.ts` (3-60 char validation), `invite-token.ts`
  (unambiguous-alphabet shape validation, normalize), `invite-permission.ts`
  (`canInvite`), `pool-membership-permissions.ts` (`isOwner`/`canLeave`/
  `canKick`/`canDelete`/`canRename`/`canUpdateVisibility`/
  `canUpdateMembersCanInvite` — **none accept a competition/match input**,
  ADR-033), `pool-visibility.ts` (idempotency + uniqueness-check gating).
  Barrel `index.ts`.
- **`pools-api.ts`** (`src/platform/backend-api/`) — 13 typed capability
  wrappers (`createPool`/`renamePool`/`deletePool`/`updateVisibility`/
  `updateMembersCanInvite`/`joinByToken`/`joinPublic`/`leavePool`/
  `kickMember`/`setArchived`/`getMine`/`listPublic`/`getDetail`), same
  `BackendApiClient.request()` pattern as every prior `*-api.ts`.
- **`src/remotes/pools/`** — the repo's second real Module Federation
  remote (ADR-032), first *feature* remote since Bolt 0's `education` demo
  shell:
  - `hooks/use-pools-query.ts` — TanStack Query hooks/mutations, flat keys
    (`['pools','mine']`, `['pools','public']`) + one parameterized key
    (`['pools','detail',poolId]`).
  - `components/`: `pool-list-item.tsx`, `pool-member-row.tsx`,
    `invite-token-panel.tsx` (all `React.memo`-wrapped per
    `vercel-react-native-skills`).
  - `screens/`: `my-pools-screen.tsx` (FlashList), `discover-pools-screen.tsx`
    (FlashList), `create-pool-screen.tsx`, `join-by-token-screen.tsx`,
    `pool-detail-screen.tsx` (FlashList member list + invite panel + leave/
    archive/kick), `pool-settings-screen.tsx` (owner-only rename/visibility/
    membersCanInvite/delete).
  - `PoolsRemoteEntry.tsx` — the single exposed `./App` module, a
    self-contained `NativeStackNavigator` (ADR-034).
  - `navigation/pools-stack-params.ts`, `index.js` (standalone dev-server
    entry), `test-utils/render-with-query-client.tsx`.
- **Host wiring**: `rspack.config.mjs` gains a `pools` remote entry +
  `@shopify/flash-list`/`@tanstack/react-query` shared-singleton config
  additions (ADR-034); new `rspack.config.pools-remote.mjs`;
  `script-manager-setup.ts`/`federated-modules.d.ts` gain `pools` entries;
  `AppStackParamList`/`screen-registry.ts` gain `Pools: undefined` /
  `['protected']`; `root-navigator.tsx` registers the `Pools` route (mounted
  via `lazy(() => import('pools/App'))` + `RemoteBoundary`, same pattern as
  `education`) and adds a "Pools" button to `HomeScreen`.

### Backend side (`backend/`, ADR-030)

- `backend/src/services/pool-invite-token.ts` — real token generation
  (8-char unambiguous alphabet, 12-char collision fallback,
  uniqueness-retry).
- `backend/src/services/pool-permissions.ts` — authoritative `isOwner`/
  `canLeave`/`canKick` (mirrors the mobile domain module's shape, backend is
  the real gate).
- `backend/src/routes/handlers.ts` — 13 new `pools.*` handlers, same
  `{ok:true,...}|{ok:false,error:...}` style as `predictions.save`:
  `pools.create`/`rename`/`delete`/`updateVisibility`/
  `updateMembersCanInvite`/`joinByToken`/`joinPublic`/`leave`/`kickMember`/
  `setArchived`/`getMine`/`listPublic`/`getDetail`. Capacity races closed
  via `prisma.$transaction` (join handlers); public-name-uniqueness races
  closed via pre-check + catch-and-map-to-`NAME_TAKEN` on the unique-index
  violation (ADR-035). No new Prisma migration — `Pool`/`PoolMembership`
  tables already existed (backend-phase1 provisioning).

## 2. Layer 1 — automated tests

**509 tests passing across 70 suites** (up from 377/54 at the close of
Bolt 6 — **132 new tests across 16 new suites**):

Domain (67 tests, 6 suites): `pool-capacity`, `pool-name`, `invite-token`,
`invite-permission`, `pool-membership-permissions` (incl. an explicit
call-signature-arity tripwire so a future edit can't silently smuggle a
competition/match parameter into a permission predicate), `pool-visibility`.

Remote (65 tests, 10 suites):
- Hooks (18 tests): `use-pools-query.test.tsx` — every query + every
  mutation's invalidation contract (mirrors `use-predictions-query.test.tsx`'s
  shape), including "does NOT invalidate on a rejection" cases (FULL,
  OWNER_CANNOT_LEAVE).
- Components (18 tests): `pool-list-item`, `pool-member-row`,
  `invite-token-panel` (incl. the `canInvite` gating matrix).
- Screens (29 tests): all six screens — loading/error/empty/loaded states,
  the create/join/rename/visibility/membersCanInvite/delete/leave/kick/
  archive flows, and **two explicit ADR-033 regression tests** in
  `pool-detail-screen.test.tsx` ("leaving succeeds regardless of
  competition/tournament state", "kicking succeeds regardless of
  competition/tournament state") asserting the mutation is called with
  *only* `poolId`/`targetUserId` — no competition-state argument exists to
  even pass, which is the actual structural proof the gate is absent, not
  just "the happy path worked."

`yarn tsc --noEmit` clean. `yarn lint` — same one pre-existing,
unrelated lint error in Bolt 2's `supabase-adapter.ts`, not touched by this
bolt (plus the pre-existing generated-Prisma-file warnings, also unrelated).

`cd backend && npx tsc -p tsconfig.json --noEmit` clean.

## 3. Layer 2 — real backend verification (not contract-only, per ADR-030/task brief)

Performed against the **live** `backend/` server (`npm run dev`,
`http://localhost:4000`) and the **live** Supabase database (same project
used by backend-phase1 — real 48 teams / 52+5 matches / real schema), using
two-then-three throwaway test users minted via the Supabase Admin API
(`auth.admin.createUser` + `signInWithPassword` for a real session JWT),
exercised with `curl`, verified against the DB with raw Prisma queries, then
fully cleaned up (pools deleted — cascaded memberships — profile rows
deleted, all 3 auth users deleted via `auth.admin.deleteUser`). Confirmed
zero residue with a final `pool.count({name: contains 'Bolt7'})` = 0 check.

**Capabilities exercised and confirmed working, real request/response
pairs, against the live DB:**

| Capability | Scenario | Result |
|---|---|---|
| `pools.create` | PRIVATE, capacity 2 | `{ok:true}`, real 8-char invite token (`U9HZ2TTA`), owner auto-membership created |
| `pools.create` | invalid capacity (1) | `{ok:false, error:VALIDATION_FAILED}` |
| `pools.create` | name too short ("ab") | `{ok:false, error:VALIDATION_FAILED}` |
| `pools.create` | PUBLIC, name already taken by another public pool | `{ok:false, error:NAME_TAKEN}` |
| `pools.create` | PRIVATE, name matching an existing PUBLIC pool's name | `{ok:true}` — private names don't collide |
| `pools.rename` | owner | `{ok:true}` |
| `pools.rename` | non-owner | `{ok:false, error:NOT_OWNER}` |
| `pools.joinByToken` | valid token, capacity available | `{ok:true, alreadyMember:false}` |
| `pools.joinByToken` | pool now at capacity (2/2) | `{ok:false, error:FULL}` |
| `pools.joinByToken` | already a member | `{ok:true, alreadyMember:true}` (idempotent) |
| `pools.joinByToken` | bogus token | `{ok:false, error:NOT_FOUND}` |
| `pools.joinByToken` × 2 **concurrent** | capacity-2 pool, 1 existing member, 2 simultaneous joiners | **exactly one** `{ok:true}`, the other `{ok:false, error:FULL}` — DB verified via raw query: 2 members in a capacity-2 pool, no overshoot (ADR-035's transactional guard proven under real concurrency, not just sequentially) |
| `pools.joinPublic` | public pool, direct join | `{ok:true}` |
| `pools.joinPublic` | target pool is actually PRIVATE | `{ok:false, error:NOT_PUBLIC}` |
| `pools.updateVisibility` | same type (idempotent) | `{ok:true}`, no-op |
| `pools.updateVisibility` | PUBLIC → PRIVATE | `{ok:true}`, always allowed |
| `pools.updateVisibility` | PRIVATE → PUBLIC, no name clash | `{ok:true}` |
| `pools.updateMembersCanInvite` | PRIVATE pool, owner | `{ok:true}` |
| `pools.updateMembersCanInvite` | PUBLIC pool, owner | `{ok:false, error:NOT_APPLICABLE}` |
| `pools.leave` | owner attempts to leave | `{ok:false, error:OWNER_CANNOT_LEAVE}` |
| `pools.leave` | non-owner member | `{ok:true}` |
| `pools.kickMember` | owner kicks self | `{ok:false, error:CANNOT_KICK_OWNER}` |
| `pools.kickMember` | owner kicks a real member | `{ok:true}` |
| `pools.setArchived` | archive then unarchive | `{ok:true, archived:true}` then `{ok:true, archived:false}` |
| `pools.getDetail` | member of pool | includes real `inviteToken` + full member list w/ `isOwner` flags |
| `pools.getDetail` | nonexistent pool | `{ok:false, error:NOT_FOUND}` |
| `pools.getMine` | member | correct `PoolSummary[]` incl. `viewerMembership` |
| `pools.listPublic` | non-participant viewer | `inviteToken: null` on every row (privacy check, design.md §2, confirmed for real) |
| (no capability) | missing bearer token | `401 {"error":"Missing bearer token"}` |

**ADR-033 "no tournament freeze" — verified against real, live competition
state, not a mocked one.** The seeded database already has a real `LIVE`
match and a real `FINISHED` match at verification time (from
backend-phase1's additive seed). With that state confirmed via a direct
Prisma query, `pools.leave`, `pools.kickMember`, `pools.joinPublic`, and
`pools.delete` were each called and **all four succeeded** — direct,
positive proof against production-shaped live data that no freeze gate
exists anywhere in the call path, not just an absence-of-evidence inference
from passing unit tests.

## 4. Layer 2 — device-level manual test paths (runnable for real, backend is live)

Per Bolts 3-6's precedent, these are documented for the user to run on a
real Simulator — **this bolt's are the first to be genuinely runnable
end-to-end** (real backend, no contract-only mocks), same as Bolt 6's plan
once the backend went live. Requires: `cd backend && npm run dev` running,
`pod install` completed (still blocked in this environment per known
issues), the `pools` remote's own dev server running on port 8083
(`npx re-pack start --port 8083` from the `pools` remote's context, or
whatever this plugin's per-remote dev-server command is — mirrors how
`education`'s dev server is started on 8082).

1. **Create a private pool.** Home → Pools → "Create a pool" → fill
   name/capacity, leave Public off → Create. Verify landing on the new
   pool's detail screen, invite token visible.
2. **Create a public pool with a duplicate name.** Repeat with an
   already-used public pool name → expect the `NAME_TAKEN` inline error,
   no navigation.
3. **Join by token.** From a second test account, Home → Pools → "Join by
   code" → paste the first pool's invite token → verify landing on that
   pool's detail screen with 2 members shown.
4. **Discover + join a public pool.** Home → Pools → "Discover public
   pools" → tap a public pool row → verify immediate join + navigation to
   detail (no confirmation dialog, matches `joinPublicPool`'s real UX).
5. **Capacity-full join.** Create a capacity-2 pool, join with a second
   account, then attempt a third account's join (by token or public) →
   expect a "This pool is full." message, no navigation.
6. **Owner-only settings gating.** As a non-owner member, verify no
   "Pool settings" button is visible; as the owner, verify it is and leads
   to rename/visibility/membersCanInvite/delete.
7. **Visibility toggle round-trip.** As owner: toggle Public pool on → off →
   on again, verifying the switch reflects the persisted state after each
   toggle (re-fetch/re-render), and that toggling to Public with a taken
   name shows the inline error without reverting the switch's rendered
   pool-type incorrectly.
8. **Kick flow.** As owner with ≥2 members, tap "Kick" on a non-owner row →
   verify the member disappears from the list and (with that account) that
   they no longer see the pool in "My pools."
9. **Leave flow — owner blocked, member allowed.** As owner, verify no
   "Leave pool" button exists at all (only "Pool settings"/"Delete pool").
   As a member, tap "Leave pool" → verify removal from "My pools."
10. **Archive/unarchive (POOLS-5).** As a member, tap "Archive" on a pool's
    detail screen → return to "My pools" → verify the "Archived" badge
    shows on that row → tap "Unarchive" → badge disappears.
11. **Remote-download fallback.** Kill the `pools` remote's dev server,
    tap "Pools" from Home → verify `RemoteBoundary`'s retry UI appears
    instead of a crash (same fallback-path proof still open from Bolt 0 for
    `education`, now also applicable to `pools` — first real second
    data point for this fallback path).
12. **MF shared-singleton sanity (ADR-034's flagged risk).** With both dev
    servers running, confirm the FlashList-rendered pool lists scroll
    smoothly (no duplicate-FlashList-instance jank) and that a
    pools-remote-triggered mutation (e.g. joining a pool) correctly updates
    data the **host**'s Predictions screen would also read from the same
    `QueryClient` cache if it queried pools data — i.e., confirm there is
    exactly one `QueryClient` instance across host+remote, not two. This is
    the one MF-specific correctness risk Layer 1 (Jest) cannot verify at
    all (ADR-034's consequence section) — only a real two-bundle device run
    proves it.

## 5. What was explicitly flagged to the user / stopped-and-asked moments

- **No database schema changes were made** — `Pool`/`PoolMembership`
  already existed from backend-phase1 provisioning; no `prisma db push`
  was run, no risk to the live production-shaped data was taken.
- **`@react-native-clipboard/clipboard` is not installed** — `Clipboard`
  was removed from react-native core in this RN version.
  `invite-token-panel.tsx`'s copy button is wired via an injectable
  `onCopy` prop (defaults to a no-op with visible "Copied!" UI feedback and
  a `selectable` text field as a manual-copy fallback) rather than adding a
  new native dependency mid-bolt without being asked — flagged here as a
  deliberate scope decision, not an oversight. Adding the real package is a
  follow-up, isolated to this one component.
- **ADR-033's "no tournament freeze" subtlety** was verified twice —
  structurally (no function signature anywhere accepts competition state)
  and empirically (real curl calls against a live database with an actual
  `LIVE` and `FINISHED` match present, all four membership actions
  succeeded). Flagged per the task brief's explicit request, not silently
  implemented-and-moved-on.
- **The MF placement investigation (ADR-032) concluded pools should be a
  genuine second remote**, not folded into shared-library status the way
  `competition` was (ADR-017) — the evidence (no `predictions → pools`
  dependency edge in `domain-overview.md §7`, Bolt 8's integration reading
  as a narrow picker-list pull rather than a render-blocking one) pointed
  the other way this time. This is flagged as the single largest
  architectural decision in this bolt, not a rubber-stamp.
