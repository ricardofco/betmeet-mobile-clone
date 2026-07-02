# ADR-034 — The `pools` remote owns its own internal stack navigator; `@shopify/flash-list` and `@tanstack/react-query` become cross-bundle MF shared singletons

## Status
Accepted (2026-07-01).

## Context

Pools is a multi-screen flow (list of my pools → pool detail → owner
settings → create → join-by-token → discover/public directory) — unlike
Bolt 6's Predictions, which is exactly one screen registered directly on
the host's `AppStack`. Two ways to expose a multi-screen remote flow to the
host were considered:

1. The host's `AppStack` grows one route per pools screen, each
   independently lazy-loading a piece of the `pools` remote.
2. The `pools` remote exposes exactly **one** `./App` module — a
   self-contained `NativeStackNavigator` owning all of pools' screens
   internally — and the host registers exactly one `AppStack` route
   (`Pools`) that mounts it, identical in shape to how Bolt 0's `education`
   remote is already mounted.

Separately, two more MF shared-singleton gaps surfaced once this bolt's
implementation started, both because `education` (the only prior remote)
never exercised them:

- This bolt's `my-pools-screen.tsx`/`discover-pools-screen.tsx`/
  pool-detail member list are the first FlashList consumers **outside the
  host bundle** — Bolt 5 (`competition`, shared library) and Bolt 6
  (`predictions`, host-only) both consumed `@shopify/flash-list` from
  inside the host bundle only; neither Module Federation `shared` config
  listed it before this bolt.
- This bolt's `use-pools-query.ts` is the first **remote-side** consumer of
  `@tanstack/react-query`. `app-providers.tsx`'s own doc comment already
  asserts "[the host's `QueryClient`] is shared... transitively, any remote
  mounted into it" — but that assertion only holds if `@tanstack/
  react-query` is registered as an MF `shared` **singleton**. Unlike
  FlashList (a stateless rendering library — a duplicate copy is a
  bundle-size problem, not a correctness one), a *duplicated* React Query
  module is a real correctness bug: the remote's `useQuery`/`useMutation`
  calls would resolve `QueryClientProvider`'s React Context against a
  *different* module instance than the host's provider populated, so
  `useQuery` would either throw ("No QueryClient set") or silently create
  its own client with an empty cache — this had never been exercised before
  since `education` never called a TanStack Query hook.

## Decision

**Navigator shape**: option 2. The `pools` remote owns one internal
`NativeStackNavigator` (`PoolsRemoteEntry.tsx`, exposed as `./App`) with its
own private param-list type (`pools-stack-params.ts`) covering all of its
screens. The host has zero compile-time knowledge of pools' internal route
names or param shapes — it only knows "mount `pools/App`, no params."
`AppStackParamList` gains exactly one entry: `Pools: undefined`.

**Shared-singleton additions**: both `@shopify/flash-list` and
`@tanstack/react-query` are added to `sharedDeps()` in **both**
`rspack.config.mjs` (host, `eager: true`, consistent with every other
host-side shared singleton) and the new `rspack.config.pools-remote.mjs`
(`eager: false`, reusing the host's already-loaded copy — same
eager/non-eager split ADR-002 established for every other shared
dependency). `@tanstack/react-query`'s `singleton: true` is the load-bearing
setting here, not just a bundle-size nicety — it is what makes "the
remote's `useQuery` resolves against the host's one `QueryClient`" actually
true at runtime, not merely asserted in a comment.

## Consequences

- Registering five separate remote-chunk routes directly on the host's own
  stack (option 1) would require the host to have compile-time knowledge of
  the remote's internal screen graph — exactly the coupling Module
  Federation boundaries exist to avoid, and a departure from the
  `education` precedent Bolt 0 already established (one exposed module, one
  mount point). Option 2 keeps that precedent consistent for the first real
  feature remote.
- Pools' internal navigation (list → detail → settings, etc.) is entirely
  invisible to the host's navigation state — `navigation.navigate('Pools')`
  from `HomeScreen` is the only host-side navigation action involved; all
  subsequent in-flow navigation happens inside the remote's own
  `NavigationContainer`-less nested stack (nested inside the host's
  `NavigationContainer`, same as how `education`'s or any future remote's
  internal navigation would compose, per React Navigation's standard
  nested-navigator support).
- Without the `@shopify/flash-list` shared-singleton addition, the `pools`
  remote would bundle its own separate copy of FlashList — a bundle-size
  and version-drift regression against the singleton guarantee ADR-002
  established, but not a functional break.
- Without the `@tanstack/react-query` shared-singleton addition, every
  `use-pools-query.ts` hook would break at runtime the first time it's
  exercised on a real device/remote-download boundary — this is exactly the
  kind of gap that a Layer-1 (Jest, single-bundle test runner) test suite
  **cannot catch**, since Jest never actually federates two separate
  Rspack-built bundles the way a real Module Federation runtime does; only
  a real device/Metro-equivalent run surfaces it. Flagged explicitly in
  `implement-and-test.md`'s Layer 2 plan as the one MF-specific risk this
  bolt introduces that unit tests structurally cannot verify.
- Sets the precedent for `scoring-rankings` (Bolt 9), `notifications`
  preferences screen (Bolt 10), and `education`'s real content (Bolt 11) —
  any of those remotes that render a growable list and/or call a TanStack
  Query hook must also add the relevant dependency to their own
  `sharedDeps()`, not assume it's already shared just because the host uses
  it.
