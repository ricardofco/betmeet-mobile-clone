# Bolt 2 — Auth Secondary Flows — Design Stage

> **Stage 2 of 5 (Design).** Component/data-flow design, navigation params, host placement decision, and SupabaseAdapter method additions. Framework: React Native + React Navigation native-stack + Zustand. No UI code yet.

---

## 1. New Screens and Navigation Params

### 1.1 Unauthenticated Screens (replace existing placeholders)

| Screen | File | Purpose | Navigation Params |
|---|---|---|---|
| `ForgotPasswordScreen` | `src/host/auth/screens/forgot-password-screen.tsx` | Email input + submit; sends password-reset email via Supabase | none (replaces Bolt 1 placeholder) |
| `SetNewPasswordScreen` | `src/host/auth/screens/set-new-password-screen.tsx` | New password input; reached after deep-link token exchange; calls `setNewPassword` | none (deep-link params handled by `LinkingConfiguration`) |

Note: Bolt 1 already scaffolded `ForgotPasswordScreen` and `ResetPasswordScreen` as placeholders. Bolt 2 replaces `ForgotPasswordScreen` with a real implementation and renames/replaces `ResetPasswordScreen` with `SetNewPasswordScreen` (the Bolt 2 model uses "set new password" terminology; the route remains `ResetPassword` in the param list for continuity).

### 1.2 MFA-Challenge Screen (unauthenticated branch of the guard)

| Screen | File | Purpose | Navigation Params |
|---|---|---|---|
| `MfaChallengeScreen` | `src/host/auth/screens/mfa-challenge-screen.tsx` | TOTP code entry for post-sign-in MFA elevation from `aal1` to `aal2` | none (rendered as the root of `MfaChallengeTree`, no navigation params needed — `mfaFactorId` comes from Zustand store) |

### 1.3 Authenticated Settings Screens

| Screen | File | Purpose | Navigation Params |
|---|---|---|---|
| `AccountSettingsScreen` | `src/host/settings/screens/account-settings-screen.tsx` | Entry point — links to Change Password, Change Email, and TOTP Enrollment | none |
| `ChangePasswordScreen` | `src/host/settings/screens/change-password-screen.tsx` | Current + new password fields; calls `changePassword` | none |
| `ChangeEmailScreen` | `src/host/settings/screens/change-email-screen.tsx` | New email field; calls `changeEmail` | none |
| `TotpEnrollmentScreen` | `src/host/settings/screens/totp-enrollment-screen.tsx` | Multi-step QR scan + code verification; local `TotpEnrollmentState` machine | none |

---

## 2. Navigation

### 2.1 Guard Branches (extending ADR-001)

`AuthGatedNavigator` gains a new branch between the unauthenticated check and the onboarding/home check:

```
evaluateGuard outcome  →  rendered tree
─────────────────────────────────────────────────────────────────────
eject                  →  (sign-out side effect) + splash ActivityIndicator
sign-in                →  UnauthenticatedTree  (unchanged)
verify-email           →  VerifyEmailTree      (unchanged)
mfa-challenge          →  MfaChallengeTree     (NEW — see §2.2)
onboarding             →  OnboardingTree       (unchanged)
home / proceed         →  renderAppTree()      (unchanged)
```

The condition for the new branch is evaluated inside `evaluateGuard` via a new `ScreenClass` tag `'mfa-challenge'` (see §4 below).

### 2.2 MfaChallengeTree

A single-screen navigator; no back-navigation — the user is locked into MFA until they succeed or sign out.

```tsx
function MfaChallengeTree() {
  return (
    <MfaStack.Navigator>
      <MfaStack.Screen name="MfaChallenge" component={MfaChallengeScreen} />
    </MfaStack.Navigator>
  );
}
```

Type: `MfaStackParamList = { MfaChallenge: undefined }`.

### 2.3 Unauthenticated Stack — additions

`ForgotPasswordScreen` already exists in `UnauthenticatedTree` and `VerifyEmailTree` as a placeholder (Bolt 1). The route name and position are unchanged; only the screen component content changes.

