# ADR-043 — MF Shared-Singleton Resolution for Bolt 9's New Packages

**Date:** 2026-07-03
**Status:** Accepted
**Bolt:** 9 — Navigation, i18n & Design Retrofit

## Context

`tech-stack.md`'s Federation-boundaries section flagged `@react-navigation/bottom-tabs`, `@react-navigation/drawer`, and `tamagui` as "pending additions, not yet wired," and left "whether `i18next`/`react-i18next` also need singleton treatment" as an open question for this bolt's Design stage. `activeContext.md`/`progress.md` also carry a standing instruction, born from two real incidents (the `@tanstack/react-query` QueryClient risk flagged proactively at ADR-034, and the `react-native-svg` `RNSVGCircle` double-registration crash found reactively in Bolt 8's Layer 2): **every MF shared-dependency list needs a deliberate audit before Layer 2, not incremental on-device discovery.** This ADR is that deliberate audit for this bolt's five new packages.

## Decision

| Package | Host `shared` (eager) | `pools` remote `shared` (non-eager) | `education` remote `shared` | Reasoning |
|---|---|---|---|---|
| `@react-navigation/bottom-tabs` | Yes | No | No | Host-only usage — the navigation shell (Drawer/Tabs) is 100% host code (ADR-042); no remote renders a tab bar itself. |
| `@react-navigation/drawer` | Yes | No | No | Same as above. |
| `tamagui` (+ its core/config packages, one `TamaguiProvider`/theme-context instance) | Yes | **Yes** | No | `pools`' own screens (Bolt 7/8 code, per `bolt-plan.md`'s explicit "apply Tamagui to... Bolt 5-8 screens" instruction) will import and render Tamagui components directly, reading from the host's one `<TamaguiProvider>` context. Same risk class as the React-Query singleton (ADR-034) and the `react-native-svg` incident (Bolt 8) — a duplicated Tamagui module instance in the remote bundle would create a second, disconnected theme/context, silently breaking theming rather than crashing (a quieter, easier-to-miss failure mode than the SVG case). `education` is excluded — it is not retrofitted with Tamagui in this bolt (still Bolt 0's demo shell); add it to `education`'s shared list only when/if a future bolt gives it real Tamagui-based screens (same "add on first real cross-bundle consumption" precedent ADR-034 itself followed). |
| `i18next`, `react-i18next` | Yes | **Yes** | No | `pools`' screens call `useTranslation()` directly for the same reason as above — must resolve to the host's one initialized `i18next` instance so language-change events and the active-language state propagate consistently across bundles. `education` excluded for the same reason as `tamagui` above. |
| `react-native-localize` | Yes | No | No | Read exactly once, at boot, by the host's `platform/i18n` init wiring (`design.md §4`) — no remote calls this package directly, so there is no cross-bundle-instance risk to guard against. |

## Consequences

- `rspack.config.mjs` gains all five packages in its `shared` config (eager: true, matching the existing host convention).
- `rspack.config.pools-remote.mjs` gains `tamagui` and `i18next`/`react-i18next` (eager: false, matching the existing remote convention) — **not** the other three.
- `rspack.config.education-remote.mjs` is **unchanged** by this bolt (confirmed decision, not an oversight) — it still only shares `react`, `react-native`, `@react-navigation/native`/`native-stack`, `react-native-safe-area-context`, `react-native-screens`, same as today. Its own `headerShown`/back-button audit (bolt-plan.md's "every remote-owned stack") is a separate, structural concern from this styling/string-layer decision and is still in scope.
- This table supersedes `tech-stack.md`'s "pending additions" note for Bolt 9 — `tech-stack.md` is updated to reflect it as decided (still pending actual `yarn add`/config-file edits until Implement).
- If a future bolt gives `education` real Tamagui/i18n-consuming screens, that bolt must re-run this same audit for `education`'s shared list rather than assuming today's exclusion still holds.
