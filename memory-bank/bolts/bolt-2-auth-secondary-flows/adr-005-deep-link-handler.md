# ADR-005 — Deep-Link Handler: React Native Core `Linking` API

**Date:** 2026-06-29
**Status:** Accepted
**Bolt:** 2 — Auth Secondary Flows

---

## Context

Bolt 2 requires handling two types of deep links:
1. **OAuth callback** — `betmeet://auth/callback` (custom scheme) or `https://betmeet.app/auth/callback` (Universal Link) after Google OAuth authorization completes.
2. **Password-reset link** — `betmeet://auth/reset-password?token_hash=<hash>&type=recovery` delivered via Supabase's password-reset email.

Two candidate approaches were considered:

**Option A — React Native core `Linking` API** (`react-native`'s built-in `Linking` module): `Linking.addEventListener('url', handler)` for foreground links; `Linking.getInitialURL()` for cold-start links. No additional package required.

**Option B — `react-native-app-links`** (or similar third-party library): provides higher-level helpers for Universal Links / App Links verification, deferred deep links, and referral attribution.

---

## Decision

**Option A — React Native core `Linking` API** is sufficient and preferred.

Reasons:
1. The two URL patterns this bolt handles are simple: a path check (`/callback`) and a query-param check (`token_hash`+`type`). These are implemented as a pure `parseDeepLink(url)` function (domain layer, independently testable) — no library abstraction adds value here.
2. Zero new runtime dependency. `react-native-app-links` would need its own native pod / Gradle module, adding build surface for a capability the core module already covers.
3. React Navigation's `LinkingConfiguration` already integrates with `Linking` natively — adding a third-party wrapper around the same underlying `Linking` events would create two competing listeners.
4. Universal Links (HTTPS scheme) and custom scheme (`betmeet://`) are both handled by the same `Linking` listener; no library is needed to multiplex them.

**Custom scheme registration** (`betmeet://`) is done in:
- **iOS** `Info.plist`: `CFBundleURLTypes` entry with `CFBundleURLSchemes: [betmeet]`.
- **Android** `AndroidManifest.xml`: `<intent-filter>` with `<data android:scheme="betmeet" />` on `MainActivity`.

**Universal Links** (`https://betmeet.app`) registration requires an `apple-app-site-association` (AASA) file hosted at `https://betmeet.app/.well-known/apple-app-site-association` and `assetlinks.json` for Android App Links. These server-side files are outside this repo's scope; the custom scheme fallback is sufficient for development and testing (ADR-006 records the Simulator-specific behaviour).

---

## How `LinkingConfiguration` Wires into React Navigation

Rather than using React Navigation's automatic URL-to-screen mapping (which would require the URL structure to match the navigator hierarchy), we use a **custom `subscribe` override** in the `LinkingConfiguration`:

```ts
const linking: LinkingOptions<RootParamList> = {
  prefixes: ['betmeet://', 'https://betmeet.app'],
  subscribe(listener) {
    // We intercept URLs ourselves; return a no-op unsubscribe.
    // The actual handling is done by useEffect in RootNavigator
    // via Linking.addEventListener, which calls adapter methods
    // imperatively before deciding where to navigate.
    return () => {};
  },
};
```

The `useEffect` in `RootNavigator` handles:
- `Linking.getInitialURL()` — for cold-start deep links (app was not running; OS launches it with the URL).
- `Linking.addEventListener('url', handler)` — for foreground/background deep links (app already running).

Both call the same `handleDeepLink(url: string)` function, which:
1. Calls `parseDeepLink(url)` to classify the payload.
2. Dispatches to `getSupabaseAdapter().handleOAuthCallback(url)` (OAuth) or `getSupabaseAdapter().exchangePasswordResetToken(tokenHash)` (password reset).
3. On success, navigates to the appropriate screen via the navigation ref.

---

## Consequences

- No new runtime package needed. Bolt 2 dependency count for deep links = 0.
- Universal Links require server-side AASA/assetlinks.json setup (outside this repo) — deferred. Custom scheme works for all development and testing scenarios.
- `parseDeepLink` is the single parsing seam — any URL-structure change is isolated to one pure function with its own test suite.
- Cold-start deep links (password-reset email tapped when app is closed) are handled via `getInitialURL()` — tested manually in Layer 2 (agent-device).