`SetNewPasswordScreen` is added as a new route `SetNewPassword` in both trees. It is navigated to programmatically after the deep-link token exchange succeeds (`PasswordResetExchangeResult.session-established`), using `navigation.navigate('SetNewPassword')` from within the `LinkingConfiguration` handler.

Updated `AuthStackParamList`:
```ts
type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  SetNewPassword: undefined;   // NEW (replaces ResetPassword)
  VerifyEmail: VerifyEmailScreenParams;
};
```

Note: `ResetPassword` route name from Bolt 1 is replaced with `SetNewPassword` to align with Bolt 2's model terminology. The `screen-registry.ts` and `auth-gated-navigator.tsx` are updated accordingly.

### 2.4 Authenticated Settings Stack

A new settings navigator (native-stack) is added inside `renderAppTree()` — specifically inside the host app tree (`root-navigator.tsx`).

```
AppStack (existing)
  └── Home (HomeScreen)
  └── Settings (SettingsStack — NEW)
        ├── AccountSettings (AccountSettingsScreen)
        ├── ChangePassword  (ChangePasswordScreen)
        ├── ChangeEmail     (ChangeEmailScreen)
        └── TotpEnrollment  (TotpEnrollmentScreen)
```

`AppStackParamList` gains:
```ts
type AppStackParamList = {
  Home: undefined;
  Settings: undefined;  // entry into SettingsStack
};

type SettingsStackParamList = {
  AccountSettings: undefined;
  ChangePassword: undefined;
  ChangeEmail: undefined;
  TotpEnrollment: undefined;
};
```

### 2.5 Deep-Link Routing — LinkingConfiguration

A `LinkingConfiguration` object is passed to `<NavigationContainer linking={...}>` in `root-navigator.tsx`. This wires the OS-delivered URL into React Navigation's screen-resolution logic.

```ts
const linking: LinkingOptions<RootParamList> = {
  prefixes: [
    'betmeet://',
    'https://betmeet.app',
  ],
  config: {
    screens: {
      // Unauthenticated auth stack (the navigator renders under AuthGatedNavigator):
      // Deep links are intercepted before they reach RN Navigation screen routing —
      // we handle them ourselves in the NavigationContainer's onReady + Linking.addEventListener.
      // The `subscribe` override handles both URL kinds imperatively:
      //   'betmeet://auth/callback' → call handleOAuthCallback → session change fires
      //   'betmeet://auth/reset-password?token_hash=...&type=recovery' → exchangePasswordResetToken → navigate SetNewPassword
    },
  },
  // Custom subscribe lets us intercept the URL before RN Navigation acts on it,
  // so we can parse it, call the adapter, and then decide where to navigate.
  subscribe(listener) {
    // handled imperatively — see deep-link handler in root-navigator.tsx
    return () => {};
  },
};
```

The actual deep-link interception is handled by a `useEffect` in `RootNavigator` that calls `Linking.addEventListener('url', handler)` and `Linking.getInitialURL()` for cold-start deep links. The handler uses `parseDeepLink` (domain pure function) to classify the URL, then calls the appropriate `SupabaseAdapter` method.

---

## 3. State

### 3.1 AuthSessionStore — extension

`AuthSessionStoreState` gains one new field and one new action:

```ts
type AuthSessionStoreState = {
  // existing fields:
  status: 'loading' | 'ready';
  claims: AuthClaims;
  pendingDestination: Destination | null;
  setSession: (session: AuthSession | null) => void;
  setPendingDestination: (destination: Destination | null) => void;

  // NEW:
  mfaFactorId: string | null;
  setMfaFactorId: (id: string | null) => void;
};
```

`mfaFactorId` is set by `MfaChallengeScreen` after the sign-in response indicates `aal2` is needed, by calling `getSupabaseAdapter().getMfaFactors()`. It is cleared (set to `null`) once `MfaChallengeResult.verified` is received and the session-change fires.

### 3.2 TotpEnrollmentState — local component state

