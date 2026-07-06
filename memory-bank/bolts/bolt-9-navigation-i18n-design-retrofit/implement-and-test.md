# Bolt 9 — Implement & Test

> Builds on `model.md`, `design.md`, ADR-041 through ADR-047. User confirmed ADR-041's open question (unification) before this stage started. §11 records a second real Layer 2 pass (5 findings, all fixed) after the user's manual device verification.

## 1. ADR-045 probe — Tamagui/Rspack resolution (run first, per plan)

Two real, concrete incompatibilities found and fixed (not hypothetical) — full detail in ADR-045:

1. **`yarn tsc --noEmit` failure on `tamagui@2.4.0`**: `@tamagui/element`'s `package.json` pointed TypeScript at raw `.ts` source for its generic (non-`react-native`-conditioned) `types` entry, which references browser-only `HTMLElement`. **Fixed by upgrading to `tamagui@2.4.2`**, whose `exports` map gained a proper `"react-native"`-conditioned `types` path that avoids the browser-only file entirely (confirmed by inspecting both versions' real published source via `npm pack`, not just changelog claims).
2. **Rspack bundle failure**: `tamagui`'s root barrel unconditionally re-exports Popover/Tooltip/Select/ContextMenu internals (`@tamagui/popper`/`@tamagui/floating`), whose `.native.js` files still `require('react-dom')`. **Fixed with `new rspack.IgnorePlugin({ resourceRegExp: /^react-dom$/ })`** in both `rspack.config.mjs` and `rspack.config.pools-remote.mjs` (same technique already used for `@react-native-masked-view`) — safe because this bolt uses none of those components. A matching Jest-side fix (`__mocks__/react-dom.js`, an empty module) was needed separately since Jest doesn't go through Rspack's plugins.

**Both the host bundle and the `pools` remote bundle were actually built** (`npx react-native bundle --config rspack.config.mjs`/`rspack.config.pools-remote.mjs --platform ios`) — both compile successfully (only pre-existing-class dynamic-`require` advisory warnings, no errors).

## 2. ADR-046 probe — `react-native-reanimated`/`react-native-worklets` (new native dependency, discovered mid-Implement)

`@react-navigation/drawer`'s peer dependency on `react-native-reanimated` (which itself, at v4, requires a separate `react-native-worklets` package) was **not caught at Design stage** — a real process gap, recorded honestly in ADR-046 rather than silently patched over. Probed before proceeding:
- Installed both packages; added `react-native-worklets/plugin` to `babel.config.js` (must be last in the plugins array).
- `cd ios && bundle exec pod install` — real New Architecture codegen ran for `rnreanimated`/`rnworklets`, both pods installed cleanly.
- **Ran a real native compile**: `xcodebuild -workspace BetmeetMobile.xcworkspace -scheme BetmeetMobile -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' build` → **`** BUILD SUCCEEDED **`**.
- No fallback needed — probe passed outright.

## 3. Packages installed

`@react-navigation/bottom-tabs`, `@react-navigation/drawer`, `react-native-reanimated`, `react-native-worklets`, `i18next`, `react-i18next`, `react-native-localize`, `tamagui@2.4.2`. `package.json`/`yarn.lock` updated.

## 4. Navigation shell (ADR-042)

