# Bolt 2 — Auth Secondary Flows — Model Stage

> **Stage 1 of 5 (Model).** DDD domain modeling, framework-free, no UI. Checkpoint: pause for approval before Design.

## Scope recap

This bolt covers four stories: **AUTH-2** (Google OAuth + deep link), **AUTH-3** (TOTP MFA enrollment + challenge), **AUTH-4** (forgot/reset password via deep link), and **AUTH-5** (change password + change email for authenticated users). It extends `domain/auth/` with new pure functions and types. It does NOT touch the core guard logic (ADR-001 through ADR-004 are closed).

Native passkeys (iOS `ASAuthorizationPlatformPublicKeyCredentialProvider` / Android Credential Manager) are **deferred** — a seam for future passkey addition is designed in the ADRs, but not implemented.

---

## 1. Ubiquitous Language Extensions

The following terms extend the glossary from `bolt-1-auth-core/model.md`:

| Term | Precise meaning |
|---|---|
| **OAuth Provider** | An external identity provider (Google at launch; Apple/GitHub as future additions) through which a user authenticates via the Supabase OAuth flow. The provider is passed to Supabase's `signInWithOAuth`; the app never receives or stores the raw OAuth credential directly. |
| **OAuth Callback URL** | The deep link the OAuth provider redirects to after authorization (`betmeet://auth/callback` for iOS/Android; `https://betmeet.app/auth/callback` as the Universal/App Link form). The URL carries the session tokens as URL fragments (PKCE exchange happens server-side inside Supabase). |
| **Deep Link** | A URL routed to the app by the OS (iOS Universal Links / Android App Links for `https://`; `betmeet://` custom scheme as fallback). In auth, deep links carry either an OAuth callback or a password-reset token. |
| **Deep Link Payload** | The parsed, domain-typed result of parsing a raw deep-link URL string. One of: `OAuthCallbackPayload`, `PasswordResetPayload`, or `UnknownPayload`. The parsing is a pure function so it is independently unit-testable. |
| **TOTP** | Time-based One-Time Password — the only MFA factor type supported at launch. A six-digit code derived from a shared secret (TOTP secret) + current time. |
| **MFA Factor** | A registered TOTP authenticator — a Supabase `Factor` record with `factor_type: 'totp'`. A user may have zero (MFA disabled) or one (MFA enabled) factor at launch. |
| **TOTP Enrollment** | The multi-step flow: (1) app requests a new factor from Supabase → receives a `totpSecret` + `qrCodeUri`; (2) user scans QR code in their authenticator app; (3) user enters the resulting code; (4) app verifies → factor is activated. Until step 4 succeeds the factor is in `unverified` state and does not gate sign-in. |
| **MFA Challenge** | The post-sign-in step when the user's account has an `aal2` factor active. After password sign-in (producing `aal1` session), Supabase's `mfa.getAuthenticatorAssuranceLevel` returns `{ currentLevel: 'aal1', nextLevel: 'aal2' }`. The user must complete a challenge (`mfa.challengeAndVerify`) to elevate to `aal2`. |
| **Challenge ID** | The Supabase-issued `challengeId` returned by `mfa.challenge()` — a short-lived token the verify step consumes. Not stored beyond the challenge screen's lifetime. |
| **TOTP Code** | The six-digit string the user enters from their authenticator app. Domain rule: exactly 6 digits, no spaces. |
| **Password Reset Token** | The `token_hash` + `type=recovery` pair Supabase embeds in the password-reset email link. The app parses this from the deep link, exchanges it for a session via `verifyOtp`, then shows the "set new password" screen. |
| **Recovery Session** | A short-lived Supabase session established by `verifyOtp(token_hash, 'recovery')`. It is sufficient to call `updateUser({ password: newPassword })` but NOT to navigate to the app home — the guard must re-evaluate after `updateUser` succeeds, at which point the session transitions to a normal authenticated session. |
| **Re-auth** | A step where an already-authenticated user re-supplies their current password (or re-authenticates via OAuth) before a sensitive operation (change password, change email). Supabase Auth does not require a server-side re-auth call at this time — the re-auth step is a UI-level safeguard applied locally. |
| **Passkey Seam** | A placeholder interface (`MfaProvider`) designed in this bolt's ADR that accepts future passkey authenticators without changing sign-in callers. Not implemented beyond the interface. |

---

## 2. New Domain Concepts

### 2.1 `OAuthProvider` (value object)

```ts
type OAuthProvider = 'google'; // 'apple' | 'github' added later — seam exists
```

Domain rule: the set of supported providers is closed at launch. Adding a provider means adding a string literal to this union, nothing else; the rest of the sign-in flow is provider-agnostic.

### 2.2 `OAuthSignInResult` (outcome)

```ts
type OAuthSignInResult =
  | { type: 'oauth-browser-opened' }   // OS-level browser opened; app waits for deep link callback
  | { type: 'error' };                  // generic — no provider-specific leakage
```

Domain rule: the result of *initiating* OAuth is binary — either the OS-level browser opened (success at this step) or it did not. The actual credential exchange happens in Supabase's server-side PKCE flow, observed through `onSessionChange` after the deep-link callback is processed.

