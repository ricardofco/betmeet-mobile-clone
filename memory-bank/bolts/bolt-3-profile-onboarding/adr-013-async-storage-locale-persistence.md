# ADR-013 — Locale Local Persistence: `@react-native-async-storage/async-storage`

**Date:** 2026-06-30
**Status:** Accepted
**Bolt:** 3 — Profile & Onboarding

---

## Context

PROFILE-3's AC requires the locale choice to "persist across app restarts (device-local storage)... without a flash-to-default" on relaunch — i.e. the locale must be readable synchronously-enough at app boot, before the first backend profile fetch resolves, to avoid a visible flash of the wrong language.

The app already has one secure-storage native module: `react-native-keychain`, used exclusively for the Supabase session token (`src/platform/supabase/keychain-session-storage.ts`). Locale is not a secret and does not need Keychain-grade encryption — using Keychain for it would be a category misuse (and Keychain reads are slower / have different OS-level semantics than a simple key-value store, e.g. biometric/passcode prompts are sometimes configurable on Keychain items, which is irrelevant overhead here).

Two options considered:
- **Option A** — `@react-native-async-storage/async-storage`: the de facto standard unencrypted key-value store for React Native, widely used, actively maintained, simple `getItem`/`setItem` API.
- **Option B** — Repurpose `react-native-keychain` for locale too (avoids adding a new native dependency).

---

## Decision

**Option A — `@react-native-async-storage/async-storage`.**

Reasons:
1. Correct tool for the job: locale is non-sensitive UI preference state, not a credential. AsyncStorage is the standard RN community choice for exactly this category of data.
2. Keeps `react-native-keychain`'s scope clean (session tokens only) — mixing concerns in one native module makes future auditing of "what's in the Keychain" harder.
3. AsyncStorage is New-Architecture-compatible and ships standard autolinking — no Re.Pack/Rspack-specific configuration needed (same posture as every other native dependency added so far: `pod install` on iOS, autolink on Android).
4. Small footprint: this is the only new dependency this ADR introduces; the locale store (`src/host/profile/locale-store.ts`) is a thin Zustand wrapper reading/writing one key.

### Native setup

```bash
yarn add @react-native-async-storage/async-storage
cd ios && bundle exec pod install
```

No Android Gradle changes required (RN 0.86 autolink). No Info.plist/AndroidManifest permission entries needed (unlike `react-native-image-picker`) — AsyncStorage doesn't touch any sensitive OS-gated resource.

### Rehydration timing

The locale store reads its persisted value synchronously-as-possible during `AppProviders` initialization (before `RootNavigator` mounts), so the very first paint already reflects the persisted locale rather than `DEFAULT_LOCALE` (ADR-012) followed by a corrective re-render. AsyncStorage's API is inherently async, so a brief unstyled splash (already present per `AuthGatedNavigator`'s `status === 'loading'` branch) covers this gap — no new splash state is introduced, the existing one is reused.

---

## Consequences

- One new native dependency, `pod install` required after adding it (same operational note as every prior native dependency in this app — `react-native-keychain`, `react-native-svg`/`react-native-qrcode-svg`).
- Jest: AsyncStorage ships a built-in Jest mock (an in-memory store) at the `./jest` subpath. Wired via `jest.config.js`'s `moduleNameMapper` — `'^@react-native-async-storage/async-storage$': '@react-native-async-storage/async-storage/jest'` — not `setupFiles` (the installed version, 3.x, exports the mock as a default-exported singleton instance meant to *replace* the real module's import, not as a side-effecting setup shim like `react-native-gesture-handler/jestSetup.js`). No custom `__mocks__` shim needed, simpler than the `react-native-qrcode-svg` View-mock precedent from ADR-007.
- If a future bolt needs more general-purpose local KV storage beyond locale (e.g. caching), this same dependency is the natural answer — not a one-off.
