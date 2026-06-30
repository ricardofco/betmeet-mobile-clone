/**
 * Deep-link URL parsing — pure function, no SDK import, independently
 * unit-testable (ADR-005). Classifies a raw URL string into one of three
 * domain payload types defined in `model.md §2.3`.
 *
 * Accepted URL prefixes (ADR-005):
 *   betmeet://          — custom scheme (iOS CFBundleURLSchemes, Android intent-filter)
 *   https://betmeet.app — Universal/App Links (server AASA/assetlinks required, deferred)
 *
 * Domain rules:
 *   - host === 'auth' AND path starts with '/callback' → OAuthCallbackPayload
 *   - URL contains 'token_hash' query param AND 'type=recovery' → PasswordResetPayload
 *   - anything else → UnknownPayload (fail-open, never throws)
 */

export type OAuthCallbackPayload = {
  kind: 'oauth-callback';
  rawUrl: string;
};

export type PasswordResetPayload = {
  kind: 'password-reset';
  tokenHash: string;
  type: 'recovery';
};

export type UnknownPayload = {
  kind: 'unknown';
  rawUrl: string;
};

export type DeepLinkPayload = OAuthCallbackPayload | PasswordResetPayload | UnknownPayload;

/**
 * Parses a raw deep-link URL into a `DeepLinkPayload`.
 * Never throws — any parse failure yields `UnknownPayload`.
 */
export function parseDeepLink(url: string): DeepLinkPayload {
  try {
    // Normalise the custom scheme so the standard URL parser can handle it.
    // `betmeet://auth/callback` → `https://auth/callback` for parsing only.
    const normalised = url.startsWith('betmeet://')
      ? url.replace('betmeet://', 'https://')
      : url;

    const parsed = new URL(normalised);
    const { host, pathname, searchParams } = parsed;

    // OAuth callback: host is 'auth', path starts with '/callback'
    if (host === 'auth' && pathname.startsWith('/callback')) {
      return { kind: 'oauth-callback', rawUrl: url };
    }

    // Password reset: token_hash + type=recovery in query params
    const tokenHash = searchParams.get('token_hash');
    const type = searchParams.get('type');
    if (tokenHash && type === 'recovery') {
      return { kind: 'password-reset', tokenHash, type: 'recovery' };
    }

    // Universal-Link form: https://betmeet.app/auth/callback
    if (host === 'betmeet.app' && pathname.startsWith('/auth/callback')) {
      return { kind: 'oauth-callback', rawUrl: url };
    }

    return { kind: 'unknown', rawUrl: url };
  } catch {
    return { kind: 'unknown', rawUrl: url };
  }
}
