import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';
import {
  type AuthClaims,
  type AuthSession,
  UNAUTHENTICATED_CLAIMS,
} from '@/domain/auth/auth-claims';
import { keychainSessionStorage } from '@/platform/supabase/keychain-session-storage';
import { readSupabaseConfig } from '@/platform/supabase/config';
import { classifySignUpOutcome, type SignUpResult } from '@/domain/auth/sign-up';
import { classifySignInOutcome, type SignInResult } from '@/domain/auth/sign-in';
import { validateTotpCode, type TotpCodeValidation } from '@/domain/auth/validate-totp-code';
import { validateSignUpInput } from '@/domain/auth/sign-up';

/**
 * The single seam every Supabase interaction in this app must go through
 * (requirements.md §7.2 — binding NFR). No feature module imports the
 * Supabase SDK directly; everything goes through an instance of this
 * interface. Bolt 1 (unit-01-auth) adds the first business methods:
 * `signUp`/`signInWithPassword`/`signOut`. Bolt 2 (unit-01-auth secondary
 * flows) extends with OAuth, TOTP MFA, and password/email management methods.
 *
 * Each method calls a domain classifier or pure validator internally and
 * returns the already-classified result, never a raw Supabase error, per
 * ADR-003 (domain → classifies, platform → calls SDK and hands off to
 * classifier, never the reverse).
 */

// ── Bolt 2 domain types used only by this adapter ──────────────────────────

export type OAuthProvider = 'google';

export type OAuthSignInResult =
  | { type: 'oauth-browser-opened' }
  | { type: 'error' };

export type MfaChallengeResult =
  | { type: 'verified' }
  | { type: 'invalid-code' }
  | { type: 'expired' }
  | { type: 'error' };

export type TotpEnrollmentState =
  | { phase: 'idle' }
  | { phase: 'pending-scan'; totpSecret: string; qrCodeUri: string; factorId: string }
  | { phase: 'verifying'; factorId: string; challengeId: string }
  | { phase: 'verified' }
  | { phase: 'error'; reason: string };

export type PasswordResetRequestResult =
  | { type: 'sent' }
  | { type: 'invalid-email' }
  | { type: 'error' };

export type PasswordResetExchangeResult =
  | { type: 'session-established' }
  | { type: 'invalid-token' }
  | { type: 'error' };

export type SetNewPasswordResult =
  | { type: 'password-updated' }
  | { type: 'validation-error'; reason: string }
  | { type: 'error' };

export type ChangePasswordResult =
  | { type: 'password-changed' }
  | { type: 'validation-error'; reason: string }
  | { type: 'error' };

export type ChangeEmailResult =
  | { type: 'confirmation-sent' }
  | { type: 'invalid-email'; reason: string }
  | { type: 'error' };

// ── Passkey seam (ADR-009) — interface only, no implementation ──────────────

/**
 * Domain-level abstraction over TOTP and future passkey authenticators.
 * TOTP is wired directly through `SupabaseAdapter` methods (not via this
 * interface — see ADR-009 for why). A future implementor adds a concrete
 * `PasskeyMfaProvider` class; callers that code to this interface require
 * no modification.
 */
export interface MfaProvider {
  readonly type: 'totp' | 'passkey';
  enroll(): Promise<TotpEnrollmentState>;
  challenge(): Promise<string>;
  verify(challengeId: string, code: string): Promise<MfaChallengeResult>;
}

// ── SupabaseAdapter interface ───────────────────────────────────────────────

export interface SupabaseAdapter {
  // ── Bolt 1 ──
  getSession(): Promise<AuthSession | null>;
  /** Returns an unsubscribe function. */
  onSessionChange(listener: (session: AuthSession | null) => void): () => void;
  signUp(email: string, password: string): Promise<SignUpResult>;
  signInWithPassword(email: string, password: string): Promise<SignInResult>;
  signOut(): Promise<void>;

  // ── Bolt 2: OAuth ──
  signInWithOAuth(provider: OAuthProvider): Promise<OAuthSignInResult>;
  handleOAuthCallback(url: string): Promise<void>;

