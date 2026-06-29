# ADR-002 — Module Federation: host = existing app, scaffold one example remote now

## Context

`system-architecture.md` requires running `/repack-init` before any feature work that should live in a remote. `system-context.md §4` already fixes which features are host vs. remote (auth/profile/predictions/notifications-permission-logic → host; pools/competition/scoring-rankings/notifications-preferences/education/admin → remote). No Module Federation config exists yet (`rspack.config.mjs` only wires the base `RepackPlugin()`).

## Decision

- The **host** is the existing root app (`App.tsx`, `index.js`, `rspack.config.mjs` become the host's entry/config) — not a new package.
- Scaffold **exactly one example remote now**, `src/remotes/education/`, using `/repack-init`'s host+remote scaffolding approach. `education` (`unit-09-education`) was chosen because it is the lowest-risk, most self-contained remote per `bolt-plan.md` (Bolt 11) — its scaffold doubles as a low-stakes end-to-end rehearsal (remote loads, mounts, falls back gracefully) without committing to any other remote's real content before its own bolt arrives.
- Each subsequent remote-owning bolt (`unit-06-pools` in Bolt 7/8, `unit-04-competition` in Bolt 5, `unit-07-scoring-rankings` in Bolt 9, `unit-08-notifications`'s preferences screen in Bolt 10, `unit-10-admin` in Bolt 12) registers its remote by repeating this bolt's registration pattern — this ADR is not re-litigated per remote, only re-applied.
- A reusable `<RemoteBoundary>`-style wrapper is added in `src/host/` that renders a defined retry/error fallback when a remote fails to download, per `system-architecture.md`'s graceful-fallback rule — used by every remote-mounting call site, not reimplemented per remote.
- Shared singletons declared in the Module Federation `shared` config: `react`, `react-native`, the navigation library (ADR-003), the state-management libraries (ADR-004), and (from Bolt 4 onward) `scoring`. `domain/` and `platform/` are bundled normally (imported directly), not declared as MF-shared modules, since they are small/pure and host-bundle-only concerns.

## Consequences

- The `education` remote scaffold will be a near-empty shell until Bolt 11 actually implements `unit-09-education`'s stories — this is intentional (proving the mechanism, not the content) and should not be mistaken for Bolt 11 being "already done."
- Every shared-singleton version must be pinned consistently across host and remotes (`system-architecture.md`'s version-skew rule) — a future dependency bump must update the shared-config version in lockstep, not just the host's `package.json`. This is a recurring maintenance cost, accepted as the standard cost of a Module Federation topology.
- If a remote's native-module needs are discovered later to conflict with its remote placement (per the native-module placement rule), re-placing it to host is a renewed ADR for that specific remote's bolt, not a Bolt 0 concern — `system-architecture.md §6`'s check found no such conflict for the currently fixed topology.