`TotpEnrollmentState` (the five-phase state machine from the model) lives as a `useState` hook inside `TotpEnrollmentScreen`. It is ephemeral UI state — there is no persistence requirement, no cross-screen sharing, and no benefit to Zustand for a flow that terminates and clears itself. This avoids the overhead of a global store for a single screen's wizard state.

---

## 4. Guard Extension — `evaluateGuard` and `ScreenClass`

### 4.1 New `ScreenClassTag`

`screen-class.ts` gains a new tag:
```ts
export type ScreenClassTag = 'public' | 'auth-only' | 'verify-email' | 'onboarding' | 'protected' | 'mfa-challenge';
```

### 4.2 `evaluateGuard` new case

A new rule is inserted **after rule 3** (unconfirmed email) and **before rule 4** (auth-only redirect):

> If the user is authenticated, email-confirmed, and their session's `aal.current === 'aal1'` while `aal.next === 'aal2'` → redirect to `mfa-challenge`.

```ts
// New rule 3.5 (between existing rules 3 and 4):
if (isAuthenticated(claims) && !isExplicitlyFalse(claims.emailVerified)) {
  if (claims.aal?.current === 'aal1' && claims.aal?.next === 'aal2') {
    if (hasScreenClass(currentScreenClass, 'mfa-challenge')) {
      return { type: 'proceed' };
    }
    return { type: 'redirect', to: 'mfa-challenge' };
  }
}
```

`GuardOutcome` gains:
```ts
| { type: 'redirect'; to: 'mfa-challenge' }
```

`SCREEN_REGISTRY` gains:
```ts
MfaChallenge: ['mfa-challenge'] as ScreenClass,
SetNewPassword: ['public', 'auth-only'] as ScreenClass,
AccountSettings: ['protected'] as ScreenClass,
ChangePassword: ['protected'] as ScreenClass,
ChangeEmail: ['protected'] as ScreenClass,
TotpEnrollment: ['protected'] as ScreenClass,
```

---

## 5. SupabaseAdapter — New Methods

All new methods are added to the `SupabaseAdapter` interface and `SupabaseAdapterImpl` class. ADR-003 boundary: domain pure functions (`parseDeepLink`, `validateTotpCode`) are called from the adapter, never the reverse. No Supabase SDK import outside this file.

| Method | Signature | Notes |
|---|---|---|
| `signInWithOAuth` | `(provider: OAuthProvider): Promise<OAuthSignInResult>` | Opens OS browser via `supabase.auth.signInWithOAuth`; returns `oauth-browser-opened` or `error` |
| `handleOAuthCallback` | `(url: string): Promise<void>` | Calls `supabase.auth.exchangeCodeForSession(url)`; session change fires `onSessionChange` |
| `enrollTotp` | `(): Promise<{ totpSecret: string; qrCodeUri: string; factorId: string }>` | Calls `supabase.auth.mfa.enroll({ factorType: 'totp' })` |
| `verifyTotpEnrollment` | `(factorId: string, code: string): Promise<MfaChallengeResult>` | Challenge + verify; validates code with `validateTotpCode` before calling Supabase |
| `getMfaFactors` | `(): Promise<{ factorId: string \| null }>` | Returns first active TOTP factor ID or null |
| `challengeAndVerifyMfa` | `(factorId: string, code: string): Promise<MfaChallengeResult>` | Calls `mfa.challenge` then `mfa.verify`; classifies errors into `MfaChallengeResult` |
| `requestPasswordReset` | `(email: string): Promise<PasswordResetRequestResult>` | Validates email client-side; calls `supabase.auth.resetPasswordForEmail` |
| `exchangePasswordResetToken` | `(tokenHash: string): Promise<PasswordResetExchangeResult>` | Calls `supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })` |
| `setNewPassword` | `(password: string): Promise<SetNewPasswordResult>` | Validates password via `validateSignUpInput`; calls `supabase.auth.updateUser({ password })` |
| `changePassword` | `(currentPassword: string, newPassword: string): Promise<ChangePasswordResult>` | Re-auth via `signInWithPassword` to verify current; then `updateUser` |
| `changeEmail` | `(newEmail: string): Promise<ChangeEmailResult>` | Validates email; calls `supabase.auth.updateUser({ email: newEmail })` |