  // ── Bolt 2: TOTP MFA ──
  enrollTotp(): Promise<{ totpSecret: string; qrCodeUri: string; factorId: string }>;
  verifyTotpEnrollment(factorId: string, code: string): Promise<MfaChallengeResult>;
  getMfaFactors(): Promise<{ factorId: string | null }>;
  challengeAndVerifyMfa(factorId: string, code: string): Promise<MfaChallengeResult>;

  // ── Bolt 2: Password reset ──
  requestPasswordReset(email: string): Promise<PasswordResetRequestResult>;
  exchangePasswordResetToken(tokenHash: string): Promise<PasswordResetExchangeResult>;
  setNewPassword(password: string): Promise<SetNewPasswordResult>;

  // ── Bolt 2: Authenticated user settings ──
  changePassword(currentPassword: string, newPassword: string): Promise<ChangePasswordResult>;
  changeEmail(newEmail: string): Promise<ChangeEmailResult>;
}

// ── Internal helpers ────────────────────────────────────────────────────────

/**
 * Decodes the Supabase JWT claims into our domain `AuthClaims` shape,
 * preserving the tri-state (`true | false | null`) semantics: a claim that
 * the Custom Access Token Hook hasn't stamped onto this token is `null`
 * (absent), never coerced to `false` (domain-overview.md §6).
 */
function toAuthClaims(
  rawClaims: Record<string, unknown> | null | undefined,
  aal: AuthClaims['aal'],
): AuthClaims {
  if (!rawClaims || typeof rawClaims.sub !== 'string') {
    return { ...UNAUTHENTICATED_CLAIMS, aal };
  }
  return {
    sub: rawClaims.sub,
    emailVerified: toTriState(rawClaims.email_verified),
    onboardingCompleted: toTriState(rawClaims.onboarding_completed),
    accountDeleted: toTriState(rawClaims.account_deleted),
    aal,
  };
}

function toTriState(value: unknown): AuthClaims['emailVerified'] {
  if (value === true || value === false) return value;
  return null;
}

/** Maps a validated TOTP code through the domain validator before any SDK call. */
function assertValidTotpCode(code: string): TotpCodeValidation {
  return validateTotpCode(code);
}

// ── Implementation ──────────────────────────────────────────────────────────

class SupabaseAdapterImpl implements SupabaseAdapter {
  constructor(private readonly client: SupabaseClient) {}

  // ── Bolt 1 methods ────────────────────────────────────────────────────────

  async getSession(): Promise<AuthSession | null> {
    const { data: sessionData } = await this.client.auth.getSession();
    if (!sessionData.session) return null;

    const { data: claimsData } = await this.client.auth.getClaims();
    const { data: aalData } = await this.client.auth.mfa.getAuthenticatorAssuranceLevel();

    const aal = aalData
      ? { current: aalData.currentLevel as 'aal1' | 'aal2', next: aalData.nextLevel as 'aal1' | 'aal2' }
      : null;

    return {
      claims: toAuthClaims(claimsData?.claims as Record<string, unknown> | undefined, aal),
      accessToken: sessionData.session.access_token,
      refreshToken: sessionData.session.refresh_token,
    };
  }

