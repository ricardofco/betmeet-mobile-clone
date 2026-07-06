# Bolt 9 — Design

> Builds on `model.md`. Confirms host-vs-remote placement (Re.Pack MF conventions), resolves the MF-shared-singleton question `tech-stack.md` flagged as pending, and surfaces ADR-041's open question for an explicit user decision before Implement.

## 1. Navigation shell shape

Replaces the flat `AppStack` (`root-navigator.tsx`'s `AppTree`, mounted by `AuthGatedNavigator`'s `renderAppTree` per ADR-001) with a nested **Drawer → Tabs → per-tab native-stack** tree. `AuthGatedNavigator`'s own contract is untouched: `renderAppTree: () => React.ReactElement` still renders exactly one branch on guard `proceed`/`redirect-to-home` (ADR-001 stands, reconfirmed not re-litigated).

```
RootDrawer (createDrawerNavigator)                    ← new, host-only
 ├─ Screen "MainTabs" → MainTabNavigator             (headerShown: false — each
 │                                                      tab's own stack supplies
 │                                                      its own header)
 └─ Screen "Settings" → SettingsStackNavigator        (headerShown: false — each
                                                         of its 8 existing rows
                                                         already supplies its own
                                                         header; unchanged)

MainTabNavigator (createBottomTabNavigator)            ← new, host-only
 ├─ Tab "HomeTab"        → HomeStack   (root screen: Home)
 ├─ Tab "PredictionsTab" → PredictionsStack (root screen: Predictions)
 └─ Tab "PoolsTab"       → PoolsStack  (root screen: Pools, mounts the `pools`
                                          remote's own internal navigator,
                                          unchanged — ADR-032/034)

Each *Stack = createNativeStackNavigator with exactly one root screen today
(Home / Predictions / Pools) — the existing route names, unchanged, so
`screen-registry.ts`'s `SCREEN_REGISTRY` keys and `ScreenClass` tags need
zero edits. Each root screen's header gets `headerLeft: () => <HeaderMenuButton />`
which dispatches `DrawerActions.openDrawer()` — React Navigation bubbles an
unhandled action up through parent navigators automatically, so this works
from a screen nested two levels below the Drawer (Stack → Tab → Drawer)
without manual `getParent().getParent()` chaining.
```

**Route-name stability, confirmed:** `Home`, `Predictions`, `Pools`, `Settings` (+ its 8 nested rows) keep their exact existing names. Only their *container* changes. `screen-registry.ts` requires **no edits** — `evaluateGuard`/`screenClassFor` (ADR-001) operate on route names, not container shape. This was flagged as a re-verification item in `system-context.md §7`; confirmed here at Design stage, not deferred further.

**`Home` screen content:** the 3-button hub role (Predictions/Pools/Settings buttons) is removed — redundant with the new tab bar / drawer. `HomeScreen` becomes a minimal real landing screen (welcome/dashboard-shaped placeholder; no new business content invented — out of scope beyond NFR-10.5's visual pass). The Bolt-0 "Load education remote" demo affordance is **kept**, relocated to a less prominent spot on the redesigned Home screen (still the only exercised path for Bolt 0's still-open `RemoteBoundary` fallback-path Layer 2 item — removing it would regress that, not requested by anyone).

**Future tabs (Bolt 10 Rankings, Bolt 12 Education):** `MainTabNavigator` is designed to accept additional `Tab.Screen`s without a reshape — confirmed as a non-functional Design check, not built now.

**Hamburger icon:** a plain glyph (`"☰"`), not a new icon-font/vector-icon dependency — consistent with this project's standing discipline of not adding a new native/asset dependency mid-bolt without being asked (same precedent as Bolt 7's `@react-native-clipboard/clipboard` deferral). A real icon set is a future polish item.

## 2. Host vs. federated-remote placement (Re.Pack MF conventions)

