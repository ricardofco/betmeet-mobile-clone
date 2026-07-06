# ADR-042 — Nested Drawer → Tabs → Per-Tab-Stack Navigation Shell

**Date:** 2026-07-03
**Status:** Accepted
**Bolt:** 9 — Navigation, i18n & Design Retrofit

## Context

`root-navigator.tsx`'s `AppTree` (Bolts 0-8) is a single flat `native-stack` (`AppStack`) with `Home` as a hub screen pushing `Predictions`/`Pools`/`Settings` — the literal cause of the user's "everything lives on Home" complaint (`requirements.md §10` NFR-10.1/10.2, `model.md §1/§3`). `AuthGatedNavigator`'s guard-branch rendering (ADR-001) calls `renderAppTree(): () => React.ReactElement` to mount whichever tree the guard decides on `proceed`/home-redirect outcomes — this contract must keep working regardless of what that tree looks like internally.

## Decision

`renderAppTree` now returns a nested tree:

```
Drawer.Navigator
 ├─ Screen "MainTabs" → Tab.Navigator (headerShown: false at the Drawer.Screen level)
 │    ├─ Tab "HomeTab"        → Stack.Navigator, root screen "Home"
 │    ├─ Tab "PredictionsTab" → Stack.Navigator, root screen "Predictions"
 │    └─ Tab "PoolsTab"       → Stack.Navigator, root screen "Pools" (mounts
 │                                the `pools` remote's `./App`, unchanged
 │                                from ADR-032/034)
 └─ Screen "Settings" → the existing SettingsStackNavigator, unchanged
      internally (headerShown: false at the Drawer.Screen level — each of
      its 8 rows already renders its own header)
```

- **Route names are preserved exactly**: `Home`, `Predictions`, `Pools`, `Settings` (+ its 8 nested rows) keep their current names. `screen-registry.ts`'s `SCREEN_REGISTRY` map and every `ScreenClass` tag require **zero changes** — `evaluateGuard`/`screenClassFor` operate on route names, not container shape (confirmed by re-reading `auth-guard.ts`'s consumption of `screenClassFor`, which never inspects a route's navigator ancestry).
- **Hamburger wiring:** each tab-root screen's header (`headerLeft`) renders a small button that calls `navigation.dispatch(DrawerActions.openDrawer())`. React Navigation bubbles an unhandled navigation action up through parent navigators automatically, so this works from a screen nested two levels below the `Drawer.Navigator` (its own `Stack` → the `Tab.Navigator` → the `Drawer.Navigator`) without manually chaining `getParent().getParent()`.
- **`AuthGatedNavigator` (ADR-001) is unaffected in mechanism** — it still renders exactly one branch per guard outcome; only what `renderAppTree()`'s caller (`RootNavigator.tsx`) constructs internally changes. Re-verified, not re-designed.
- **Federation boundaries unchanged** (`system-context.md §7`, `requirements.md §7.4`) — `pools` still mounts its own internal navigator as the sole content of one host-owned tab-root screen; the host has zero knowledge of `pools`'s internal routes, same as before this bolt.
- **`Home`'s content changes**: the 3-button hub role is removed (redundant with tabs); it becomes a minimal real landing screen. The Bolt-0 "load `education` remote" demo affordance is kept (relocated, not deleted) — it remains the only exercised path proving `RemoteBoundary`'s fallback UI, an item Bolt 0's own Layer 2 still has open.
- **Future tabs** (Rankings — Bolt 10, Education — Bolt 12) slot into `MainTabNavigator` without a reshape; not built in this bolt.
- **Hamburger icon** is a plain text glyph (`"☰"`), not a new icon-font/vector-icon native dependency — consistent with this project's standing discipline against adding new native deps mid-bolt without being asked (precedent: Bolt 7's deferred `@react-native-clipboard/clipboard`).

## Consequences

- `AppStackParamList` is replaced by a small set of per-tier param lists (`RootDrawerParamList`, `MainTabParamList`, and one single-screen param list per tab-stack) — a pure typing change, no runtime behavior change beyond the container nesting itself.
- The structural fix for the reported missing-back-button defect on `Pools`/`Settings` (NFR-10.3) falls out of this shape directly: as tab-root/drawer-root screens, neither needs a "back to Home" affordance (there is no forward-push relationship to Home anymore). See ADR-045's sibling discussion is not relevant here; the durable invariant ("any `headerShown: false` screen must supply its own back affordance unless it's a tab/drawer root") is audited across every existing occurrence at Implement time (`root-navigator.tsx`, `auth-gated-navigator.tsx`'s intentional `MfaChallengeTree` exception, and every remote's own internal navigator), not re-litigated per screen here.
- `@react-navigation/bottom-tabs` and `@react-navigation/drawer` are new dependencies, host-only usage (see ADR-043 for the MF shared-singleton resolution).
