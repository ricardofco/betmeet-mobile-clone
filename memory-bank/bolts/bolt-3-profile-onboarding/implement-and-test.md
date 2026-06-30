# Bolt 3 — Profile & Onboarding — Implement & Test

## Reconciliation note (read first)

This bolt's `model.md` was corrected before Implement began: the nickname cooldown rule is **one** free post-onboarding nickname change, then a 30-day cooldown — not two, as originally (incorrectly) modeled. Full evidence trail (real `betmeet-clone` `setNickname` server action, `FR-REFINE-17.3`, `nicknameChangeCount >= 2` gate) is recorded in `adr-011-nickname-cooldown-reconciliation.md`. The single most load-bearing test in this bolt, `nickname-change-eligibility.test.ts`, asserts the corrected behavior explicitly and calls out the exact case (`postOnboardingChangeCount: 1`) the original model got backwards.

---

## Implementation Summary

### Dependencies added
- `react-native-image-picker` — avatar selection from camera/library (design.md §7)
- `@react-native-async-storage/async-storage` — locale local-persistence (ADR-013)
- `pod install` required on iOS after adding these packages (not yet run in this environment — Ruby/bundler toolchain issue pre-existing, unrelated to this bolt; deferred to the user's manual native-setup step before any device run, same as Layer 2)

### Domain layer (`src/domain/profile/`)
- `validate-nickname-base.ts` — `validateNicknameBase`, `interpretAvailabilityResponse` (pure, format-only)
- `nickname-change-eligibility.ts` — `evaluateNicknameChangeEligibility` (ADR-011's corrected one-free-change rule)
- `validate-avatar-upload.ts` — `validateAvatarUpload`, `MAX_AVATAR_BYTES`, `ALLOWED_AVATAR_MIME_TYPES`
- `avatar-source.ts` — `AvatarSourceKind`, `AvatarState` (types only, no transition logic — backend-owned)
- `default-avatar-set.ts` — `DefaultAvatarOption`, `DefaultAvatarSetResult`, `LOCAL_FALLBACK_AVATARS`
- `locale.ts` — `AppLocale`, `DEFAULT_LOCALE` (`'es'`, ADR-012), `isSupportedLocale`
- `onboarding-wizard-state.ts` — `OnboardingStepId`, `ONBOARDING_STEP_ORDER`, `canAdvanceFrom`, `nextStep`, `previousStep`, `isStepRequired`, `isStepSkippable`
- `onboarding-completion.ts` — `OnboardingCompletionResult`
- All exported from `index.ts`

### Platform layer
- `src/platform/backend-api/profile-api.ts` — typed `profileApi.*` wrappers around `BackendApiClient.request()` for the `profile.*` capability group (design.md §3.1): `checkNicknameAvailability`, `assignNickname`, `changeNickname`, `getNicknameCooldownState`, `getDefaultAvatarSet`, `requestAvatarUploadUrl`, `confirmAvatarUpload`, `setAvatarSource`, `setLocale`, `completeOnboarding`, `getProfile`. No new transport — reuses the existing `getBackendApiClient()` singleton.

### Host layer (`src/host/profile/`)
- `locale-store.ts` — Zustand store, AsyncStorage-backed (ADR-013), `DEFAULT_LOCALE` fallback (ADR-012)
- `hooks/use-onboarding-wizard.ts` — wraps `OnboardingWizardState` as local component state, no navigation calls (design.md §5.1)
- `hooks/use-profile-query.ts` — `useProfileQuery`, `useInvalidateProfileQuery`, `useSetLocaleMutation` (shared `['profile']` TanStack Query key)
- `components/nickname-form.tsx` — reused by onboarding's nickname step and Settings' `ChangeNickname` (`mode: 'onboarding' | 'settings'`)
- `components/avatar-picker.tsx` — reused by onboarding's avatar step and Settings' `ChangeAvatar`; plain grid, not FlashList (ADR-014)
- `components/locale-switch.tsx` — reused by Settings' `ChangeLocale`
- `screens/onboarding-wizard-screen.tsx` — `OnboardingWizardProvider`/`useOnboardingWizardContext`, owns `completeWizard()` (model.md §2.8)
- `screens/onboarding-nickname-screen.tsx`, `onboarding-avatar-screen.tsx` — required steps
- `screens/onboarding-rules-screen.tsx`, `onboarding-notifications-screen.tsx` — skippable placeholder steps (content owned by future units)
- `screens/onboarding-second-factor-screen.tsx` — TOTP-enrollment nudge, ADR-010
- `screens/change-nickname-screen.tsx`, `change-avatar-screen.tsx`, `change-locale-screen.tsx` — Settings-area screens
- `navigation/onboarding-stack-params.ts` — `OnboardingStackParamList` (5 real screens, replaces the Bolt-1 placeholder)
- `test-utils/render-with-query-client.tsx` — shared RNTL + TanStack Query render helper

### Navigation / registry changes
- `src/host/auth/navigation/auth-stack-params.ts`: `OnboardingStackParamList` re-exported from the new module; `SettingsStackParamList` gains `ChangeNickname`/`ChangeAvatar`/`ChangeLocale`
- `src/host/auth/navigation/screen-registry.ts`: `Onboarding` (single placeholder route) replaced by 5 real wizard routes, all tagged `['onboarding']`; 3 new Settings routes tagged `['protected']`
- `src/host/auth/navigation/auth-gated-navigator.tsx`: `OnboardingTree()` now mounts the real 5-screen wizard wrapped in `OnboardingWizardProvider`, replacing the placeholder `OnboardingScreen` (deleted — `src/host/auth/screens/onboarding-screen.tsx`)
- `src/host/navigation/root-navigator.tsx`: `SettingsStackNavigator` gains the 3 new Profile screens
- `src/host/settings/screens/account-settings-screen.tsx`: new "Profile" section (Nickname/Avatar/Language rows, live values via `useProfileQuery`) above the existing "Account" section
- `src/host/providers/app-providers.tsx`: hydrates the locale store on mount (ADR-013) — reuses `AuthGatedNavigator`'s existing loading splash, no new splash state

### Jest/test infra changes
- `jest.config.js`: `moduleNameMapper` redirects `@react-native-async-storage/async-storage` to its own ships-with-package Jest mock (in-memory store) — `./jest` subpath, not `setupFiles` (see ADR-013's correction note); `transformIgnorePatterns` extended for `react-native-image-picker`/`@react-native-async-storage`
- `__mocks__/react-native-image-picker.js` — manual mock (same pattern as `__mocks__/react-native-qrcode-svg.js`, ADR-007), defaults to a cancelled-picker response

---

## Layer 1 — Test Results

**202 tests passing across 28 suites** (up from 129/18 after Bolt 2). 73 new tests across 12 new suites:

| Suite | Focus |
|---|---|
| `nickname-change-eligibility.test.ts` | ADR-011's corrected one-free-change rule — the regression test for the Model-stage bug |
| `validate-nickname-base.test.ts` | Format validation (length, charset, accents, emoji) |
| `validate-avatar-upload.test.ts` | Size/mime-type gating, boundary cases |
| `locale.test.ts` | `DEFAULT_LOCALE` hardcoded to `es`, `isSupportedLocale` narrowing |
| `onboarding-wizard-state.test.ts` | Step order, required-vs-skippable, `canAdvanceFrom`, `nextStep`/`previousStep` |
| `locale-store.test.ts` | Hydration, fallback-on-corrupt-value, idempotent hydrate, persistence |
| `use-onboarding-wizard.test.tsx` | Hook-level step transitions, navigation-free |
| `onboarding-wizard-screen.test.tsx` | `completeWizard()` call shape, `notificationsOptIn` derivation, error path |
| `nickname-form.test.tsx` | Client-side format gate, debounced availability, onboarding-vs-settings mode, ADR-011 cooldown-gating regression |
| `locale-switch.test.tsx` | Instant local switch + backend sync |
| `account-settings-screen.test.tsx` (updated) | New Profile section rows + navigation, now wrapped in a `QueryClientProvider` |
| `auth-guard.test.ts` (updated) | `screenClassFor('Onboarding')` → `screenClassFor('OnboardingNickname')` — route rename fallout from the wizard's real screen tree replacing the placeholder |

`yarn tsc --noEmit` — clean. `yarn lint` — clean except one pre-existing, unrelated error in `src/platform/supabase/supabase-adapter.ts` (Bolt 2 code, not touched by this bolt).

### RNTL v14 notes encountered during Test
- `renderHook` and `act` are both async in the installed RNTL version (14.0.1) — every state-mutating hook call needed its own `await act(...)`, not batched, or `result.current` reads a stale closure.
- The shared `renderWithQueryClient` test helper must be `await`ed by every caller — v14's `render` only binds the `screen` global once its promise resolves.

---

## Layer 2 — Device Verification

**Deferred to manual verification by user**, per standing project convention (Bolt 0/1/2 precedent) — not invoked via `agent-device` in this session.

Before running on a device/simulator:
1. `cd ios && bundle exec pod install` — required for `react-native-image-picker` and `@react-native-async-storage/async-storage`'s native modules to link. **Not run in this session** — this environment's Ruby/bundler toolchain (system Ruby 2.6.10, lockfile wants bundler 2.7.2) blocked it; an `rbenv`-managed Ruby 3.3.5 is available on the machine but its shim wasn't reachable from a non-interactive shell in this session. Resolve before the device run.
2. iOS: confirm `Info.plist` gained `NSPhotoLibraryUsageDescription`/`NSCameraUsageDescription` after `pod install` (required by Apple, or the picker permission prompt crashes).
3. Android: confirm `READ_MEDIA_IMAGES` (API 33+) / `READ_EXTERNAL_STORAGE` permission declared in `AndroidManifest.xml`.

Suggested manual test paths once built:
1. **Fresh sign-up → onboarding wizard**: sign up a new user → confirm landing on `OnboardingNickname` → type a base, confirm live availability feedback → submit → confirm `OnboardingAvatar` next.
2. **Nickname format rejection**: type fewer than 3 chars / invalid characters → confirm instant client-side error, no network call.
3. **Avatar step**: pick a default avatar; separately, try "Upload a custom photo" → confirm native picker opens, a >5MB or unsupported-type file is rejected before any upload request.
4. **Rules/Notifications steps**: confirm both can be skipped without error and without blocking progression.
5. **Second-factor nudge (ADR-010)**: confirm "Skip for now" completes onboarding; separately, confirm "Enable now" reaches the existing `TotpEnrollmentScreen`.
6. **Onboarding completion**: confirm the user lands in the app post-completion at their originally-intended destination (`pendingDestination`, not unconditionally Home).
7. **Settings — Profile section**: confirm nickname/avatar/locale rows show live values; confirm nickname change is blocked with a "try again in N days" message immediately after the one free post-onboarding change is used (ADR-011 — the most important Layer 2 check in this bolt).
8. **Locale switch**: confirm switching to English updates visible copy without an app restart, and survives a real app kill+relaunch.

---

## Known Issues / Deferred
- `pod install` not run in this session (Ruby/bundler toolchain blocker, see above) — must be run before any device build that touches this bolt's screens.
- Backend capabilities under `profile.*` (design.md §3.1) are contract-only in this bolt — no real backend exists yet (`BACKEND_API_BASE_URL` still empty, same gap noted since Bolt 1). All Layer 1 tests mock `profileApi`/`BackendApiClient` directly; Layer 2 device verification of real nickname/avatar/locale persistence requires the backend contract to exist.
- The `rules` and `notifications` wizard steps are intentionally thin placeholders (model.md §5) — their real content is `unit-09-education`/`unit-08-notifications`'s scope, not this bolt's.
- Android Layer 2 not yet verified (same standing gap as prior bolts).
