# Active Context

> **Agent note:** This is your short-term memory. Read it at the start of every session and update it immediately after making an important decision, changing focus, or encountering a blocker.

## Current Focus
- **Bolt 2 (Auth secondary flows) is closed at Layer 1** — 129 tests green (up from 59). Layer 2 deferred to manual verification by user. **Bolt 3 (Profile & onboarding) is next.**
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

## Immediate Next Step
- **Bolt 2 is closed at Layer 1.** User will verify Layer 2 manually (rebuild required for `betmeet://` scheme). Bolt 3 (Profile & onboarding: PROFILE-1 through PROFILE-5) is next — kick off with `/bolt-start`.