### 2.3 `DeepLinkPayload` (value object + pure parse function)

```ts
type OAuthCallbackPayload = {
  kind: 'oauth-callback';
  // The raw URL is passed to Supabase's `handleOAuthCallback` — no token fields
  // are extracted directly; Supabase owns the PKCE exchange.
  rawUrl: string;
};

type PasswordResetPayload = {
  kind: 'password-reset';
  tokenHash: string;  // Supabase `token_hash` param
  type: 'recovery';
};

type UnknownPayload = { kind: 'unknown'; rawUrl: string };

type DeepLinkPayload = OAuthCallbackPayload | PasswordResetPayload | UnknownPayload;
```

Pure parse function signature (no SDK import):

```ts
function parseDeepLink(url: string): DeepLinkPayload
```

Domain rules for parsing:
- A URL whose host is `auth` and path starts with `/callback` → `OAuthCallbackPayload`.
- A URL containing `token_hash` query param and `type=recovery` → `PasswordResetPayload`.
- All other URLs → `UnknownPayload` (fail-open, never crashes).
- Both custom-scheme (`betmeet://`) and Universal Link (`https://betmeet.app/`) forms are accepted.

### 2.4 `TotpCodeValidation` (value object + pure validator)

```ts
type TotpCodeValidation =
  | { valid: true; code: string }
  | { valid: false; reason: 'too-short' | 'too-long' | 'not-numeric' };
```

Pure validator:

```ts
function validateTotpCode(code: string): TotpCodeValidation
```

Domain rules:
- Exactly 6 characters.
- All characters are ASCII digits 0–9.
- Leading zeros are valid (e.g. `000123`).

### 2.5 `TotpEnrollmentState` (aggregate)

```ts
type TotpEnrollmentState =
  | { phase: 'idle' }
  | { phase: 'pending-scan'; totpSecret: string; qrCodeUri: string; factorId: string }
  | { phase: 'verifying'; factorId: string; challengeId: string }
  | { phase: 'verified' }
  | { phase: 'error'; reason: string };
```

Domain rules:
- `pending-scan` is the state after `SupabaseAdapter.enrollTotp()` returns — the secret and QR URI are ready for display.
- `verifying` is entered when the user submits their first code — the app has called `mfa.challenge()` and is awaiting `mfa.verify()`.
- `verified` terminates the enrollment flow — `AuthGatedNavigator` re-renders on the next `onSessionChange` with the updated `aal` claims.
- `error` is a recoverable terminal: the UI shows the reason and the user can retry from `idle`.

### 2.6 `MfaChallengeResult` (outcome)

```ts
type MfaChallengeResult =
  | { type: 'verified' }            // aal2 session established; guard re-evaluates
  | { type: 'invalid-code' }        // wrong TOTP digit — the user may retry (challenge is not consumed)
  | { type: 'expired' }             // challenge TTL exceeded — must restart challenge
  | { type: 'error' };              // other failure — surface generic message
```

### 2.7 `PasswordResetRequestResult` (outcome for AUTH-4 step 1)

```ts
type PasswordResetRequestResult =
  | { type: 'sent' }          // reset email dispatched; user should check inbox
  | { type: 'invalid-email' } // client-side validation only — no enumeration
  | { type: 'error' };        // network/server error; generic message
```

Domain rule: `invalid-email` is client-side only (same `EMAIL_PATTERN` re-used from `sign-up.ts`). The Supabase `resetPasswordForEmail` call is not made if the email is malformed client-side; if it is made and Supabase rejects it, that is `error` — never an account-enumeration signal.

### 2.8 `PasswordResetExchangeResult` (outcome for AUTH-4 step 2 — token exchange)

```ts
type PasswordResetExchangeResult =
  | { type: 'session-established' }  // recovery session ready; show "Set new password" screen
  | { type: 'invalid-token' }         // token_hash expired or already used
  | { type: 'error' };
```

### 2.9 `SetNewPasswordResult` (outcome for AUTH-4 step 3)

```ts
type SetNewPasswordResult =
  | { type: 'password-updated' }       // guard re-evaluates; lands user in app
  | { type: 'validation-error'; reason: string }  // client-side password strength check
  | { type: 'error' };
```

Domain rule: password must satisfy the same minimum-8-character rule from `sign-up.ts` (`validateSignUpInput` re-used; no new rule invented).

### 2.10 `ChangePasswordResult` (outcome for AUTH-5)

```ts
type ChangePasswordResult =
  | { type: 'password-changed' }
  | { type: 'validation-error'; reason: string }   // new password strength check
  | { type: 'error' };
```

Domain rule: the "current password" the user enters for re-auth is validated by attempting a sign-in (Supabase does not expose a standalone "verify current password" endpoint). A failed re-auth sign-in → `error` (not `invalid-credentials` as a named outcome here — `ChangePasswordResult` deliberately does not distinguish why the current-password step failed, to avoid over-informing a potential account hijacker).

### 2.11 `ChangeEmailResult` (outcome for AUTH-5)

