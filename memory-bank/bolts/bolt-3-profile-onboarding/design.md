# Bolt 3 — Profile & Onboarding — Design Stage

> **Stage 2 of 5 (Design).** Component/data-flow design: screen tree, navigation params, state boundaries, native-module linking, backend-capability shape. Checkpoint: pause for approval before ADRs.

Builds on `model.md` (corrected nickname-cooldown rule — see its top-of-file correction note and ADR-011 below).

---

## 1. Federation placement (confirmed, not re-litigated)

Host bundle — `system-context.md §4`. Onboarding-completion gating is load-bearing for `unit-05-predictions`/`unit-06-pools`, and the wizard's final step navigates into Bolt 2's host-resident `TotpEnrollmentScreen`. No part of this bolt is a Module Federation remote candidate.

New host folder: `src/host/profile/` (mirrors `src/host/auth/`, `src/host/settings/` conventions — `screens/`, `navigation/` (param types only; this bolt extends existing trees rather than adding a new top-level stack), domain logic in `src/domain/profile/`).

---

## 2. Domain layer additions (`src/domain/profile/`)

One file per concept from `model.md` §2, mirroring `src/domain/auth/`'s one-function-per-file convention:

| File | Exports |
|---|---|
| `validate-nickname-base.ts` | `validateNicknameBase`, `interpretAvailabilityResponse`, `NicknameAvailability` |
| `nickname-change-eligibility.ts` | `evaluateNicknameChangeEligibility`, `NicknameCooldownInput`, `NicknameChangeEligibility` |
| `validate-avatar-upload.ts` | `validateAvatarUpload`, `AvatarUploadValidation`, `MAX_AVATAR_BYTES`, `ALLOWED_AVATAR_MIME_TYPES` |
| `avatar-source.ts` | `AvatarSourceKind`, `AvatarState` (types only — no logic; precedence is backend-owned per model.md §4) |
| `default-avatar-set.ts` | `DefaultAvatarOption`, `DefaultAvatarSetResult`, `LOCAL_FALLBACK_AVATARS` (bundled constant) |
| `locale.ts` | `AppLocale`, `DEFAULT_LOCALE`, `isSupportedLocale` |
| `onboarding-wizard-state.ts` | `OnboardingStepId`, `ONBOARDING_STEP_ORDER`, `OnboardingStepStatus`, `OnboardingWizardState`, `canAdvanceFrom`, `nextStep`, `previousStep`, `isStepRequired`, `isStepSkippable` |
| `index.ts` | barrel re-export, mirrors `src/domain/auth/index.ts` |

All pure, framework-free, no SDK import — same boundary rule as `src/domain/auth/` (ADR-003 precedent). `evaluateNicknameChangeEligibility` takes `now: string` injected (model.md §2.2), never reads `Date.now()` internally.

---

## 3. Platform layer additions

### 3.1 `BackendApiClient` capability names (system-context.md §3 "Profile")

No new client interface — reuse the existing `BackendApiClient.request<TResponse, TBody>({ capability, body })` seam (`src/platform/backend-api/backend-api-client.ts`). New capability names, all dispatched the same way the existing `auth.resendConfirmation` is:

| Capability | Body | Response | Used by |
|---|---|---|---|
| `profile.checkNicknameAvailability` | `{ base: string }` | `{ available: boolean }` | nickname step (debounced) |
| `profile.assignNickname` | `{ base: string }` | `{ base: string; discriminator: string }` \| `{ error: 'taken' }` | onboarding nickname step (first assignment) |
| `profile.changeNickname` | `{ base: string }` | `{ base: string; discriminator: string }` \| `{ error: 'taken' \| 'rate_limited'; cooldownEndsAt?: string }` | Settings nickname change |
| `profile.getNicknameCooldownState` | — | `NicknameCooldownInput` shape (model.md §2.2) | Settings screen load (advisory countdown) |
| `profile.getDefaultAvatarSet` | — | `{ options: DefaultAvatarOption[] }` | avatar step / Settings avatar picker |
| `profile.requestAvatarUploadUrl` | `{ mimeType: string; sizeBytes: number }` | `{ uploadUrl: string; confirmToken: string }` | custom avatar upload (signed URL, system-context.md §2) |
| `profile.confirmAvatarUpload` | `{ confirmToken: string }` | `{ avatarUrl: string }` | after `PUT` to signed URL succeeds |
| `profile.setAvatarSource` | `{ source: 'google' \| 'default'; optionId?: string }` | `{ avatarUrl: string; source: AvatarSourceKind }` | non-custom avatar selection |
| `profile.setLocale` | `{ locale: AppLocale }` | `{ locale: AppLocale }` | locale change (Settings) |
| `profile.completeOnboarding` | `{ notificationsOptIn: boolean }` | `{ onboardingCompleted: true }` \| `{ error: string }` | final wizard step (model.md §2.8) |
| `profile.getProfile` | — | `{ nickname: string; avatar: AvatarState; locale: AppLocale; cooldown: NicknameCooldownInput }` | Settings screen initial load |