**No change to Module Federation boundaries** — confirmed against `system-context.md §7`'s explicit non-goal:
- The Drawer/Tab navigation shell itself is 100% host code (`src/host/navigation/`) — `pools`/`education` never import `@react-navigation/bottom-tabs` or `@react-navigation/drawer` for their own routing; they remain single-exposed-module remotes (`pools/App`, `education/App`) mounted as the content of one tab-root screen, exactly as ADR-032/034 already established. The host doesn't know or care about `pools`'s internal screens.
- **What does cross the boundary:** the *styling* and *string* layers. Per `bolt-plan.md`'s explicit instruction ("apply Tamagui to at least the navigation shell and Bolt 5-8 screens"), Bolt 7/8's screens physically live inside `src/remotes/pools/` — so `pools`' own screens will import Tamagui components and `react-i18next`'s `useTranslation()` directly. This makes `tamagui` and `i18next`/`react-i18next` genuine **cross-bundle** concerns, unlike `@react-navigation/bottom-tabs`/`drawer` (host-only) or `react-native-localize` (host-only device-detection wiring, read once at boot).

## 3. MF shared-singleton resolution (tech-stack.md's pending item, resolved here)

| Package | Host shared? | `pools` remote shared? | `education` remote shared? | Rationale |
|---|---|---|---|---|
| `@react-navigation/bottom-tabs` | **Yes** (eager) | No | No | Host-only usage — neither remote renders tabs itself. Same reasoning as why `@shopify/flash-list` wasn't added to remote configs before a remote actually used it (Bolt 7/ADR-034 precedent: add on first real cross-bundle consumption, not preemptively). |
| `@react-navigation/drawer` | **Yes** (eager) | No | No | Same as above — host-only. |
| `tamagui` (+ `@tamagui/core`/`@tamagui/config`, single `TamaguiProvider`/theme context) | **Yes** (eager) | **Yes** (non-eager) | No (education remote is not in this bolt's Tamagui-retrofit scope — still a demo shell) | `pools` screens will render Tamagui components reading from the host's one `<TamaguiProvider>` context. This is the **exact same risk class** as the `@tanstack/react-query` QueryClient-singleton incident (ADR-034) and the `react-native-svg` Fabric double-registration incident (Bolt 8) — a duplicated Tamagui module in the remote would create a second, disconnected theme/context instance, silently breaking theming (not necessarily crashing, which makes it a worse, quieter bug than the SVG case). Recorded as its own ADR (ADR-043) given the precedent of "every MF shared list needs deliberate audit, not incremental on-device discovery" (`activeContext.md`). |
| `i18next`, `react-i18next` | **Yes** (eager) | **Yes** (non-eager) | No (same reasoning as tamagui — education is out of this bolt's screen-retrofit scope) | `pools` screens call `useTranslation()` directly; must resolve to the host's one initialized `i18next` instance (same translation state, language-change events must propagate to every bundle). |
| `react-native-localize` | **Yes** (eager) | No | No | Only read once, at boot, by the host's `platform/i18n` init wiring — no remote calls it directly. Native module presence (requirements.md §7.5's federation caveat) is irrelevant here since it has no UI-rendering consumer in any remote. |

`education` remote: left out of the `tamagui`/`i18next` shared list for now (not retrofitted this bolt — still Bolt 0's demo shell) but **is** included in the back-button/`headerShown` audit (bolt-plan.md: "every remote-owned stack"), since that's a structural navigation check, not a styling/string one.

## 4. i18n architecture

Following the project's existing `domain/` (framework-free) vs. `platform/` (SDK-wiring) layering (ADR-003's precedent: pure decision logic in `domain/`, adapter/wiring in `platform/`/`host/`):

- **`src/domain/i18n/resolve-initial-language.ts`** (new, framework-free, unit-testable without RN/i18next/AsyncStorage imports): pure function `resolveInitialLanguage(input: { storedProfileLocale: AppLocale | null; deviceLocales: string[] }): AppLocale`. Implements ADR-041's fallback ordering: if `storedProfileLocale` is non-null (meaning the user has explicitly chosen a locale at least once via PROFILE-3 — see next bullet for how that's detected), return it; otherwise pick the best match from `deviceLocales` against `['es','en']`, defaulting to `'es'` if none match. This is the same "advisory client logic isolated behind one pure function" discipline as `evaluateGuard`/`getPredictionEligibility`.
- **Detecting "has the user ever explicitly chosen a locale":** confirmed by re-reading `locale-store.ts`'s `hydrate()` — it only ever calls `AsyncStorage.setItem('profile.locale', ...)` from `setLocale()` (explicit user action via `LocaleSwitch`); the fallback-to-default path never writes to AsyncStorage. **Therefore the mere presence of the `profile.locale` AsyncStorage key is already a reliable "explicit choice happened" signal** — no new sentinel key needed. `platform/i18n/i18n.ts`'s init reads this key directly (not through the Zustand store, to avoid a hydration-timing race between two independent stores/effects both reading the same key at boot).
- **`src/platform/i18n/i18n.ts`** (new, platform-layer wiring, sibling to `platform/supabase`/`platform/backend-api`): creates and configures the `i18next` instance (resource catalogs for `es`/`en`, initial language `DEFAULT_LOCALE` synchronously at module load so `react-i18next` has *something* to render immediately), then asynchronously (called from `AppProviders`, same "loading splash already covers the async gap" pattern as ADR-013's locale-store hydration) reads `react-native-localize`'s device locales + the AsyncStorage key, calls `resolveInitialLanguage()`, and calls `i18next.changeLanguage()` with the result before the app's real UI needs to render meaningfully. No new splash state — `AuthGatedNavigator`'s existing `status === 'loading'` splash (already covering locale-store hydration) covers this too, since both run in parallel during the same boot window.
- **`change-locale-screen.tsx` / `locale-switch.tsx`** (Bolt 3, PROFILE-3): gains one additive call — `i18n.changeLanguage(value)` alongside its existing `setLocale(value)` (local store) and `syncLocale(value)` (backend mutation) calls, per ADR-041 point 3. **This is exactly the open question below** — the wiring only happens this way if the user confirms unification.
- **String catalogs:** two new JSON/TS resource files (`en.json`, `es.json` or equivalent per-namespace files) under `src/platform/i18n/locales/` — exact granularity (one giant catalog vs. per-feature namespaces) is an Implement-stage detail, not a Design-stage architectural decision; either shape satisfies this Design.

### 4.1 ADR-041's open question — needs an explicit user decision before Implement

Per the task brief, this is **not resolved here** — it is surfaced for the checkpoint:

> Should `Profile.locale` (persisted business-data field, e.g. for future email/notification-copy language) and the app-chrome UI language be **fully independent** (a user could have `Profile.locale = 'es'` while the UI renders in `en` because their device is English and they never opened Settings), or **unified** (one explicit choice in the existing `ChangeLocaleScreen` drives both, which is ADR-041's current working-assumption Decision)?

ADR-041's Decision (unification) is what this Design assumes for §4's wiring above (`change-locale-screen.tsx`'s additive `i18n.changeLanguage()` call). **If you want full independence instead**, only that one wiring point changes (the additive call is removed; `i18next`'s language would then only ever be set by device detection + a *separate*, not-yet-specified, language-only switcher) — the domain function, platform init module, and MF-singleton decisions above are unaffected either way.

## 5. Tamagui setup

- **Provider placement:** `<TamaguiProvider>` wraps the entire host tree, outermost inside `AppProviders` (same level as `GestureHandlerRootView`/`SafeAreaProvider`/`QueryClientProvider`) — so the theme context exists before `RootNavigator` (and therefore any remote) ever mounts.
- **Theme:** light/dark driven by the already-used `useColorScheme()` (currently only wired to `StatusBar.barStyle` in `App.tsx`) — extended to also pick `TamaguiProvider`'s `defaultTheme` prop (`'light' | 'dark'`), so theming is dark-mode-aware from the start (per the persona's design-standards instruction), not a later retrofit.
- **Tokens:** one `tamagui.config.ts` (repo root, sibling to `rspack.config.mjs`, matching how Tamagui's own docs and RN-community examples structure it) defining spacing/color/radius/typography tokens + the light/dark theme pair. Every retrofitted screen composes these tokens (via Tamagui's `styled()`/primitives) — never a literal hex/px value, per the design-standards instruction.
- **No Rspack-specific optimizing compiler plugin.** Tamagui's static-extraction compiler integrations are Babel/Next/Metro-specific; no verified Rspack equivalent exists. Tamagui explicitly supports a "runtime-only" mode (plain `createTamagui()` + `TamaguiProvider`, components imported directly from `tamagui`/`@tamagui/core`) with no compiler — this is what this bolt uses. This is a genuine trade-off (no compile-time style flattening/extraction, runtime style resolution cost only) — not a correctness risk, so it does **not** block Design, but **does** warrant a build probe at the start of Implement (does `tamagui`'s package-exports resolve cleanly under Re.Pack's `enablePackageExports: true`, the same class of gotcha `rspack.config.mjs`'s `installedVersion()` workaround already had to handle for React Navigation's dual ESM/CJS packages). Recorded as ADR-045 with an explicit "probe before building any screen on top of it" instruction, per the persona's native-dependency-probe discipline — extended here to a bundler-integration probe, since Tamagui has no native/podspec surface but does have a real "does it resolve under this exact bundler" unknown.

## 6. Back-button fix — Design-level mechanism

- `Pools`/`Settings`'s **structural** fix is the container change itself (§1) — as tab-root / drawer-root screens they no longer need a "back to Home" affordance (there's no forward-push relationship to Home anymore; the tab bar/drawer *is* the wayfinding mechanism). This resolves the two concretely-named routes in the defect report.
- **Durable invariant going forward (not just a one-time patch):** any screen registered with `headerShown: false` must supply its own equivalent back affordance, or must be a tab-root/drawer-root screen (which don't need one). This is checked now across every existing `headerShown: false` occurrence in `root-navigator.tsx`, `auth-gated-navigator.tsx` (the `MfaChallengeTree`, which deliberately has no back button — confirmed correct per its own comment: "no back button... user exits by successful verification or sign-out," an intentional exception, not a defect), and every remote's own internal navigators (`pools`' 7 screens, `education`'s shell) — audited at Implement time, recorded as a checklist in `implement-and-test.md`, not re-decided per-screen here.

## 7. Summary of decisions requiring ADRs (written next stage)

1. **ADR-042** — Nested Drawer→Tabs→per-tab-stack navigation shell shape; route-name stability; hamburger-button bubble-dispatch mechanism; `AuthGatedNavigator`/ADR-001 reconfirmed unaffected.
2. **ADR-043** — MF shared-singleton resolution for this bolt's new packages (§3 table) — extends ADR-002/034's precedent to `tamagui`/`i18next`/`react-i18next` (host+pools) and `bottom-tabs`/`drawer`/`react-native-localize` (host-only).
3. **ADR-044** — i18n architecture: `domain/i18n/resolve-initial-language.ts` pure function + `platform/i18n/i18n.ts` wiring + the AsyncStorage-key-presence signal for "explicit choice happened" (no new sentinel key) + ADR-041's unification wiring point, contingent on the open question's answer.
4. **ADR-045** — Tamagui adopted in runtime-only mode (no Rspack-specific compiler plugin); build-probe instruction before Implement proceeds to screen-level work.

---

**Checkpoint:** Design stage complete. **One decision is needed from the user before Implement:** §4.1's ADR-041 open question (unified vs. independent locale). Everything else in this Design is ready to proceed to the ADR stage without further input, but ADR-044's exact final shape depends on that answer.
