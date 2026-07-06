# Bolt 9 — Model

> **Bolt:** 9 — Navigation, i18n & Design Retrofit
> **Depends on:** Bolt 8 (closed at Layer 1, mobile+backend; Layer 2 device pass in progress independently)
> **Not story-based** — cross-cutting retrofit (`bolt-plan.md` Bolt 9). This Model stage defines the ubiquitous language for the retrofit itself and reconciles it against the actual registered screens, not an assumed shape.

## 1. Confirmed current state (read directly from code, not assumed)

Verified against `src/host/navigation/root-navigator.tsx`, `src/host/auth/navigation/screen-registry.ts`, `src/host/auth/navigation/auth-stack-params.ts`, `src/host/auth/navigation/auth-gated-navigator.tsx`:

- `AppStack` (one `native-stack` navigator) currently registers exactly four routes: `Home`, `Predictions`, `Pools`, `Settings`.
- `Home` is a hub screen with three `Button`s that `navigation.navigate()` push `Predictions`, `Pools`, `Settings` onto the same stack — this is the literal mechanism behind the user's "everything lives on Home" complaint.
- `Pools` (line 176-180) and `Settings` (line 181-185) are both registered with `options={{ headerShown: false }}` and no custom header — confirmed root cause of the missing-iOS-back-button defect (NFR-10.3). `Predictions` (line 171-175) has no `headerShown: false` and does get a native back button today — it is not part of the defect, only of the "everything under Home" complaint.
- `Settings` mounts `SettingsStackNavigator`, its own nested `native-stack` with 8 rows: `AccountSettings`, `ChangeNickname`, `ChangeAvatar`, `ChangeLocale`, `ChangePassword`, `ChangeEmail`, `TotpEnrollment`, `DeleteAccount`. Because the parent `Settings` route suppresses its header, none of these nested screens has a way back to `Home` either (though pushes *within* `SettingsStackNavigator` do get their own back buttons from each screen's own header, since only the parent route's header is suppressed — confirmed by inspecting the nested navigator, which sets no `headerShown` override of its own).
- `Pools` mounts the `pools` federated remote's own internal navigator (`PoolsRemoteApp`, exposed as `pools/App`) — its internal screens (`my-pools-screen.tsx`, `discover-pools-screen.tsx`, `create-pool-screen.tsx`, `join-by-token-screen.tsx`, `pool-detail-screen.tsx`, `pool-settings-screen.tsx`, `pool-predictions-screen.tsx`) are invisible to the host's registry — same as ADR-032/034 described. `headerShown: false` on the host's `Pools` route suppresses only the outer wrapper the remote is mounted into; whatever the remote's own internal navigator does for its own screens' headers is unaffected by this bolt's host-level fix (confirmed not a host-registry concern — flagged for Design stage to double check the remote's own internal headers are fine, since the remote is out of this bolt's direct edit scope beyond its `rspack.config.pools-remote.mjs` shared-singleton list).
- `AuthGatedNavigator` (ADR-001) renders one of five branches by guard outcome: `UnauthenticatedTree`, `VerifyEmailTree`, `MfaChallengeTree`, `OnboardingTree`, or `renderAppTree()` (currently `AppTree`, the flat `AppStack`). Only the last branch is this bolt's concern — the other four are unaffected in principle, but must be re-verified to still render correctly once `renderAppTree`'s prop (currently a plain stack) becomes a tab+drawer tree (flagged explicitly in `system-context.md §7`).
- `useLocaleStore` (Bolt 3, ADR-013) is a Zustand store, AsyncStorage-persisted under key `profile.locale`, hydrated once at `AppProviders` mount (before `RootNavigator`), default `'es'` (ADR-012) used only when nothing is yet in AsyncStorage. `LocaleSwitch` (reused by `ChangeLocaleScreen`) calls `setLocale()` (updates the store + AsyncStorage immediately) and `useSetLocaleMutation()` (backend sync) together, on explicit user selection only — it never reads any device-locale API today. This is the exact integration point ADR-041 point 3 designates for i18next wiring.
- No i18n library exists anywhere in the repo (confirmed: no `i18next`/`react-i18next`/`react-native-localize` in `package.json`). Every screen's strings (Bolts 5-8 included) are hardcoded English literals in JSX.
- No design-system/theming library exists (confirmed: no `tamagui` in `package.json`). Every screen uses plain RN `StyleSheet.create()` with ad hoc hex colors (`#ccc`, `#2e7d32`, etc.) — no shared token file.
- MF shared-singleton lists (`rspack.config.mjs`, `rspack.config.pools-remote.mjs`, `rspack.config.education-remote.mjs`) currently share: `react`, `react-native`, `@react-navigation/native`, `@react-navigation/native-stack`, `react-native-safe-area-context`, `react-native-screens`, plus (pools-only-consumed-so-far) `@shopify/flash-list`, `@tanstack/react-query`, `react-native-svg`. Neither `@react-navigation/bottom-tabs`, `@react-navigation/drawer`, `i18next`/`react-i18next`, `react-native-localize`, nor `tamagui` are present in any of the three configs yet — confirms `tech-stack.md`'s "pending additions" note.

