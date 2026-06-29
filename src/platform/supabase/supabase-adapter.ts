import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';
import {
  type AuthClaims,
  type AuthSession,
  UNAUTHENTICATED_CLAIMS,
} from '@/domain/auth/auth-claims';
import { keychainSessionStorage } from '@/platform/supabase/keychain-session-storage';
import { readSupabaseConfig } from '@/platform/supabase/config';

/**
 * The single seam every Supabase interaction in this app must go through
 * (requirements.md §7.2 — binding NFR). No feature module imports the
 * Supabase SDK directly; everything goes through an instance of this
 * interface. Auth/storage/realtime *business* methods (sign-in, MFA, avatar
 * upload, realtime channel subscriptions, etc.) are added by the bolts that
 * need them — unit-01-auth (Bolt 1) adds the first ones. Bolt 0 only fixes
 * the shape of the seam and the one capability every later bolt depends on:
 * reading and observing the current session/claims.
 */
export interface SupabaseAdapter {
  getSession(): Promise<AuthSession | null>;
  /** Returns an unsubscribe function. */
  onSessionChange(listener: (session: AuthSession | null) => void): () => void;
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
        'Bolt 0 only scaffolds this seam — wire real env-var injection in unit-01-auth before using it.',
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
