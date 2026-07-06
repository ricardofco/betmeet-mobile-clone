# ADR-046 — `react-native-reanimated` + `react-native-worklets`: a New Native Dependency Discovered Mid-Implement (Drawer's Peer Dependency), Probed and Passed

**Date:** 2026-07-03
**Status:** Accepted — native build probe run, passed
**Bolt:** 9 — Navigation, i18n & Design Retrofit

## Context

ADR-042 committed to `@react-navigation/drawer` for the Settings drawer. This ADR (and the Design stage that preceded it) did **not** check `@react-navigation/drawer`'s own peer dependencies before committing to the shape — a process gap, caught only once Implement began installing packages: `@react-navigation/drawer@7.x` requires `react-native-reanimated >= 2.0.0` as a peer dependency, and the installed `react-native-reanimated@4.5.1` in turn requires a **separate** `react-native-worklets@0.10.x` package (reanimated v4 moved its worklet-transform runtime out of the main package). Neither package was in `requirements.md §7.5`'s native-module list, `tech-stack.md`, or any of this bolt's prior Model/Design/ADR-042/043 artifacts — a genuinely new native dependency, discovered after the navigation shape was already committed to, structurally the same risk pattern the persona's standing "probe-first" instruction exists to catch (the image-picker precedent that once deferred a whole bolt after its screens were designed).

## Decision

Probed before proceeding, not assumed:

1. **Installed** `@react-navigation/drawer@7.12.6`, `react-native-reanimated@4.5.1`, `react-native-worklets@0.10.1`.
2. **Wired the required Babel plugin**: reanimated v4 delegates its worklet transform to the separate package — `babel.config.js` gained `plugins: ['react-native-worklets/plugin']` (confirmed by inspecting `node_modules/react-native-worklets/plugin` directly, not assumed from reanimated's own — now stale for v4 — documentation).
3. **Ran `cd ios && bundle exec pod install`** — real Codegen ran for `rnreanimated` and `rnworklets` (New Architecture codegen, confirmed in the install log), both pods installed cleanly (88 → 89 total pods).
4. **Ran a real native compile probe**: `xcodebuild -workspace BetmeetMobile.xcworkspace -scheme BetmeetMobile -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' build` → **`** BUILD SUCCEEDED **`**. This is the actual, current-session confirmation that `react-native-reanimated`/`react-native-worklets` compile cleanly on this project's exact RN 0.86 New Architecture setup — not inferred from the packages' own compatibility tables.
5. **Jest**: mocked via the package's own documented `react-native-reanimated/mock` (`jest.config.js` `moduleNameMapper`), since this repo's own code never calls a reanimated API directly (only `@react-navigation/drawer` uses it internally) — no custom mock needed, following the same "use the package's own shipped mock" precedent as `@react-native-async-storage/async-storage`.

## Consequences

- `package.json` gains `@react-navigation/drawer`, `react-native-reanimated`, `react-native-worklets` as direct dependencies. `babel.config.js` gains the worklets plugin (must remain last in the plugins array, per both packages' own setup docs).
- `react-native-reanimated`/`react-native-worklets` are **host-only** MF shared singletons (ADR-043 extended — see `rspack.config.mjs`) — same reasoning as `@react-navigation/bottom-tabs`/`drawer` themselves, since no remote uses the drawer or reanimated directly.
- **Process note, carried forward**: this bolt's own Design stage should have checked `@react-navigation/drawer`'s peer dependencies before ADR-042 was written — it didn't, and the gap surfaced only at Implement. Recorded here as a reminder for future bolts choosing a navigation/animation library: check peer dependencies for native-module requirements *before* the ADR is written, not after installation begins.
- No fallback was needed — the probe passed outright, unlike the image-picker precedent. If a future RN upgrade ever breaks this native compile, this ADR's probe method (install → babel plugin → `pod install` → real `xcodebuild`) is the reusable playbook to re-run.