## 2. Ubiquitous language for this bolt

| Term | Definition in this app's domain |
|---|---|
| **Module** | A cohesive, user-facing feature area that owns its own in-module navigation history (its own native-stack). Three modules exist today: **Home** (dashboard/landing), **Predictions**, **Pools**. Two more join later as tabs when their bolts ship: **Rankings** (Bolt 10), **Education** (Bolt 12) — out of this bolt's scope to build, but the tab container must not need a reshape to add them. |
| **Tab** | A persistent, always-visible entry point into exactly one module, rendered by the bottom tab navigator. A tab is not itself a screen — it is a route into a module's own native-stack, so in-module pushes (e.g. Pools → Pool Detail → Pool Settings) always retain their own back affordance, independent of the tab bar. |
| **Drawer route** | A screen (or stack of screens) reached via the hamburger affordance, not the tab bar, because it is not a peer "module" the way Predictions/Pools are — it is account/app configuration, secondary to the primary task loop. `Settings` (and its 8 existing nested rows) is the only drawer route today. |
| **Drawer-hosted stack** | `Settings`'s existing `SettingsStackNavigator` (8 screens), unchanged internally — only its *mounting point* moves from an `AppStack` push to a drawer screen. |
| **App-chrome UI language** | The `i18next`/`react-i18next` active language governing rendered string catalogs (buttons, labels, errors) — distinct from `Profile.locale` (see below). Two supported values: `es`, `en`. |
| **Profile locale** | `Profile.locale` (`src/domain/profile/locale.ts`, ADR-012/PROFILE-3) — a persisted business-data field, explicit-user-choice, backend-synced. Coexists with, does not by itself drive, app-chrome UI language except via the explicit-choice unification ADR-041 proposes (open question, reconfirmed at Design stage below). |
| **Design token** | A named, theme-aware primitive value (spacing/color/typography/radius) sourced from Tamagui's token system — never a literal hex/px value written directly into a component's style. |
| **Back affordance** | Either React Navigation's native default back header (the common case) or an explicit custom header component supplying equivalent back behavior — NFR-10.3's bar for "every pushed screen must have one unless it deliberately supplies its own." |

## 3. Module → placement mapping (confirmed against `screen-registry.ts`, not assumed)

| Existing/planned route | Registry tag today | New container | Notes |
|---|---|---|---|
| `Home` | `protected` | **Tab** ("Home") | Loses its 3-button hub role; becomes a real landing/dashboard screen (Design stage decides its content — likely a welcome/summary screen, not just buttons that duplicate tabs). |
| `Predictions` | `protected` | **Tab** ("Predictions") | Already has a working back header for any future in-module push; becomes the tab's own stack root. |
| `Pools` | `protected` | **Tab** ("Pools") | Remote-mounted (ADR-032/034) — becomes the tab's own stack root; `headerShown: false` bug fixed here (see §4). |
| `AccountSettings` + 7 nested rows | `protected` | **Drawer route** ("Settings") | Moves out of `AppStack`, into a `Drawer.Screen` mounting the unchanged `SettingsStackNavigator`; drawer opened via a hamburger button placed in each tab's stack header (Design stage decides exact header-button wiring). |
| `Rankings` (Bolt 10, not yet built) | n/a | **Tab** (future) | Not built in this bolt — confirming the tab container can accept a 4th tab without reshaping is a Design-stage non-functional check. |
| `Education` (Bolt 12, not yet built) | n/a | **Tab** (future) | Same as above. |