  onSessionChange(listener: (session: AuthSession | null) => void): () => void {
    // Sync callback only: calling `getSession()` (or any auth method that may
    // trigger `_callRefreshToken`) synchronously inside `onAuthStateChange`
    // can deadlock — the SDK's in-flight refresh only resolves after this
    // callback returns, so a nested refresh waits on itself
    // (@supabase/auth-js GoTrueClient.d.ts's documented TOKEN_REFRESHED
    // hazard). Deferring with setTimeout lets the callback return first.
    const { data } = this.client.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        listener(null);
        return;
      }
      setTimeout(() => {
        this.getSession()
          .then(p => {
            listener(p);
          })
          .catch(error => {
            // A failure restoring/decoding the session (stale token, keychain
            // issue, transient network error) must not leave the store stuck
            // on `status: 'loading'` forever — fail closed to unauthenticated
            // so AuthGatedNavigator can redirect to sign-in instead of hanging.
            listener(null);
          });
      }, 0);
    });
    return () => data.subscription.unsubscribe();
  }

  async signUp(email: string, password: string): Promise<SignUpResult> {
    const { data, error } = await this.client.auth.signUp({ email, password });
    return classifySignUpOutcome(email, {
      error: error ? { message: error.message } : null,
      hasSession: data.session !== null,
    });
  }

  async signInWithPassword(email: string, password: string): Promise<SignInResult> {
    const { error } = await this.client.auth.signInWithPassword({ email, password });
    return classifySignInOutcome(email, {
      error: error ? { code: (error as { code?: string }).code, message: error.message } : null,
    });
  }

  async signOut(): Promise<void> {
    await this.client.auth.signOut();
  }

  // ── Bolt 2: OAuth ─────────────────────────────────────────────────────────

  async signInWithOAuth(provider: OAuthProvider): Promise<OAuthSignInResult> {
    const { error } = await this.client.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: 'betmeet://auth/callback',
        skipBrowserRedirect: false,
      },
    });
    if (error) {
      return { type: 'error' };
    }
    return { type: 'oauth-browser-opened' };
  }

  async handleOAuthCallback(url: string): Promise<void> {
    await this.client.auth.exchangeCodeForSession(url);
  }

  // ── Bolt 2: TOTP MFA ──────────────────────────────────────────────────────

  async enrollTotp(): Promise<{ totpSecret: string; qrCodeUri: string; factorId: string }> {
    const { data, error } = await this.client.auth.mfa.enroll({ factorType: 'totp' });
    if (error || !data) {
      throw new Error(error?.message ?? 'TOTP enrollment failed');
    }
    return {
      totpSecret: data.totp.secret,
      qrCodeUri: data.totp.qr_code,
      factorId: data.id,
    };
  }

  async verifyTotpEnrollment(factorId: string, code: string): Promise<MfaChallengeResult> {
    const validation = assertValidTotpCode(code);
    if (!validation.valid) {
      return { type: 'invalid-code' };
    }

    const { data: challengeData, error: challengeError } = await this.client.auth.mfa.challenge({ factorId });
    if (challengeError || !challengeData) {
      return { type: 'error' };
    }

    const { error: verifyError } = await this.client.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code: validation.code,
    });

    if (verifyError) {
      const message = verifyError.message.toLowerCase();
      if (message.includes('invalid') || message.includes('incorrect')) {
        return { type: 'invalid-code' };
      }
      if (message.includes('expired')) {
        return { type: 'expired' };
      }
      return { type: 'error' };
    }

    return { type: 'verified' };
  }

  async getMfaFactors(): Promise<{ factorId: string | null }> {
    const { data, error } = await this.client.auth.mfa.listFactors();
    if (error || !data) {
      return { factorId: null };
    }
    const totpFactor = data.totp.find(f => f.status === 'verified');
    return { factorId: totpFactor?.id ?? null };
  }

  async challengeAndVerifyMfa(factorId: string, code: string): Promise<MfaChallengeResult> {
    const validation = assertValidTotpCode(code);
    if (!validation.valid) {
      return { type: 'invalid-code' };
    }

    const { data: challengeData, error: challengeError } = await this.client.auth.mfa.challenge({ factorId });
    if (challengeError || !challengeData) {
      return { type: 'error' };
    }

    const { error: verifyError } = await this.client.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code: validation.code,
    });

    if (verifyError) {
      const message = verifyError.message.toLowerCase();
      if (message.includes('invalid') || message.includes('incorrect')) {
        return { type: 'invalid-code' };
      }
      if (message.includes('expired')) {
        return { type: 'expired' };
      }
      return { type: 'error' };
    }

    return { type: 'verified' };
  }

  // ── Bolt 2: Password reset ────────────────────────────────────────────────

  async requestPasswordReset(email: string): Promise<PasswordResetRequestResult> {
    const validationError = validateSignUpInput(email, 'placeholder-password');
    if (validationError?.field === 'email') {
      return { type: 'invalid-email' };
    }

    const { error } = await this.client.auth.resetPasswordForEmail(email, {
      redirectTo: 'betmeet://auth/reset-password',
    });

    if (error) {
      return { type: 'error' };
    }
    return { type: 'sent' };
  }

  async exchangePasswordResetToken(tokenHash: string): Promise<PasswordResetExchangeResult> {
    const { error } = await this.client.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'recovery',
    });

    if (error) {
      const message = error.message.toLowerCase();
      if (message.includes('expired') || message.includes('invalid') || message.includes('used')) {
        return { type: 'invalid-token' };
      }
      return { type: 'error' };
    }

    return { type: 'session-established' };
  }

  async setNewPassword(password: string): Promise<SetNewPasswordResult> {
    const validationError = validateSignUpInput('placeholder@email.com', password);
    if (validationError?.field === 'password') {
      return { type: 'validation-error', reason: validationError.reason };
    }

    const { error } = await this.client.auth.updateUser({ password });
    if (error) {
      return { type: 'error' };
    }
    return { type: 'password-updated' };
  }

  // ── Bolt 2: Authenticated user settings ───────────────────────────────────

  async changePassword(currentPassword: string, newPassword: string): Promise<ChangePasswordResult> {
    const validationError = validateSignUpInput('placeholder@email.com', newPassword);
    if (validationError?.field === 'password') {
      return { type: 'validation-error', reason: validationError.reason };
    }

    // Re-auth: verify current password by signing in.
    // We need the current user's email for re-auth.
    const { data: sessionData } = await this.client.auth.getSession();
    const currentEmail = sessionData.session?.user.email;
    if (!currentEmail) {
      return { type: 'error' };
    }

    const { error: reAuthError } = await this.client.auth.signInWithPassword({
      email: currentEmail,
      password: currentPassword,
    });

    if (reAuthError) {
      // Deliberate: do not distinguish "wrong current password" from other
      // errors — avoids over-informing a potential account hijacker
      // (model.md §2.10).
      return { type: 'error' };
    }

    const { error: updateError } = await this.client.auth.updateUser({ password: newPassword });
    if (updateError) {
      return { type: 'error' };
    }
    return { type: 'password-changed' };
  }

  async changeEmail(newEmail: string): Promise<ChangeEmailResult> {
    const validationError = validateSignUpInput(newEmail, 'placeholder-password');
    if (validationError?.field === 'email') {
      return { type: 'invalid-email', reason: validationError.reason };
    }

    const { data: sessionData } = await this.client.auth.getSession();
    const currentEmail = sessionData.session?.user.email;
    if (newEmail === currentEmail) {
      return { type: 'error' };
    }

    const { error } = await this.client.auth.updateUser({ email: newEmail });
    if (error) {
      return { type: 'error' };
    }
    return { type: 'confirmation-sent' };
  }
}