- `src/host/auth/navigation/auth-stack-params.ts` — `AppStackParamList` replaced with `RootDrawerParamList`/`MainTabParamList`/`HomeStackParamList`/`PredictionsStackParamList`/`PoolsStackParamList`. Route names unchanged; `screen-registry.ts` required **zero edits** (confirmed, as `model.md`/`design.md` predicted).
- `src/host/navigation/components/header-menu-button.tsx` — new, dispatches `DrawerActions.openDrawer()`.
- `src/host/navigation/screens/home-screen.tsx` — new (redesigned `HomeScreen`, Tamagui + i18n, 3-button hub role removed, education-remote demo kept/relocated).
- `src/host/navigation/screens/pools-tab-screen.tsx` — new (the `PoolsTabScreen`/`RemoteBoundary` wrapper, moved out of `root-navigator.tsx`).
- `src/host/navigation/main-tab-navigator.tsx` — new (`MainTabNavigator` + 3 per-tab `NativeStackNavigator`s, each static top-level components — not factories recreated per render, avoiding a real remount-on-rerender bug caught and fixed during Implement, see `react/no-unstable-nested-components` note below).
- `src/host/navigation/root-drawer-navigator.tsx` — new (`RootDrawerNavigator`, wraps `MainTabNavigator` + the unchanged 8-row `SettingsStackNavigator`, moved from `root-navigator.tsx`).
- `src/host/navigation/root-navigator.tsx` — trimmed to just the deep-link handler + `AuthGatedNavigator` wiring; `renderAppTree={() => <RootDrawerNavigator />}` replaces the old flat `AppTree`.
- **Back-button defect (NFR-10.3)**: resolved structurally — `Pools`/`Settings` are now tab-root/drawer-root screens, not stack pushes, so neither needs a "back to Home" affordance. Audited every remaining `headerShown: false` occurrence: only `MfaChallengeTree` in `auth-gated-navigator.tsx` still has one — confirmed pre-existing and intentional (its own comment: no back button by design, user exits via MFA success or sign-out). `pools`' own internal `PoolsRemoteEntry.tsx` and `education`'s `EducationRemoteEntry.tsx` were also checked directly — neither sets `headerShown: false` anywhere (every `pools` screen gets its own default back header automatically).
- **A real bug was caught and fixed during Implement, not left in**: the first draft of `main-tab-navigator.tsx` used per-render factory functions (`makeHomeStack(...)` etc.) that would have recreated component identities on every render of `MainTabNavigator` (e.g. on a language change), forcing React Navigation to remount every tab's stack and lose its navigation history. Refactored to static, top-level stack-navigator components before this was ever tested against real behavior — `vercel-react-native-skills`' explicit rule against defining components during render, applied here to a navigator-construction pattern, not just a JSX-returning component.

## 5. i18n (ADR-044)

