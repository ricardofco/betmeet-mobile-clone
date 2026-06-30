# Active Context

> **Agent note:** This is your short-term memory. Read it at the start of every session and update it immediately after making an important decision, changing focus, or encountering a blocker.

## Current Focus
- **Bolt 3 (Profile & onboarding) is closed at Layer 1** — 202 tests green (up from 129). Layer 2 deferred to manual verification by user; `pod install` not yet run in this environment (Ruby/bundler toolchain blocker — see Known Issues).
- Bolt 3 delivered: nickname assignment/cooldown (PROFILE-1), avatar 3-source picker + upload (PROFILE-2), locale preference (PROFILE-3), the real 5-step onboarding wizard replacing the Bolt-1 placeholder (PROFILE-4), Settings "Profile" section (PROFILE-5).
- **Important correction (Bolt 3, ADR-011):** the nickname cooldown rule is **one** free post-onboarding nickname change, then a 30-day cooldown — not two. This was a Model-stage error caused by ambiguous AC wording in `PROFILE-1-nickname.md` (now corrected). Resolved by direct investigation of `betmeet-clone`'s real `setNickname` server action — see `memory-bank/bolts/bolt-3-profile-onboarding/adr-011-nickname-cooldown-reconciliation.md` for the full evidence trail. The regression test for this is `src/domain/profile/__tests__/nickname-change-eligibility.test.ts`.
- Bolt 2 (Auth secondary flows) is closed at Layer 1 — 129 tests green. Layer 2 deferred to manual verification by user.
- Bolt 2 delivered: Google OAuth + deep link (AUTH-2), TOTP MFA enrollment + challenge screen (AUTH-3), forgot/reset password via deep link (AUTH-4), change password + change email in Settings (AUTH-5).
- App must be rebuilt (not just restarted) for `betmeet://` URL scheme to be active on iOS — `Info.plist` was updated.

## Recent Technical Decisions
- **Inception-level decisions** (binding, `requirements.md §7`): backend architecture = Option A; single Supabase-access adapter mandatory; no code dependency on `betmeet-clone`; Module Federation placement per feature (auth/profile/predictions/notifications-permission-logic → host; pools/competition/scoring-rankings/notifications-preferences/education/admin → remote; `scoring` → shared library); TOTP-only MFA at launch; FCM+APNs direct; `react-native-keychain`/`react-native-image-picker`/`react-native-svg`/`betmeet://`+Universal/App Links required; iOS+Android only, no offline support.
- **Bolt 0 ADRs (implemented)**: layered folders `domain/platform/shared/host/remotes`; host + example `education` remote; React Navigation (native-stack); TanStack Query (server) + Zustand (client); `scoring` as shared singleton under `src/shared/scoring/`; `@/*` → `src/*` alias.
- **Bolt 1 ADRs (implemented)**:
  - ADR-001: navigation guard via conditional screen-tree rendering (not action interception) — `AuthGatedNavigator` renders one of five branches based on `evaluateGuard` outcome.
  - ADR-002: Zustand auth-session store — holds only derived `claims` (never raw tokens), `status: loading|ready`, `pendingDestination`.
  - ADR-003: sign-in/sign-up/resend classification logic lives in `domain/auth/` (pure functions, no SDK import); `SupabaseAdapter` imports and calls them, never the reverse.
  - ADR-004: `ScreenClass` is a tag array (not single-pick enum); `PendingConfirmationScreen` + `VerifyEmailScreen` merged into one `VerifyEmailScreen` branching on `reason` param.
- **Bolt 2 ADRs (implemented)**:
  - ADR-005: deep-link handler via RN core `Linking` API + React Navigation `LinkingConfiguration` (no extra library).
  - ADR-006: OAuth on Simulator uses Safari + `betmeet://` custom-scheme callback; PKCE exchange is server-side in Supabase.
  - ADR-007: `react-native-qrcode-svg` (wraps `react-native-svg`) for TOTP QR rendering — `pod install` required.
  - ADR-008: `AuthGatedNavigator` extended with `mfa-challenge` branch (aal1 session + nextLevel aal2) — ADR-001 extended, not violated.
  - ADR-009: `MfaProvider` interface designed as passkey seam; no implementation in this bolt.
