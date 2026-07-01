import type { NextFunction, Request, Response } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { env } from '../env';

/**
 * Verifies the Supabase-issued session JWT locally via the project's JWKS —
 * same "no round-trip to GoTrue" pattern betmeet-clone's own `getClaims()`
 * uses (src/lib/supabase/current-user.ts), just reimplemented here since this
 * is a plain Express server, not a Supabase client SDK context.
 *
 * Attaches `req.auth` with the user id (`sub`) and the three custom claims
 * mobile's supabase-adapter.ts already reads (email_verified,
 * onboarding_completed, account_deleted) — ADR-027's hook must be installed
 * on this project for those to be present; absence is treated as `false`,
 * mirroring proxy.ts's fail-open-on-missing-claim reasoning being inapplicable
 * here (the backend is the authoritative check, so it fails closed instead —
 * see each handler's own gating).
 */
const JWKS = createRemoteJWKSet(new URL(`${env.supabaseUrl}/auth/v1/.well-known/jwks.json`));

export type AuthedRequest = Request & {
  auth: {
    userId: string;
    emailVerified: boolean;
    onboardingCompleted: boolean;
    accountDeleted: boolean;
  };
};

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
  if (!token) {
    res.status(401).json({ error: 'Missing bearer token' });
    return;
  }

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `${env.supabaseUrl}/auth/v1`,
      audience: 'authenticated',
    });
    const sub = payload.sub;
    if (!sub) {
      res.status(401).json({ error: 'Token missing subject' });
      return;
    }

    (req as AuthedRequest).auth = {
      userId: sub,
      emailVerified: payload.email_verified === true,
      onboardingCompleted: payload.onboarding_completed === true,
      accountDeleted: payload.account_deleted === true,
    };

    if ((req as AuthedRequest).auth.accountDeleted) {
      res.status(403).json({ error: 'Account deleted' });
      return;
    }

    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