No route changes ownership across the Module Federation boundary because of this remap — `pools` remains the sole owner of its own internal screens (system-context.md §7's explicit non-goal), only the **host's** container around it changes from a stack push to a tab root.

## 4. Back-button defect — confirmed root cause and fix scope

- **Root cause:** `options={{ headerShown: false }}` on `Pools` and `Settings` in `root-navigator.tsx`, with no custom header supplied by either route.
- **Fix scope (Model-level):** once `Pools` becomes a tab-root screen and `Settings` becomes a drawer-mounted screen, neither is "pushed onto a stack that needs a back button from its parent" in the old sense — a tab root and a drawer root do not require a back button (there is nothing to go back to; the tab bar/drawer itself is the way "back"). The *original* NFR-10.3 defect (no back button on a **pushed** screen) is therefore resolved structurally by the retrofit itself for these two routes, not by adding a header back to them. **What must still be explicitly checked at Design stage:** every screen pushed *within* a tab's own stack (e.g. `Predictions` if it ever grows sub-screens, `Pools`'s remote-internal pushes, `Settings`'s 7 nested rows) must not carry `headerShown: false` without its own custom back affordance — this is the durable form of NFR-10.3, an invariant to check on every future screen addition, not a one-time patch.

## 5. i18n — Model-level scope, ADR-041's open question surfaced

`change-locale-screen.tsx`/`locale-switch.tsx`/`locale-store.ts` are the exact integration seam ADR-041 already identifies. Model stage does not resolve ADR-041's open question (device-detected vs. profile-stored locale: fully independent vs. unified) — it is explicitly deferred to the Design-stage checkpoint below, per the task brief's instruction not to guess. What Model stage does confirm: no other screen in the repo currently touches locale/language state, so the blast radius of whichever answer is chosen is confined to `AppProviders` (i18next init + `react-native-localize` read) and `locale-switch.tsx`/`change-locale-screen.tsx` (the one existing explicit-choice UI) — not spread across every screen.

## 6. Design-pass scope (Model-level bounding, detail deferred to Design)

Confirmed inventory of screens carrying hardcoded strings that need extraction, and plain-`StyleSheet` screens that are candidates for the Tamagui token pass (per bolt-plan.md's "Bolts 5-8's screens... currently hardcoded" instruction):
- Host: `predictions-screen.tsx` + its component tier (`src/host/predictions/`), `src/host/settings/screens/*` (5 screens), `src/host/profile/screens/*` (change-nickname/change-avatar/change-locale + 5 onboarding screens), `root-navigator.tsx`'s own `HomeScreen`.
- Shared: `src/shared/competition/` components (fixture list, match card, team badge, flag badge, live indicator).
- Remote: `src/remotes/pools/screens/*` (7 screens) + `src/remotes/pools/components/*`.

Model stage does not prescribe which of these get a full Tamagui rewrite vs. a StyleSheet-with-tokens touch-up — that granularity is a Design-stage decision (NFR-10.5 explicitly says "not a wholesale rewrite mandate").

## 7. Open questions carried into Design (not resolved here)

1. **ADR-041's open question** (device-detected vs. profile-locale: independent or unified) — must be put to the user explicitly at the Design checkpoint, per the task brief.
2. Whether `i18next`/`react-i18next` need MF-shared-singleton treatment (tech-stack.md flags this as "to be confirmed at Design stage").
3. Exact hamburger-button placement/wiring per tab (each tab's own stack header, or a single shared component) — Design stage.
4. Whether `HomeScreen`'s content is redesigned into a real dashboard or kept minimal-but-tab-rooted — Design stage, bounded by NFR-10.5 but not fully specified by it.

---

**Checkpoint:** Model stage complete. Proceeding to Design stage per task instructions (batched report at the end covers both). Awaiting approval before Implement.
