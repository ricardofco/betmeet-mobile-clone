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

/**
 * The single seam every Supabase interaction in this app must go through
 * (requirements.md §7.2 — binding NFR). No feature module imports the
 * Supabase SDK directly; everything goes through an instance of this
 * interface. Bolt 1 (unit-01-auth) adds the first business methods:
 * `signUp`/`signInWithPassword`/`signOut` — each calls a domain classifier
 * (`@/domain/auth/sign-up`, `@/domain/auth/sign-in`) internally and returns
 * the already-classified `SignUpResult`/`SignInResult`, never a raw Supabase
 * error, per ADR-003 (domain → classifies, platform → calls the SDK and
 * hands off to the classifier, never the reverse).
 *
 * Resend-confirmation's cooldown is **not** a method here — it is enforced
 * server-side via `BackendApiClient`'s `auth.resendConfirmation` capability
 * (ADR-003); this adapter stays strictly Supabase-only (system-context.md §2).
 */
export interface SupabaseAdapter {
  getSession(): Promise<AuthSession | null>;
  /** Returns an unsubscribe function. */
  onSessionChange(listener: (session: AuthSession | null) => void): () => void;

  signUp(email: string, password: string): Promise<SignUpResult>;
  signInWithPassword(email: string, password: string): Promise<SignInResult>;
  signOut(): Promise<void>;
}

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
  return null; // absent or any other shape -> fail-open per domain-overview.md §6
}

class SupabaseAdapterImpl implements SupabaseAdapter {
  constructor(private readonly client: SupabaseClient) {}

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
    const { data } = this.client.auth.onAuthStateChange(async () => {
      listener(await this.getSession());
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
}

let cachedAdapter: SupabaseAdapter | null = null;

/**
 * Lazily creates the single `SupabaseAdapter` instance for the app. Throws a
 * clear, early error if real configuration hasn't been wired yet, rather
 * than silently constructing a client pointed at an invalid endpoint — see
 * the TODO in `config.ts`. unit-01-auth's bolt is expected to resolve this
 * before any real sign-in flow ships.
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
