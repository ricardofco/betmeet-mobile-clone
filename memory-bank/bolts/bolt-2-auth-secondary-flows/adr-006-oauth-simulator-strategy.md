# ADR-006 — OAuth Simulator Strategy

**Date:** 2026-06-29
**Status:** Accepted
**Bolt:** 2 — Auth Secondary Flows

---

## Context

AUTH-2 requires Google OAuth sign-in. The Supabase OAuth flow uses PKCE (Proof Key for Code Exchange): the app opens a browser, the user authenticates with Google, Google redirects to Supabase's OAuth callback endpoint (server-side), and Supabase redirects back to the app via the registered redirect URL (`betmeet://auth/callback` or the Universal Link form).

The key question is: **what can be tested in unit tests vs. what requires a real Simulator or device with network access?**

---

## Decision

### What is unit-testable

1. **`parseDeepLink(url)`** — pure function, no network, fully unit-testable. Tests cover both `betmeet://` and `https://betmeet.app/` prefix forms, the OAuth callback path, the password-reset path, and unknown URLs.
2. **`signInWithOAuth` adapter method** — the method calls `supabase.auth.signInWithOAuth`; the Supabase client is mocked in unit tests. The test verifies the method returns `{ type: 'oauth-browser-opened' }` when the SDK call succeeds and `{ type: 'error' }` on failure.
3. **`handleOAuthCallback` adapter method** — similarly mockable: test verifies `exchangeCodeForSession` is called with the correct URL.
4. **`SignInScreen` Google button** — unit test verifies the button is rendered and calls `signInWithOAuth('google')` on press (adapter is mocked).

### What requires Simulator with network access

1. **Full OAuth redirect round-trip** — the Supabase server-side PKCE exchange, the Google consent screen, and the redirect-back to the app via the custom scheme. On iOS Simulator, `ASWebAuthenticationSession` (used by Supabase's `signInWithOAuth` when `skipBrowserRedirect: false`) opens a Safari-in-app session. The Simulator can follow the `betmeet://auth/callback` redirect back to the app if:
   - The custom scheme is registered in `Info.plist` (done in 4.2).
   - The Supabase project's OAuth redirect URLs include `betmeet://auth/callback`.
   - The Simulator has network access and a valid Google OAuth app configured in Supabase.
2. **Cold-start deep link** — password-reset email link tapped when app is closed. Requires Simulator mail client or Safari URL-bar test. Layer 2 (agent-device) smoke-tests this by opening the Settings URL manually.

### What is deferred

- **Real device OAuth test** — the full Google consent flow on a physical device is deferred to QA / release testing. It is not part of this bolt's Layer 2 scope.
- **Universal Links** — require AASA file hosted at `https://betmeet.app` (out of this repo's scope); custom scheme fallback is used for all current tests.

### iOS Simulator specifics

On iOS Simulator, `Linking.openURL('betmeet://auth/callback?...')` can be tested via the Simulator's URL-scheme handler. The Layer 2 smoke test uses this approach rather than triggering a full Google OAuth flow:

1. The agent triggers a simulated deep link by calling `xcrun simctl openurl booted 'betmeet://auth/callback'` with a mock URL (the adapter's `handleOAuthCallback` is not tested end-to-end here — that requires a real Supabase session with a valid code).
2. The smoke test verifies the app receives the URL and reaches the sign-in success state (or appropriate error state for a mock URL).

---

## Consequences

- Unit tests provide full coverage of the parsing, adapter method signatures, and UI rendering — these are deterministic.
- The OAuth redirect end-to-end (real Google credentials, real Supabase session) is a manual / QA step, documented here as deferred.
- The custom scheme `betmeet://` is sufficient for all automated test coverage in this bolt.
- If the Supabase project's allowed redirect URLs do not include `betmeet://auth/callback`, OAuth will fail at the Supabase server redirect step — this is a configuration concern outside the code, not a code bug.