// ── Singleton factory ────────────────────────────────────────────────────────

let cachedAdapter: SupabaseAdapter | null = null;

/**
 * Lazily creates the single `SupabaseAdapter` instance for the app. Throws a
 * clear, early error if real configuration hasn't been wired yet, rather
 * than silently constructing a client pointed at an invalid endpoint.
 */
export function getSupabaseAdapter(): SupabaseAdapter {
  if (cachedAdapter) return cachedAdapter;

  const config = readSupabaseConfig();
  if (!config) {
    throw new Error(
      '[SupabaseAdapter] Missing SUPABASE_URL/SUPABASE_ANON_KEY. ' +
        'Add a root .env file (see .env.example) with real Supabase project values.',
    );
  }

  const client = createClient(config.url, config.anonKey, {
    auth: {
      storage: keychainSessionStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  cachedAdapter = new SupabaseAdapterImpl(client);
  return cachedAdapter;
}

/**
 * Test-only: overrides the cached adapter with a mock.
 * Never call this in production code.
 */
export function _setTestAdapter(adapter: SupabaseAdapter): void {
  cachedAdapter = adapter;
}

/**
 * Test-only: resets the adapter cache so tests start fresh.
 */
export function _resetAdapterCache(): void {
  cachedAdapter = null;
}
