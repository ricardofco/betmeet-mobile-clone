# ADR-009 — Passkey Seam: MfaProvider Interface

**Date:** 2026-06-29
**Status:** Accepted (seam designed; implementation deferred)
**Bolt:** 2 — Auth Secondary Flows

---

## Context

Requirements §8 specifies TOTP-only MFA at launch. However, the requirements also acknowledge that passkeys (iOS `ASAuthorizationPlatformPublicKeyCredentialProvider` / Android Credential Manager) are a likely future addition. The design must not make passkey addition require modifying existing sign-in callers.

---

## Decision

### The seam: `MfaProvider` interface

A `MfaProvider` interface is defined at the **domain layer** (`src/domain/auth/`) as a type-level seam. No concrete implementation is provided in this bolt beyond TOTP (which is wired directly through `SupabaseAdapter` methods, not through this interface — see below).

```ts
interface MfaProvider {
  readonly type: 'totp' | 'passkey';
  enroll(): Promise<TotpEnrollmentState>;
  challenge(): Promise<string>;          // returns challengeId
  verify(challengeId: string, code: string): Promise<MfaChallengeResult>;
}
```

### What ships in this bolt

- The `MfaProvider` interface as a TypeScript type (no runtime code, no class).
- TOTP MFA wired **directly** through `SupabaseAdapter` methods (`enrollTotp`, `verifyTotpEnrollment`, `challengeAndVerifyMfa`) — not through the `MfaProvider` interface.
- This is intentional: the interface exists as a future abstraction boundary, not a current indirection layer. Premature abstraction would require a TOTP concrete class, a provider factory, and injection plumbing — none of which add value with one provider.

### What a future passkey implementor must do

1. **Create a `PasskeyMfaProvider` class** implementing `MfaProvider` with `type: 'passkey'`. It would wrap the native platform APIs:
   - iOS: `ASAuthorizationPlatformPublicKeyCredentialProvider` via a native module or `react-native-passkeys` (or similar library at the time).
   - Android: `CredentialManager` via a native module.
2. **Add a `enrollPasskey` / `verifyPasskey` method** to `SupabaseAdapter` — or use Supabase's `mfa.enroll({ factorType: 'webauthn' })` if Supabase adds WebAuthn support.
3. **Add a new `ScreenClassTag`** if passkey challenge requires a distinct screen (e.g. `'passkey-challenge'`).
4. **Add a new `OAuthProvider` literal** if the passkey provider is exposed as an OAuth-style flow in Supabase.
5. **Update `TotpEnrollmentScreen`** to be a generic `MfaEnrollmentScreen` if the UI is shared — or create a separate `PasskeyEnrollmentScreen`.
6. **No changes to sign-in callers** (e.g. `SignInScreen`, `AuthGatedNavigator`) if the guard branch is kept generic (`'mfa-challenge'` tag, regardless of factor type).

### Why `SupabaseAdapter` methods are direct rather than abstracted

The domain-layer `MfaProvider` seam separates the domain from the implementation — callers at the domain level can use `MfaProvider.verify()` without knowing if it is TOTP or passkey. But at the platform layer, `SupabaseAdapter` is already the single integration seam (ADR-003). Introducing a `MfaProvider` concrete class *inside* the adapter layer would be redundant — the adapter IS the boundary.

The practical outcome: adding passkeys means adding new `SupabaseAdapter` methods (e.g. `enrollPasskey`, `verifyPasskey`) alongside the existing TOTP methods. Callers that care about the abstraction can use the `MfaProvider` interface type.

---

## Consequences

- Zero runtime cost in this bolt — the interface is TypeScript-only.
- A future passkey implementor has a documented path (this ADR) and does not need to reverse-engineer the design intent.
- The `MfaProvider` interface is the only artifact of this ADR that ships as code; everything else is documentation.
- If Supabase adds first-class WebAuthn/passkey support, the `SupabaseAdapterImpl` passkey methods can call `supabase.auth.mfa.enroll({ factorType: 'webauthn' })` — the domain interface and callers remain unchanged.