---

## 6. Host vs Remote Placement

All screens, domain functions, and adapter methods in this bolt are **host bundle** artifacts. No new federated remote is introduced.

Justification: Auth flows (OAuth callback handling, MFA challenge, password reset) are identity-critical paths. Federated loading of a remote chunk that hasn't yet arrived would block the user from signing in — an unacceptable UX and security property. Auth remains host-placed per requirements.md §7 and the topology in `system-architecture.md`.

---

## 7. vercel-react-native-skills Rules to Enforce at Implement

Per the prescriptive ruleset, all new screen components must:
- Use `StyleSheet.create` for all styles — no inline style objects.
- Use `useCallback` for all event handlers passed as props or to pressable components.
- Use `useMemo` for any derived value consumed in JSX (e.g. derived error messages, validation state).
- No anonymous functions in `useEffect` dependency arrays — extract named callbacks.
- Use `TextInput` with `accessibilityLabel` on every input.
- Use `Button` or a pressable with `accessibilityRole="button"` for all actions.

---

## 8. File Map (to be created in Implement)

```
src/
  domain/auth/
    parse-deep-link.ts              (NEW — pure function)
    validate-totp-code.ts           (NEW — pure function)
    index.ts                        (NEW — barrel re-export)
    __tests__/
      parse-deep-link.test.ts       (NEW)
      validate-totp-code.test.ts    (NEW)

  platform/supabase/
    supabase-adapter.ts             (EXTEND — new methods)

  host/
    auth/
      auth-session-store.ts         (EXTEND — mfaFactorId field)
      navigation/
        auth-stack-params.ts        (EXTEND — SetNewPassword, MfaStackParamList, SettingsStackParamList)
        auth-gated-navigator.tsx    (EXTEND — MfaChallengeTree branch)
        screen-registry.ts          (EXTEND — new route entries)
      screens/
        forgot-password-screen.tsx  (REPLACE placeholder)
        set-new-password-screen.tsx (NEW — was reset-password-screen.tsx)
        mfa-challenge-screen.tsx    (NEW)
        __tests__/
          forgot-password-screen.test.tsx    (NEW)
          set-new-password-screen.test.tsx   (NEW)
          mfa-challenge-screen.test.tsx      (NEW)

    settings/
      screens/
        account-settings-screen.tsx  (NEW)
        totp-enrollment-screen.tsx   (NEW)
        change-password-screen.tsx   (NEW)
        change-email-screen.tsx      (NEW)
        __tests__/
          account-settings-screen.test.tsx   (NEW)
          totp-enrollment-screen.test.tsx    (NEW)
          change-password-screen.test.tsx    (NEW)
          change-email-screen.test.tsx       (NEW)

    navigation/
      root-navigator.tsx             (EXTEND — LinkingConfiguration, SettingsStack, deep-link handler)
      linking-configuration.ts       (NEW — extracted LinkingConfiguration object)
```

---

## 9. Open Questions / Assumptions

1. `SetNewPassword` replaces `ResetPassword` in the route name — Bolt 1's `ResetPasswordScreen` placeholder is superseded. The Bolt 1 test files for that screen are not yet written (it was a placeholder) so no breakage expected.
2. The Google OAuth `signInWithOAuth` flow on iOS Simulator uses the system Safari in-app browser (ASWebAuthenticationSession) — this is testable on Simulator with network access to the Supabase OAuth redirect. ADR-006 records the testability boundary.
3. The `MfaChallengeScreen` reads `mfaFactorId` from the Zustand store (set by the screen that detected the `aal2` requirement). The trigger for setting `mfaFactorId` is the sign-in flow: after `signInWithPassword` succeeds and `onSessionChange` fires an `aal1` session with `nextLevel: aal2`, `AuthGatedNavigator` renders `MfaChallengeTree`, and `MfaChallengeScreen` calls `getMfaFactors()` on mount to get the factor ID.
