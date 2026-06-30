# Bolt 2 — Auth Secondary Flows — Implement & Test

## Implementation Summary

### Dependencies added
- `react-native-svg` — SVG rendering (TOTP QR code)
- `react-native-qrcode-svg` — QR code generation for TOTP enrollment (wraps `react-native-svg`)
- `pod install` required on iOS after adding these packages

### Native manifest changes
- **iOS** `ios/BetmeetMobile/Info.plist`: `CFBundleURLSchemes` entry added for `betmeet` custom scheme
- **Android** `android/app/src/main/AndroidManifest.xml`: intent filter added for `betmeet://` scheme on main activity

### Domain layer (`src/domain/auth/`)
- `parse-deep-link.ts` — `parseDeepLink(url): DeepLinkPayload` (pure, no SDK)
- `validate-totp-code.ts` — `validateTotpCode(code): TotpCodeValidation` (pure, 6-digit rule)
- Both exported from `index.ts`

### Platform layer
- `src/platform/supabase/supabase-adapter.ts` extended with: `signInWithOAuth`, `handleOAuthCallback`, `enrollTotp`, `verifyTotpEnrollment`, `getMfaFactors`, `challengeAndVerifyMfa`, `requestPasswordReset`, `exchangePasswordResetToken`, `setNewPassword`, `changePassword`, `changeEmail`

### Auth session store
- `mfaFactorId: string | null` field + `setMfaFactorId` action added

### Guard
- `evaluateGuard` extended with `mfa-challenge` case: `aal1` session with `nextLevel: aal2` → `ScreenClass` containing `'mfa-challenge'`
- `AuthGatedNavigator` renders `MfaChallengeScreen` for this branch

### Screens added
| Screen | Path |
|---|---|
| `ForgotPasswordScreen` | `src/host/auth/screens/forgot-password-screen.tsx` |
| `SetNewPasswordScreen` | `src/host/auth/screens/set-new-password-screen.tsx` |
| `MfaChallengeScreen` | `src/host/auth/screens/mfa-challenge-screen.tsx` |
| `TotpEnrollmentScreen` | `src/host/settings/screens/totp-enrollment-screen.tsx` |
| `AccountSettingsScreen` | `src/host/settings/screens/account-settings-screen.tsx` |
| `ChangePasswordScreen` | `src/host/settings/screens/change-password-screen.tsx` |
| `ChangeEmailScreen` | `src/host/settings/screens/change-email-screen.tsx` |

### Navigation
- Unauthenticated stack: `ForgotPasswordScreen`, `SetNewPasswordScreen` added
- Authenticated stack: Settings stack added (`AccountSettingsScreen`, `ChangePasswordScreen`, `ChangeEmailScreen`, `TotpEnrollmentScreen`)
- `LinkingConfiguration` wired for `betmeet://auth/callback` (OAuth) and `betmeet://auth/reset-password` (password reset)
- `SignInScreen` updated with "Sign in with Google" button

---

## Layer 1 — Test Results

**129 tests passing across 18 suites** (was 59/11 after Bolt 1).

New suites added in Bolt 2:
- `parse-deep-link.test.ts` — both schemes, both payload kinds, unknown/malformed URLs
- `validate-totp-code.test.ts` — valid 6-digit, leading zeros, too short, too long, non-numeric, empty
- `forgot-password-screen.test.tsx`
- `set-new-password-screen.test.tsx`
- `mfa-challenge-screen.test.tsx`
- `totp-enrollment-screen.test.tsx`
- `account-settings-screen.test.tsx`
- `change-password-screen.test.tsx`
- `change-email-screen.test.tsx`

---

## Layer 2 — Device Verification

**Deferred to manual verification by user.**

Suggested manual test paths on iOS Simulator (rebuild required — `Info.plist` was updated):
1. **Forgot password → deep link**: tap "Forgot password?" → enter email → confirm "check your inbox" message
2. **Google OAuth**: tap "Sign in with Google" → confirm browser opens → follow OAuth flow → confirm deep-link callback returns user to app
3. **MFA Challenge**: sign in with a TOTP-enrolled test account → confirm `MfaChallengeScreen` appears; enter wrong code → stays on screen; enter correct code → lands in app
4. **TOTP Enrollment**: sign in → navigate to AccountSettings → "Enable two-factor authentication" → confirm QR code renders → enter code → confirm enrollment
5. **Change email**: AccountSettings → Change Email → enter new address → confirm "confirmation sent" message
6. **Change password**: AccountSettings → Change Password → enter current + new password → confirm success

---

## Known Issues / Deferred
- App must be rebuilt (not just restarted) for `betmeet://` URL scheme to be registered by iOS — run `yarn ios` or rebuild from Xcode after the `Info.plist` update.
- Android Layer 2 not yet verified.
- MFA Challenge Layer 2 requires a TOTP-enrolled Supabase test account.
