# Bolt 12 — Implement & Test

Consolidates the Implement (stage 4) and Test (stage 5, Layer 1) stages for
Bolt 12 (Education), per `model.md`/`design.md`/ADR-052 through ADR-056
(all checkpoint-approved). Layer 2 (device) is deferred to the user's own
manual pass per standing preference — see §7.

## 1. Files created/modified

**Domain** (`src/domain/education/`, framework-free):
- `rule-content.ts` — `getFullRules(locale)`, `RuleContentBlock`/`RuleDocument`
  types (ADR-055's typed-blocks decision).
- `cue-store.ts` — `storageKey(cueId)`, the pure part of EDU-4.
- `index.ts` — barrel export.

**Platform** (`src/platform/education/`):
- `cue-store.ts` — `shouldShowCallout`/`dismissCallout`, the async
  `AsyncStorage`-backed half of EDU-4 (fail-open contract).

**`education` remote** (`src/remotes/education/`):
- `EducationRemoteEntry.tsx` — Bolt 0's demo shell replaced entirely with
  real EDU-1/EDU-2/EDU-4 content (header, `RulesAccordion`, worked example,
  `ScoringCalculator` behind its error boundary, two `DismissibleCallout`s).
  Single scrollable screen, no internal navigator (design.md §1.2 point 5).
- `components/rule-content-renderer.tsx`, `rules-accordion.tsx` (EDU-1).
- `components/scoring-calculator.tsx`, `calculator-error-boundary.tsx`,
  `scoring-table.tsx`, `score-breakdown-explainer.tsx`,
  `score-breakdown-demo.tsx` (EDU-2 + its twin components, ADR-054).
- `components/dismissible-callout.tsx`, `hooks/use-dismissible-cue.ts` (EDU-4).
- `test-utils/render-with-providers.tsx` — Tamagui+i18next test wrapper
  (mirrors `pools`' copy, no `QueryClientProvider` — zero backend capability).
- `index.js` — unchanged export shape.

**Host**:
- `src/host/navigation/screens/education-screen.tsx` — new pushed-route
  wrapper (`lazy(() => import('education/App'))` + `RemoteBoundary`),
  relocated from Bolt 0's inline Home-screen toggle (ADR-053).
- `src/host/navigation/screens/home-screen.tsx` — button now does a real
  `navigation.navigate('Education')` push instead of an inline toggle-render.
- `src/host/auth/navigation/auth-stack-params.ts` — `HomeStackParamList`
  gains `Education: undefined`.
- `src/host/auth/navigation/screen-registry.ts` — `Education: ['protected']`.
- `src/host/navigation/main-tab-navigator.tsx` — registers the `Education`
  screen on `HomeStack` (not a tab root — no `headerLeft` menu button, native
  back button supplied by the stack).
- `src/host/profile/screens/onboarding-rules-screen.tsx` — real EDU-3 body
  (title/description, `OnboardingScoringSummary`, an informational —
  non-tappable — line about the Rules Center). Wizard skip/done/advance
  machinery untouched.
- `src/host/profile/components/onboarding-scoring-summary.tsx` — the host's
  own twin of the `education` remote's `ScoringTable` (ADR-054), no
  cross-boundary import.

**MF config**:
- `rspack.config.mjs` (host) — `@react-native-async-storage/async-storage`
  added to shared config (already had `tamagui`/`i18next`/`react-i18next`
  from Bolt 9).
- `rspack.config.education-remote.mjs` — real retrofit, first time this
  config gets anything beyond Bolt 0's demo-shell shape:
  - `resolve.alias['react-dom']` → `src/shared/shims/react-dom-native.ts`
    (same fix as `pools`, ADR-045 — Tamagui's `@tamagui/popper`/
    `@tamagui/floating` unconditionally `require('react-dom')` on native).
    **Found and fixed during this bolt's own build probe** (§2) — not
    anticipated in Design, since Design didn't re-derive every prior
    per-remote Tamagui fix explicitly.
  - `sharedDeps()` gains `tamagui`/`i18next`/`react-i18next`/
    `@react-native-async-storage/async-storage` (all four `singleton: true`).

**i18n**: `src/platform/i18n/locales/{en,es}.ts` — `rules.*`, `scoring.*`,
`education.cues.*`, `onboarding.rulesStep*`, `home.openRulesCenter` keys.

## 2. ADR-056 build probe — run for real, evidence below

ADR-056 was written at ADR stage as **unproven, pending Implement**. This
probe actually ran (2026-07-06):

1. `yarn start:education` (port 8082) — bundled with **zero errors**.
   First attempt hit a real error (`Module not found: Can't resolve
   'react-dom'` in `@tamagui/popper`/`@tamagui/floating`) — fixed via the
   `react-dom` shim alias (§1), same fix `pools`/host already carry
   (ADR-045). Second attempt: clean build, only the same benign Tamagui
   "Critical dependency: require function..." warnings already accepted
   elsewhere in this project.
2. `curl http://localhost:8082/education.container.js.bundle?platform=ios`
   → `200`, 475KB.
3. `curl http://localhost:8082/ios/mf-manifest.json` → inspected directly:
   `@react-native-async-storage/async-storage` present in `shared` with
   `"singleton": true`, `"version": "3.1.1"`; `tamagui`/`i18next`/
   `react-i18next` also present as shared, non-bundled entries.
4. `yarn start` (host, port 8081) — bundled with zero errors.
   `curl http://localhost:8081/index.bundle?platform=ios` → `200`, 17MB.
5. Checked both dev-server logs for the `react-native-svg` incident's own
   error signature (`Invariant Violation`, "already registered",
   "duplicate") — none found.

**Result: PASS.** `@react-native-async-storage/async-storage` is confirmed
safe as a cross-bundle MF shared singleton. ADR-056 updated in place to
record this outcome (no longer "pending"). Both dev servers stopped
cleanly after the probe — this is a build-time proof, not a device run
(Layer 2 remains the user's manual pass, §7).

## 3. Test stage — final counts

**Mobile: 661 tests across 102 suites** (all passing), `yarn tsc --noEmit`
and `yarn lint` both clean.

New/extended suites this bolt:
- `src/domain/education/__tests__/rule-content.test.ts` — 5 documents per
  locale, sorted by `order`, well-formed `RuleContentBlock` shapes, all 5
  expected slugs present.
- `src/domain/education/__tests__/cue-store.test.ts` — `storageKey()` purity.
- `src/platform/education/__tests__/cue-store.test.ts` — happy path +
  fail-open path (mocked `AsyncStorage` rejection on both `getItem`/`setItem`).
- `src/remotes/education/components/__tests__/rules-accordion.test.tsx` —
  collapsed-by-default, expand/collapse, independent per-section state.
- `src/remotes/education/components/__tests__/scoring-calculator.test.tsx` —
  live recompute, **the tied-penalty-shootout regression case** (design.md
  §13's named highest-risk item, mirroring Bolt 10's own "explicit
  tied-entries test" discipline): a tied predicted shootout (4-4) is flagged
  invalid instead of picking a winner, and the bonus correctly drops out of
  the total (6 → 5) rather than silently guessing a winner.
- `src/remotes/education/components/__tests__/calculator-error-boundary.test.tsx`
  — no-op when healthy, degrades to the static `ScoringTable` fallback when
  the calculator throws.
- `src/remotes/education/components/__tests__/dismissible-callout.test.tsx`
  — shown-by-default, dismiss-on-tap, persisted-dismissal-across-remount,
  independent per-`cueId` state.
- `src/remotes/education/hooks/__tests__/use-dismissible-cue.test.tsx` —
  fail-open loading gap (`visible: true` before the async read resolves),
  resolves-to-hidden-if-already-dismissed, optimistic `dismiss()`.
- `src/host/profile/components/__tests__/onboarding-scoring-summary.test.tsx`.
- `src/host/profile/screens/__tests__/onboarding-rules-screen.test.tsx` —
  real content render, no tappable Rules-Center link (design.md §5.1),
  Continue/Skip still advance the wizard (regression check against Bolt 3's
  existing behavior — see §4 for a test-authoring fix this required).

## 4. Bugs found and fixed during Test-stage verification

Four real issues were found while independently re-verifying this bolt's
test suite (all in test code, not application code, except where noted):

1. **`renderHook`/`unmount` not awaited (RNTL v14 async APIs).**
   `use-dismissible-cue.test.tsx` called `renderHook(...)` and
   `act(() => dismiss())` without `await` — RNTL v14's `renderHook` and a
   render's `unmount()` are both `async`. Fixed by awaiting both throughout
   `use-dismissible-cue.test.tsx` and `dismissible-callout.test.tsx`. The
   un-awaited `unmount()` calls were the actual root cause of a real,
   reproducible "overlapping act() calls" warning that corrupted React's
   act-tracking state for the rest of the test file, causing a *later*,
   seemingly unrelated test (`a different cueId is unaffected...`) to fail
   with "Unable to find an element" even though its own logic was correct.
2. **`onboarding-rules-screen.test.tsx` rendered `OnboardingRulesScreen`
   inside a fresh `OnboardingWizardProvider`** (`currentStep: 'nickname'`,
   the wizard's real initial step) and then asserted `Continue`/`Skip`
   navigate to `OnboardingNotifications` — but `wizard.advance()` correctly
   refuses to move forward from `'nickname'` (required step, still
   `'pending'`), so `navigation.navigate` was never called (0 calls, not a
   flaky timing issue). This is a test-authoring gap, not an app bug: the
   real app only ever mounts `OnboardingRulesScreen` once the wizard's
   `currentStep` is already `'rules'` (navigated there in sequence).
   Fixed by mocking `useOnboardingWizardContext` directly with
   `currentStep: 'rules'` pre-set — matching design.md §13's own framing
   ("Continue/Skip still advance the wizard unchanged — a regression check
   ... not new domain logic"): this test verifies `OnboardingRulesScreen`'s
   own markDone/markSkipped + conditional-navigate logic, not the wizard's
   step-order state machine (already covered by `use-onboarding-wizard.test.ts`).
3. **`scoring-table.tsx` had an unused `YStack` import** (`eslint` error).
   Removed.
4. **`use-dismissible-cue.ts` used `void dismissCallout(cueId)`** for its
   fire-and-forget persistence call — this repo's established convention
   for a swallow-its-own-errors async call is `.catch(() => {})` (see
   `root-navigator.tsx`, `app-providers.tsx`), not the `void` operator
   (`no-void` lint rule). Fixed to match.

Also completed, not previously finished: the `education` remote's
`sharedDeps()` function itself had never been updated to actually add
`tamagui`/`i18next`/`react-i18next`/`@react-native-async-storage/async-storage`
— only a header comment claimed it had been. Fixed as part of §1/§2 above;
this was the actual substance of ADR-056's build probe, not a pre-existing
correctness bug in shipped code (the gap was caught before any commit).

## 5. Twin-component policy (ADR-054) — verification

`ScoreBreakdownExplainer`/`ScoreBreakdownDemo` (education remote) and
`ScoringTable` (education) / `OnboardingScoringSummary` (host) remain two
independent implementations each, per ADR-054 — confirmed no cross-boundary
import exists in either direction (`grep` for `pools`/`predictions` imports
inside `src/remotes/education/`, and for `education` imports inside
`src/host/`, found none beyond the lazy `education/App` MF import itself).

## 6. What's genuinely non-mutating (model.md §7 reconfirmed)

Zero new backend capability, zero `BackendApiClient`/`rankings-api.ts`-style
call anywhere in this bolt's code — confirmed by grep across
`src/remotes/education/`, `src/host/navigation/screens/education-screen.tsx`,
`src/host/profile/screens/onboarding-rules-screen.tsx`. No backend changes,
no `backend/` files touched.

## 7. Manual Layer 2 (device) test paths — for the user's own manual pass

Per standing preference, Layer 2 is not automated and `agent-device` was not
invoked. The following device-level flows are ready for manual verification:

1. **Home → Rules Center**: tap the "Learn the rules" button on Home,
   confirm it pushes a real screen (not an inline toggle) showing the Rules
   Center — accordion (5 sections, collapsed by default), worked example,
   and the scoring calculator below it.
2. **Rules accordion**: tap a few sections, confirm independent
   expand/collapse, confirm content matches the real rule text (scoring,
   penalties, match-locks, ties, pools).
3. **Scoring calculator**: change the actual score fields, confirm the
   breakdown recomputes live; toggle a tied penalty shootout prediction,
   confirm it's flagged instead of silently picking a winner; toggle
   "knockout" off, confirm the penalty section disappears.
4. **Dismissible cues**: confirm the two informational callouts (above the
   accordion, above the calculator) can be dismissed, and stay dismissed
   after backgrounding/reopening the app (AsyncStorage persistence).
5. **Onboarding "Learn how to play" step**: during a fresh sign-up's
   onboarding wizard, confirm the rules step shows real content + the static
   scoring summary (not a placeholder), confirm no tappable link into the
   full Rules Center exists here (by design), and confirm both "Continue"
   and "Skip for now" advance to the next step without getting stuck.
6. **Bolt 0's still-open fallback-path test, re-verified against the new
   call site** (design.md §13's own explicit ask): kill the `education`
   remote's dev server mid-session, confirm `RemoteBoundary`'s retry UI
   appears on `EducationScreen` (the new pushed route) instead of a crash —
   same mechanism as Bolt 0, new call site, worth a fresh confirmation
   rather than assuming the Home→pushed-screen relocation preserved it
   unchanged.
7. **Dark/light theme correctness** on the Rules Center screen and the
   onboarding rules step — both are net-new/updated Tamagui-first surfaces,
   confirm legibility and correct theming in both modes.