- `src/domain/i18n/resolve-initial-language.ts` — pure function, 6 unit tests.
- `src/platform/i18n/i18n.ts` — `i18next` instance + `resolveAndApplyInitialLanguage()`, 3 tests (device-detected win, unsupported-locale fallback, stored-locale-wins-over-device).
- `src/platform/i18n/locales/{en,es}.ts` — string catalogs.
- `src/host/providers/app-providers.tsx` — wraps `TamaguiProvider` + `I18nextProvider`; calls `resolveAndApplyInitialLanguage()` alongside the existing locale-store hydration effect (ADR-013's pattern, no new splash state).
- `src/host/profile/components/locale-switch.tsx` — the confirmed unification wiring: `handleSelect` now also calls `i18n.changeLanguage(value)` alongside the existing `setLocale`/`syncLocale` calls.
- **A real test-mocking bug was caught and fixed, not glossed over**: `jest.spyOn(RNLocalize, 'getLocales')` against an `import * as RNLocalize` namespace object silently didn't reach `platform/i18n/i18n.ts`'s own copy of that namespace (Babel's CommonJS interop copies `import * as X` namespaces by value at import time, per file) — the test's mocked return value was invisible to the code under test, producing a wrong-but-passing-looking result until manually traced with debug logging. Fixed by switching to a `jest.mock('react-native-localize', () => ({...}))` factory routed through one stable, module-scoped `jest.fn()`, which sidesteps the per-file-namespace-copy problem entirely.

## 6. Tamagui design-system retrofit — actual scope delivered (bounded, per NFR-10.5's own "not a rewrite mandate")

- `tamagui.config.ts` — tokens (size/space/radius/color) + light/dark themes, no `@tamagui/config` dependency (self-contained, smaller resolution surface).
- `src/shared/design/primitives.tsx` — `Screen`/`Card`/`Row`/`Heading`/`BodyText`/`MutedText`/`PrimaryButton`/`LoadingState`/`ErrorState`/`EmptyState`.
- **Full Tamagui + i18n retrofit** (screen-level chrome): navigation shell (all new files above), `account-settings-screen.tsx`, `change-locale-screen.tsx`, `locale-switch.tsx`, `my-pools-screen.tsx` (`pools` remote — proves the MF `tamagui`/`i18next` shared-singleton wiring for real, on the actual second bundle, not just planned).
- **i18n string-extraction only** (StyleSheet retained, deliberately): `predictions-screen.tsx`'s own loading/error chrome, `pool-detail-screen.tsx`'s chrome strings. **Design rationale, not a shortcut**: both screens' actual list-row rendering (`PredictionsFixtureList`/`PredictionMatchCard`, `PoolMemberRow`) is FlashList-based and perf-critical — `vercel-react-native-skills` cautions against per-row runtime-styled component overhead in scrolling lists, and this bolt's own ADR-045 already establishes Tamagui runs in **runtime-only** mode (no compile-time style flattening) on this stack. Retrofitting FlashList row renderers with Tamagui primitives would add real per-row style-resolution cost with no design-system benefit visible to the user (rows are already small, dense, non-chrome UI) — deliberately deferred, not overlooked.
- **Explicitly NOT retrofitted this bolt** (still hardcoded English strings + plain `StyleSheet`) — tracked here as a concrete follow-up list, not silently dropped:
  - Host: `change-nickname-screen.tsx`, `change-avatar-screen.tsx`, all 5 onboarding screens, `change-password-screen.tsx`, `change-email-screen.tsx`, `totp-enrollment-screen.tsx`, `delete-account-screen.tsx`, every `src/host/predictions/components/*` (score input, penalty selector, score breakdown panel, prediction match card, fixture list).
  - Shared: every `src/shared/competition/components/*` and `src/shared/competition/flags/*`.
  - Remote (`pools`): `discover-pools-screen.tsx`, `create-pool-screen.tsx`, `join-by-token-screen.tsx`, `pool-settings-screen.tsx`, `pool-predictions-screen.tsx`, and every `src/remotes/pools/components/*` (list item, member row, invite-token panel, directed-invite form, transfer-ownership panel, prediction-grid cell/match-card, score stepper).
  - `education` remote — confirmed untouched by design (ADR-043), still Bolt 0's demo shell.

## 7. MF shared-singleton config (ADR-043)

`rspack.config.mjs` gained (host-only, eager): `@react-navigation/bottom-tabs`, `@react-navigation/drawer`, `react-native-reanimated`, `react-native-worklets`, `react-native-localize`; (host + `pools`, per bundle role): `tamagui`, `i18next`, `react-i18next`. `rspack.config.pools-remote.mjs` gained the latter three (non-eager). `rspack.config.education-remote.mjs` is **unchanged** (confirmed decision, not an oversight — ADR-043).

## 8. Layer 1 tests (React Native Testing Library)

**New suites (16 new tests across 6 new files):**
- `src/domain/i18n/__tests__/resolve-initial-language.test.ts` (6 tests) — pure fallback-ordering logic.
- `src/platform/i18n/__tests__/i18n.test.ts` (3 tests) — device-detection/fallback/stored-locale-wins wiring.
- `src/host/navigation/components/__tests__/header-menu-button.test.tsx` (1 test) — real `Drawer.Navigator` integration (not a mocked dispatch check), proves the actual action-bubbling behavior this bolt relies on.
- `src/host/navigation/__tests__/main-tab-navigator.test.tsx` (3 tests) — tab bar labels, hamburger button present on every tab-root, tab-switch behavior.
- `src/host/navigation/__tests__/root-drawer-navigator.test.tsx` (2 tests) — **the core end-to-end proof of this bolt's two headline deliverables together**: Settings is unreachable except via the hamburger/drawer, and once reached, `AccountSettingsScreen` renders its own header title (no missing-back-button defect).
- `src/host/profile/components/__tests__/locale-switch.test.tsx` — 1 new test added (unification: selecting a locale also switches `i18n.language`, a genuine before/after transition, not a same-value coincidence).

**Existing suites updated for compatibility** (retrofitted components/screens): `account-settings-screen.test.tsx`, `my-pools-screen.test.tsx`, `pool-detail-screen.test.tsx`, `predictions-screen.test.tsx` — all pass unmodified in assertions (string catalogs were written to preserve every pre-existing exact string, confirmed by re-reading each test file's assertions before writing the catalogs — one real mismatch caught this way: `"Enable two-factor authentication"` (row label) vs. `"Two-factor authentication"` (header title) are two different pre-existing strings, now two different catalog keys, not collapsed into one). Both `render-with-query-client.tsx` test-utils (host + `pools` remote) were extended to wrap `TamaguiProvider`/`I18nextProvider` and force `i18n.language = 'en'` for determinism (documented inline: `DEFAULT_LOCALE` is `'es'`, normally corrected only by `AppProviders`' boot effect, which isolated component tests never mount).

**Full suite result:** `yarn jest --forceExit` → **594 tests passing, 85 suites, 0 failures** (up from 578/80 at Bolt 8's close). `yarn tsc --noEmit` clean. `yarn lint` clean (0 errors, 0 warnings — every warning surfaced during Implement, e.g. `react/no-unstable-nested-components` on `headerLeft` closures and three `react-native/no-inline-styles` instances, was fixed, not suppressed).

## 9. Layer 2 (device) — deferred to manual verification by user

Per standing project preference (recorded in `MEMORY.md`/prior sessions): **Layer 2 device/simulator verification is not automated here and `agent-device` was not invoked.** The user performs this pass manually themselves. Recommended manual test paths for this bolt, once picked up:
1. Fresh install, device locale set to English → app boots in English (device-detected default).
2. Fresh install, device locale set to French (unsupported) → app boots in Spanish (`DEFAULT_LOCALE` fallback).
3. Sign in → confirm bottom tab bar shows Home/Predictions/Pools, each with its own back-header behavior if pushed further.
4. Tap hamburger from any tab → Settings drawer opens → tap a nested row (e.g. Change password) → confirm a real back button returns to Account Settings, not a dead end.
5. In Settings, change language to English/Spanish → confirm the entire app chrome (tab labels, drawer, Settings rows) updates immediately, and that `Profile.locale`'s backend sync (`profile.setLocale`) still fires (network tab or backend log).
6. Navigate into the `Pools` tab → confirm the `pools` remote still loads correctly (proves the new `tamagui`/`i18next` MF shared-singleton wiring under a real two-bundle runtime, not just Jest) — this is the one bolt-specific MF risk Jest structurally cannot catch, per this project's standing practice (same class of risk as the Bolt 8 `react-native-svg` incident).
7. Confirm dark mode: toggle the OS appearance and confirm the retrofitted screens (Home, Settings, Predictions chrome, My Pools) switch themes.

Real device/simulator confirmation of these paths is intentionally left to the user's own pass, not attempted here.

**Update (2026-07-06):** the user's first manual pass hit this immediately — app crashed at boot with `Cannot find module 'react-dom'`. Root cause and fix recorded in `adr-045-tamagui-runtime-only-mode.md`'s "Post-Implement correction" section: the `IgnorePlugin` fix that Implement verified via a static bundle build was runtime-broken (throws when the ignored module is actually evaluated, and Tamagui's boot path does evaluate it unconditionally); replaced with a real `resolve.alias` shim (`src/shared/shims/react-dom-native.ts`). Also wired in `@callstack/repack-plugin-reanimated`'s `ReanimatedPlugin` (previously an unaddressed advisory). Both dev servers (host + `pools`) were restarted and the served bundles re-verified directly (not just re-built) to confirm the fix holds under the actual dev-server path the simulator uses, not just a one-off static build. The user should retry their manual verification pass from item 1.

## 10. Summary of new ADRs/decisions this stage produced

- ADR-045 finalized with real probe results (Tamagui version bump + `react-dom` IgnorePlugin, then corrected post-Implement to a `resolve.alias` shim — see §9's update above).
- ADR-046 (new): `react-native-reanimated`/`react-native-worklets` native dependency, discovered mid-Implement, probed and passed — records the process gap (should have been caught at Design) as a lesson for future bolts choosing a navigation/animation library.
- ADR-047 (new, §11 below): tab-bar icon library (`lucide-react-native`, not `@tamagui/lucide-icons`) and the Hermes-parser/`ReanimatedPlugin` build issue it surfaced.

## 11. Second Layer 2 pass (2026-07-06) — 5 real findings, all fixed

The user's manual device/simulator verification (real screenshots) found 5 further defects once the app actually ran, distinct from the earlier `react-dom` boot crash (§9's update, already closed before this pass). All 5 are fixed; Layer 1 re-verified green after each.

### Finding #1 — Tab bar shows a generic default icon, not a real icon per tab

Confirmed root cause (matched the diagnosis relayed with the report): `main-tab-navigator.tsx`'s three `Tab.Screen` entries set `title` but never `tabBarIcon`; `@react-navigation/bottom-tabs` falls back to its own placeholder without one.

**Fix, after a two-round probe (ADR-047 has the full record):**
- `@tamagui/lucide-icons` (the seemingly natural pairing) was installed for a real probe and found to pull in a whole nested `@tamagui/core@1.144.4`/`@tamagui/web@1.144.4` (a nonexistent `2.x` line) — a second, isolated Tamagui engine that would not share this app's real theme context. Rejected, uninstalled.
- **`lucide-react-native`** chosen instead — zero own dependencies, no Tamagui coupling, peer deps already installed.
- A **second, independent build issue** surfaced only via a real dev-server build (not caught by `tsc`/`jest`/a static bundle build): `lucide-react-native/dist/esm/icons/infinity.mjs`'s `const Infinity = ...` failed Hermes' stricter parser ("can't create duplicate variable that shadows a global property"), reached through **both** `@callstack/repack-plugin-reanimated`'s `ReanimatedPlugin` (now constructed with `unstable_disableTransform: true`) **and**, independently, this project's own primary `babel-swc-loader` rule in `rspack.config.mjs` (now excludes `lucide-react-native` — the package needs no JSX/TS/Flow transform, being plain pre-built JS/ESM already). Both fixes were required; the first alone did not resolve it.
- `main-tab-navigator.tsx`: `Home`/`Target`/`Users` icons wired via module-scoped `renderHomeTabIcon`/`renderPredictionsTabIcon`/`renderPoolsTabIcon` functions (same `react/no-unstable-nested-components` discipline as `renderHeaderMenuButton`).
- `rspack.config.mjs`: `lucide-react-native` added as a host-only MF shared singleton (not added to `pools`, which doesn't use icons).
- New test: `main-tab-navigator.test.tsx` asserts the rendered tree contains ≥3 `RNSVGSvgView` host-components (the tag `react-native-svg`'s `<Svg>` renders to) — proving real icons render, not just that no crash occurred.

### Finding #2 — All `PrimaryButton` text looked clipped/cut off

Root cause (not previously diagnosed, investigated fresh): `@tamagui/get-button-sized`'s `getButtonSized()` resolves `Button`'s `height` from the `size` token category while `paddingHorizontal` resolves from the *separate* `space` category, for the same key (e.g. `'$true'`). `tamagui.config.ts` had `space` spread directly from `size` (identical small values, `true: 16`) — fine for `padding`/`gap` props everywhere else in the app, but far too small for `Button`'s own height mechanism: a 16px-tall button clips any real line of text.

**Fix:** `tamagui.config.ts`'s `size` and `space` are now two genuinely separate scales (Tamagui's own convention, confirmed by reading `get-button-sized`'s source) — `space` keeps the original small numbers unchanged (no existing `padding`/`gap` usage anywhere changes), `size` is a new, larger progression with `true: 44` (a standard comfortable tap-target height). `PrimaryButton` itself (`primitives.tsx`) also gained explicit `size="$true"`/`fontSize="$3"` as defense-in-depth. New regression test: `src/shared/design/__tests__/primitives.test.tsx` locks in `height >= 40`.

### Finding #3 — "Pronósticos"/"Ligas" screens showed English text despite a Spanish locale

Two real, confirmed misses in files that were explicitly in-scope for Bolt 9's retrofit (`implement-and-test.md §6`), not previously-deferred screens:
- `src/remotes/pools/PoolsRemoteEntry.tsx` — every screen's header `title` (`'My pools'`, `'Discover pools'`, etc.) was a literal string. Fixed with `useTranslation()` + new `pools.screens.*` catalog keys (kept distinct from `pools.myPools.*`/`pools.detail.*`'s own keys, even where text coincides — same discipline as `settings.rows.twoFactor` vs. `settings.headers.twoFactor`).
- `src/remotes/pools/components/pool-list-item.tsx` — the type/member-count text and the "Archived" badge were fully hardcoded English. Fixed by reusing the *existing* `pools.detail.typePublic`/`typePrivate`/`memberCount` keys `pool-detail-screen.tsx` already correctly used (not new, redundant keys) plus one new `archivedBadge` key.

Both `en.ts`/`es.ts` catalogs updated; new tests `PoolsRemoteEntry.test.tsx` (2 tests, asserting against the native-stack header's `title` prop directly in the rendered JSON tree — `getByText` cannot see native-stack header titles, only a screen's own in-body content) and updated `pool-list-item.test.tsx` (now wrapped in `I18nextProvider`/`TamaguiProvider` via `renderWithQueryClient`).

An audit of the rest of the `pools` remote's in-scope render tree (everything reachable from `MyPoolsScreen`) found no further misses.

### Finding #4 — "Ligas" (My Pools) screen's overall layout looked cramped

Beyond finding #2's button-height fix: `my-pools-screen.tsx`'s 3 action buttons were rewrapped from a cramped `flexWrap` row into a `Card`-wrapped vertical stack of full-width (`alignSelf="stretch"`) buttons — reads much better with the longer Spanish labels than an awkward multi-line wrap. `pool-list-item.tsx` was also switched from plain `StyleSheet` to Tamagui primitives (`XStack`/`YStack`/`Text`) for real visual polish — a deliberate, narrow, documented exception to this bolt's own "FlashList rows stay `StyleSheet`" rule (that rule's rationale is about *large* lists like Predictions' ~104-match fixture grid; the pools list is typically small, so the same per-row runtime-style-resolution cost concern doesn't hold here). The Predictions fixture list itself is unaffected.

### Finding #5 — Hamburger menu disappears once inside Settings

Confirmed root cause: `AccountSettingsScreen` (the Settings drawer-stack's *root* screen, analogous to each tab's own root screen) never set `headerLeft`, unlike every tab-root screen in `main-tab-navigator.tsx`. Once inside Settings, there was no way back to the drawer short of a hardware/gesture back action.

**Fix:** `renderHeaderMenuButton` was promoted from a `main-tab-navigator.tsx`-local function to a proper shared export on `header-menu-button.tsx` itself, and `root-drawer-navigator.tsx` now imports and applies it to `AccountSettings`' own `options.headerLeft`. New regression test in `root-drawer-navigator.test.tsx`: navigates into Settings via the drawer and confirms exactly one "Open menu" button is now findable (React Navigation correctly hides the backgrounded `MainTabs` screen from the accessibility tree, so this isn't ambiguous).

### Verification

`yarn tsc --noEmit` clean, `yarn lint` clean (0 errors, 0 warnings), `yarn jest --forceExit` → **599 tests passing, 87 suites** (up from 594/85) — 5 new tests across 3 new files (`primitives.test.tsx`, `PoolsRemoteEntry.test.tsx` ×2) plus additions to `main-tab-navigator.test.tsx`/`root-drawer-navigator.test.tsx`/`pool-list-item.test.tsx`. The `lucide-react-native`/`ReanimatedPlugin`/Hermes-parser fix (finding #1) was additionally confirmed against a real running dev server and a fetched, inspected bundle (not just a static build) before this pass was closed — see ADR-047.

**Layer 2 is the user's own manual pass, per standing preference — not automated here, `agent-device` was not invoked, and no dev server/simulator was started for this pass beyond the one-time confirmation above.** What to specifically retest: all 5 items above (tab icons visible, button text not clipped, Spanish pools/my-pools screens fully in Spanish, My Pools screen's improved layout, hamburger button present and working from inside Settings) — plus a re-check of the original boot-crash fix (§9's update) and the general paths listed in §9, since this pass touched shared infrastructure (`tamagui.config.ts`'s token scale, `rspack.config.mjs`'s loader rules).