```ts
type ChangeEmailResult =
  | { type: 'confirmation-sent' }   // Supabase sends confirmation to the new address
  | { type: 'invalid-email'; reason: string }
  | { type: 'error' };
```

Domain rule: the new email must pass client-side format validation before the Supabase call is made. If the new email is the same as the current email, result is `error` (treated as a no-op error, never silently passed through).

---

## 3. Domain state progressions

### AUTH-2 — Google OAuth lifecycle

```
unauthenticated
  │ user taps "Sign in with Google"
  ▼
oauth-browser-opened (OS browser/sheet shows Google consent)
  │ user approves → Supabase handles PKCE exchange → deep link fires
  ▼
deep link received → parseDeepLink → OAuthCallbackPayload
  │ SupabaseAdapter.handleOAuthCallback(rawUrl)
  ▼
onSessionChange fires → same AuthClaims/AuthSession flow as password sign-in
  │ AuthGatedNavigator re-renders → guard evaluates → lands user in app
```

### AUTH-3 — MFA Challenge (at sign-in)

```
signed-in (aal1 session, claims.aal.next === 'aal2')
  │ AuthGatedNavigator sees isPendingMfa → renders MfaChallengeTree (rule 4 exception)
  ▼
user enters TOTP code
  │ SupabaseAdapter.verifyMfaChallenge(factorId, code)
  ▼
MfaChallengeResult:
  verified → onSessionChange fires aal2 session → guard re-evaluates → home/onboarding
  invalid-code → stay on challenge screen, allow retry
  expired → restart challenge (new challengeId)
  error → surface generic message
```

### AUTH-3 — TOTP Enrollment (in settings)

```
authenticated user in Settings
  │ taps "Enable two-factor authentication"
  ▼
TotpEnrollmentState: idle → (enrollTotp()) → pending-scan (QR code displayed)
  │ user scans QR, enters code
  ▼
pending-scan → (verifyEnrollment()) → verifying → verified
  │ onSessionChange fires updated AAL → claims.aal now set
```

### AUTH-4 — Password Reset lifecycle

```
unauthenticated (or any session)
  │ ForgotPasswordScreen: user enters email → requestPasswordReset(email)
  ▼
PasswordResetRequestResult: sent → "check your inbox" confirmation shown
  │ user taps email link → OS delivers deep link
  ▼
parseDeepLink → PasswordResetPayload
  │ SupabaseAdapter.exchangePasswordResetToken(tokenHash)
  ▼
PasswordResetExchangeResult: session-established → navigate to SetNewPasswordScreen
  │ user enters new password → setNewPassword(password)
  ▼
SetNewPasswordResult: password-updated → onSessionChange fires → guard re-evaluates
```

### AUTH-5 — Change Password / Email lifecycle

```
authenticated user in Settings
  │ Change Password: enters current + new password → changePassword(current, new)
  ▼
ChangePasswordResult: password-changed | validation-error | error

  │ Change Email: enters new email → changeEmail(newEmail)
  ▼
ChangeEmailResult: confirmation-sent → "confirm via email link" shown
```

---

## 4. Passkey Seam (design-only, not implemented)

A `MfaProvider` interface is defined here as a type boundary; no implementation ships in this bolt:

```ts
/**
 * Abstraction over TOTP and future passkey/biometric authenticators.
 * TOTP is the only concrete implementation in this bolt (TOTP-only at launch,
 * requirements.md §8). Passkey implementation (iOS ASAuthorizationPlatformPublicKeyCredentialProvider
 * / Android Credential Manager) is deferred — adding it means implementing
 * this interface, not modifying callers.
 */
interface MfaProvider {
  readonly type: 'totp' | 'passkey'; // future passkey adds a new literal here
  enroll(): Promise<TotpEnrollmentState | PasskeyEnrollmentState>; // future
  challenge(): Promise<string>; // returns challengeId
  verify(challengeId: string, code: string): Promise<MfaChallengeResult>;
}
```

The `SupabaseAdapter` methods for MFA (`enrollTotp`, `verifyMfaChallenge`) follow the same direct-method pattern as Bolt 1 (no interface abstraction at the adapter level — passkeys would add new adapter methods, not replace the existing ones). The `MfaProvider` seam lives at the domain level, not at the adapter level — callers can swap it without touching Supabase.

---

## 5. Explicitly not modeled in this bolt

- Native passkey implementation (iOS `ASAuthorizationPlatformPublicKeyCredentialProvider`, Android `CredentialManager`) — seam designed, not built.
- Account deletion (AUTH-6) — deferred to Bolt 8, which owns ownership-transfer logic first.
- Push notifications for password/email change confirmation — out of scope; belongs to Bolt 10.
- Backend API calls for cooldown enforcement on `resetPasswordForEmail` — Supabase itself rate-limits reset emails; no extra backend call is needed at this stage.
- Apple/GitHub OAuth providers — seam exists (`OAuthProvider` union is extensible), not built.

---

## Checkpoint

Pausing here for approval before Design (screen tree additions, navigation params, Zustand store changes, SupabaseAdapter method additions, and deep-link handler placement).