- **Bolt 3 ADRs (implemented)**:
  - ADR-010: onboarding's final step (`second-factor`) is a TOTP-enrollment nudge reusing Bolt 2's `TotpEnrollmentScreen` — replaces the web app's deferred passkey step.
  - ADR-011: nickname-cooldown reconciliation — one free post-onboarding change (not two); full evidence trail from `betmeet-clone`'s real `setNickname` action.
  - ADR-012: locale defaults to `es` regardless of device language (explicit, recorded UX call, matches web app).
  - ADR-013: `@react-native-async-storage/async-storage` for locale local-persistence (new native dep, distinct from Keychain's session-only scope). Jest-mocked via `moduleNameMapper` → the package's own `./jest` subpath export, not `setupFiles`.
  - ADR-014: avatar default-set picker uses a plain grid, not FlashList — bounded/small list, not a list-performance case.
  - `profile.*` capability group added to the `BackendApiClient` seam (`src/platform/backend-api/profile-api.ts`) — no new transport, same `request()` pattern as Bolt 1's `auth.resendConfirmation`.
  - `OnboardingStackParamList`/`screen-registry.ts` replaced the single Bolt-1 placeholder route with 5 real wizard routes, all still tagged `['onboarding']` — `AuthGatedNavigator`'s guard branch logic (ADR-001/ADR-008) untouched.
- **Env-var setup (resolved in Bolt 1)**: `react-native-config` reads `.env` at native build time — `pod install` is required after any `.env` change. `SUPABASE_URL` must be the bare project URL (`https://<ref>.supabase.co`), no path suffix. `BACKEND_API_BASE_URL` is still empty (backend hosting TBD).
- Still open, deferred: concrete performance budget numbers; push-SDK choice (Expo Notifications vs. direct FCM/APNs — needed before Bolt 10); `BACKEND_API_BASE_URL` (needed before any bolt that calls it end-to-end).

## Known Issues / Blockers
- `metro.config.js` still exists but is provably dead — safe to delete in a future cleanup bolt.
- iOS bundle identifier is still the RN CLI placeholder — needs updating before any release build.
- `ios/BetmeetMobile.xcworkspace/`, `ios/Podfile.lock`, and `Gemfile.lock` are untracked — pre-existing, unrelated to Bolt 1.
- Repo's HEAD is detached at the initial commit (not on a branch) — pre-existing; flagging since the next `git commit` would not land on any branch until resolved.
- Bolt 0 Layer 2: fallback-path proof (kill `education` remote dev server mid-session, confirm `RemoteBoundary` retry UI) and Android run — still open, non-blocking.
- FCM/APNs project setup needed before Bolt 10. AUTH-6 is sequenced into Bolt 8 (needs `unit-06-pools`'s ownership-transfer first).
- Stale `HERMES_CLI_PATH` in `Pods-BetmeetMobile.debug.xcconfig` still points at the old `dynamicdevs/futbol/...` path — doesn't block Simulator/dev-server runs but would break a Release build; rerun `cd ios && bundle exec pod install` if hit.
- Node 20 is the shell's default; Re.Pack / Jest / Yarn require Node ≥ 22.11.0 — run `nvm use 22` before any `yarn` command in a new terminal.
- **Bolt 3: `pod install` not yet run** for `react-native-image-picker`/`@react-native-async-storage/async-storage` — this environment's system Ruby (2.6.10) can't satisfy the `Gemfile.lock`'s bundler 2.7.2 requirement; an `rbenv`-managed Ruby 3.3.5 exists on the machine but its shim wasn't reachable from a non-interactive shell in this session. Must be resolved (e.g. `eval "$(rbenv init -)"` in an interactive shell, then `cd ios && bundle install && bundle exec pod install`) before any device build touching Bolt 3's avatar/locale screens.
- `BACKEND_API_BASE_URL` still empty — Bolt 3's `profile.*` capabilities are contract-only (Layer 1 mocks them); no real backend exists yet to integration-test against.

## Immediate Next Step
- **Bolt 3 is closed at Layer 1.** User will verify Layer 2 manually — run `cd ios && bundle exec pod install` first (see Known Issues above), then rebuild. Suggested manual test paths are in `memory-bank/bolts/bolt-3-profile-onboarding/implement-and-test.md`. Bolt 4 (Scoring package, parallelizable) or Bolt 5 (Competition read model) are next per the bolt plan — confirm with the user which to start.