`profile.changeNickname`'s `rate_limited` response shape and `profile.getNicknameCooldownState`'s payload both map 1:1 onto `NicknameCooldownInput` (model.md §2.2) — this is the contract the corrected `evaluateNicknameChangeEligibility` is built against (ADR-011).

No new platform module is needed beyond capability names — `getBackendApiClient()` is reused as-is, same pattern as Bolt 1/2.

### 3.2 Supabase adapter — no changes for nickname/onboarding-completion

Profile/nickname/avatar/locale logic is **entirely backend-API-mediated** (system-context.md §3), not a direct Supabase Postgres/Storage call from feature code — except the avatar upload `PUT` to the signed URL itself, which is a plain `fetch` (not via the Supabase SDK, not via `SupabaseAdapter` — the signed URL is opaque, pre-authorized; no Supabase client needed to use it). This keeps `SupabaseAdapter` (system-context.md §2's single encapsulation point) scoped to Auth/session/MFA as it already is — profile data is Backend-API territory by `system-context.md §3`'s table, not a "direct RLS-scoped read" exception.

`onboarding_completed` claim propagation: unchanged mechanism — `profile.completeOnboarding` succeeds → next `onSessionChange` fire carries the updated claim (same as Bolt 2's MFA-verification → claims-refresh pattern). No new code in `supabase-adapter.ts`.

### 3.3 Avatar upload native call shape

```
react-native-image-picker (launchImageLibrary/launchCamera)
  → { uri, type (mime), fileSize, fileName }
  → validateAvatarUpload({ sizeBytes: fileSize, mimeType: type })
  → if valid: backendApiClient.request('profile.requestAvatarUploadUrl', { mimeType, sizeBytes })
  → fetch(uploadUrl, { method: 'PUT', body: <file bytes via uri>, headers: { 'Content-Type': mimeType } })
  → backendApiClient.request('profile.confirmAvatarUpload', { confirmToken })
  → AvatarState updated, step → 'done'
```

`react-native-image-picker` not yet in `package.json` — installed as part of Implement stage (see §7 native linking plan).

---

## 4. State boundaries

| State | Owner | Lifetime | Notes |
|---|---|---|---|
| `OnboardingWizardState` (`currentStep`, `stepStatus`) | Local component state (`useState` / `useReducer`) in a new `OnboardingWizardScreen` | Wizard session only — never Zustand, never persisted (model.md §2.7) | Matches `TotpEnrollmentScreen`'s existing pattern of ephemeral local state, not a global store, for multi-step flows |
| Nickname/avatar/locale **server-derived profile data** | TanStack Query (`useQuery`/`useMutation`, ADR per app-providers.tsx comment "the one path for backend-API-derived state") | Query-cache lifetime, keyed `['profile']` | Settings screen and wizard both read through the same query key so a mutation in one place invalidates the other (e.g. completing the wizard's nickname step invalidates the same cache the Settings screen would later read) |
| `AppLocale` (active, for instant UI switch) | New, small Zustand store `src/host/profile/locale-store.ts` (mirrors `auth-session-store.ts`'s minimalism) + AsyncStorage-less persistence via existing `react-native-keychain`? **No** — locale is not a secret; use a plain RN-community persistence primitive. **Decision**: not yet a dependency — flagged in ADR-013, resolved as `@react-native-async-storage/async-storage` (new, minimal native dep, broadly already expected in RN apps) for instant local restore-survival per PROFILE-3 AC ("persists across app restarts... without requiring an app restart" for the in-session switch). | App lifetime, rehydrated on launch | Explicit user choice always wins (model.md §2.6); reconciled against backend's `profile.setLocale`/`profile.getProfile` value opportunistically, last-write-wins, no conflict UI |
| `onboarding_completed` claim | Existing `useAuthSessionStore` (`claims.onboardingCompleted`) | Unchanged — Bolt 1 owns this | This bolt never writes to this store directly (model.md §2.8) |
| `pendingDestination` | Existing `useAuthSessionStore` | Unchanged — Bolt 1/ADR-002 owns this | Wizard does not read/write it directly; `AuthGatedNavigator` already does (model.md §1 "Intended destination honoring") |

---

## 5. Screen tree additions

### 5.1 Onboarding tree (replaces the Bolt-1 placeholder)

`auth-gated-navigator.tsx`'s `OnboardingTree()` currently mounts a single placeholder `OnboardingScreen`. This bolt replaces its body with a 5-screen `OnboardingStack` (still mounted the same way — `AuthGatedNavigator`'s `redirect.to === 'onboarding'` branch is unchanged, ADR-001/ADR-008 stay closed per model.md's scope note):

```ts
export type OnboardingStackParamList = {
  OnboardingNickname: undefined;
  OnboardingAvatar: undefined;
  OnboardingRules: undefined;
  OnboardingNotifications: undefined;
  OnboardingSecondFactor: undefined;
};
```

Each screen is registered in `screen-registry.ts` with the existing `['onboarding']` `ScreenClass` tag (no new tag needed — the guard only ever checks "is *some* onboarding screen showing," not which step).

A thin `OnboardingWizardController` (not a screen itself, hosted inside each step screen via a shared hook `useOnboardingWizard()`) owns the `OnboardingWizardState` local state and exposes `{ currentStep, goNext, goBack, markDone, markSkipped }`. Screens call `navigation.navigate(...)` driven by `nextStep`/`previousStep`'s pure output — the hook never calls `navigation` itself, keeping it UI-framework-light and directly unit-testable (consistent with `vercel-react-native-skills`' `react-state-minimize` and the project's existing domain/platform split).

`nickname` and `avatar` step screens reuse PROFILE-1/2 form components (`NicknameForm`, `AvatarPicker` — new shared components under `src/host/profile/components/`) which Settings (PROFILE-5) also imports, so the "compose, don't duplicate" rule (unit-brief.md, PROFILE-5 AC) is structural, not just a convention.

`OnboardingSecondFactor` step (model.md §3, ADR-010): renders a nudge screen with two actions — "Enable now" navigates to the **existing** `TotpEnrollmentScreen`, reusing it by pushing it onto a screen-stack that, on completion, pops back into the wizard's completion call. "Skip for now" calls `markSkipped('second-factor')` directly. Both paths converge on the same `handleWizardComplete` callback that fires `profile.completeOnboarding`.

### 5.2 Settings tree extension

`SettingsStackParamList` (in `auth-stack-params.ts`) gains three new routes, inserted as a "Profile" section per model.md §4's PROFILE-5 composition:

```ts
export type SettingsStackParamList = {
  AccountSettings: undefined;
  ChangeNickname: undefined;
  ChangeAvatar: undefined;
  ChangeLocale: undefined;
  ChangePassword: undefined;   // unchanged
  ChangeEmail: undefined;      // unchanged
  TotpEnrollment: undefined;   // unchanged
};
```

`AccountSettingsScreen` (existing) gains a "Profile" section of three new rows above the existing auth rows, plus inline current-value display (nickname text, avatar thumbnail, locale code) fed by the same `['profile']` TanStack Query the wizard populates. `ChangeNickname`/`ChangeAvatar`/`ChangeLocale` screens reuse `NicknameForm`/`AvatarPicker`/a new small `LocaleSwitch` component — same components the wizard uses, parameterized by a `mode: 'onboarding' | 'settings'` prop only where behavior actually differs (e.g. `NicknameForm` in `'settings'` mode first checks `evaluateNicknameChangeEligibility` and disables submission with a countdown; in `'onboarding'` mode it skips that check entirely per model.md's eligibility table row 1).

---

## 6. Component design (host-bundle, new files)

```
src/host/profile/
  navigation/
    onboarding-stack-params.ts        (OnboardingStackParamList)
  screens/
    onboarding-nickname-screen.tsx
    onboarding-avatar-screen.tsx
    onboarding-rules-screen.tsx        (thin: links to education content — model.md §5, not implemented here)
    onboarding-notifications-screen.tsx (thin: nudge only — model.md §5, not implemented here)
    onboarding-second-factor-screen.tsx
    change-nickname-screen.tsx
    change-avatar-screen.tsx
    change-locale-screen.tsx
  components/
    nickname-form.tsx       (mode: 'onboarding' | 'settings')
    avatar-picker.tsx       (mode: 'onboarding' | 'settings')
    locale-switch.tsx
  hooks/
    use-onboarding-wizard.ts   (wraps OnboardingWizardState, no navigation calls)
    use-profile-query.ts       (TanStack Query wrapper around profile.getProfile)
  locale-store.ts            (Zustand, AsyncStorage-backed)
```

`rules` and `notifications` step screens are intentionally thin placeholders in this bolt (model.md §5: out of scope, owned by `unit-09-education`/`unit-08-notifications`), each rendering a "Skip" / minimal acknowledgment and calling `markSkipped`/`markDone` — exactly the same pattern Bolt 0's `education` remote placeholder and Bolt 1's `OnboardingScreen` placeholder already established for "reserve the seam, don't build the feature early."

---

## 7. Native module linking plan — `react-native-image-picker`

Per unit-brief.md's flagged risk (now resolved: this unit stays host, so the "remote needs native module" concern is moot) — install + link before any avatar code is written:

1. `yarn add react-native-image-picker`
2. iOS: `cd ios && bundle exec pod install` (adds `NSPhotoLibraryUsageDescription` / `NSCameraUsageDescription` to `Info.plist` — required by Apple, app will crash on permission request otherwise).
3. Android: no extra Gradle step for RN 0.86 autolinking, but `READ_MEDIA_IMAGES` (API 33+) / `READ_EXTERNAL_STORAGE` (below) permissions must be declared in `AndroidManifest.xml`.
4. Re.Pack/Rspack: no bundler-specific config needed — this is a New Architecture-compatible native module, autolinked the same as `react-native-keychain`/`react-native-qrcode-svg` already are; nothing Metro-specific is introduced (CLAUDE.md's "never generate Metro config" stays satisfied).

---

## 8. List performance note (`vercel-react-native-skills` applied)

The avatar default-set picker renders a small, bounded grid (a "seeded set," not an unbounded feed) — `list-performance-virtualize`'s FlashList recommendation is for **large** lists. A bounded grid (expected ~6–12 options, confirmed against the model's `DefaultAvatarSetResult` shape which has no pagination) does not meet that bar; a plain `View`/`ScrollView`-based grid is appropriate and avoids pulling in FlashList as a new dependency for a use case it isn't suited for. This call is recorded explicitly so it isn't second-guessed mid-Implement — flagged for ADR if FlashList is later deemed necessary (e.g. if the default set grows large), but not adopted speculatively now.

List-item memoization, callback stabilization, and inline-style avoidance (`list-performance-item-memo`/`-callbacks`/`-inline-objects`) still apply to `AvatarPicker`'s individual option renders regardless of container choice.

---

## Checkpoint

Pausing here for approval before ADRs. Open decisions to ratify as ADRs next stage:
- **ADR-010**: `second-factor` wizard step = TOTP-enrollment nudge (already drafted in model.md §3, formalizing here).
- **ADR-011**: nickname-cooldown reconciliation (one free post-onboarding change, not two) — the corrected model + this design's capability shapes (`profile.changeNickname`, `profile.getNicknameCooldownState`) as the resolution record.
- **ADR-012**: locale defaults to `'es'` regardless of device locale (model.md §2.6, formalizing here).
- **ADR-013**: `@react-native-async-storage/async-storage` chosen for locale's local-persistence primitive (new native dependency — needs its own linking note, smaller than image-picker's).
- Possibly **ADR-014**: avatar default-set picker uses a plain grid, not FlashList (§8 above) — only if this should be a recorded ADR rather than a design-doc note; default leaning is **not** ADR-worthy (no real tradeoff was rejected, just a threshold judgment) — flag for discussion.
