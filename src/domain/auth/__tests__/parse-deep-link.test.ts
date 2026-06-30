import { parseDeepLink } from '@/domain/auth/parse-deep-link';

describe('parseDeepLink', () => {
  // ── OAuth callback — custom scheme ────────────────────────────────────────
  describe('OAuth callback (custom scheme betmeet://)', () => {
    it('returns oauth-callback for betmeet://auth/callback', () => {
      const result = parseDeepLink('betmeet://auth/callback');
      expect(result.kind).toBe('oauth-callback');
      if (result.kind === 'oauth-callback') {
        expect(result.rawUrl).toBe('betmeet://auth/callback');
      }
    });

    it('returns oauth-callback for betmeet://auth/callback with query params', () => {
      const result = parseDeepLink('betmeet://auth/callback?code=abc123&state=xyz');
      expect(result.kind).toBe('oauth-callback');
    });

    it('preserves the original raw URL in the payload', () => {
      const url = 'betmeet://auth/callback?code=abc&state=def';
      const result = parseDeepLink(url);
      if (result.kind === 'oauth-callback') {
        expect(result.rawUrl).toBe(url);
      }
    });
  });

  // ── OAuth callback — Universal Link ───────────────────────────────────────
  describe('OAuth callback (Universal Link https://betmeet.app/)', () => {
    it('returns oauth-callback for https://betmeet.app/auth/callback', () => {
      const result = parseDeepLink('https://betmeet.app/auth/callback');
      expect(result.kind).toBe('oauth-callback');
    });

    it('returns oauth-callback for https://betmeet.app/auth/callback with params', () => {
      const result = parseDeepLink('https://betmeet.app/auth/callback?code=abc');
      expect(result.kind).toBe('oauth-callback');
    });

    it('preserves the full Universal Link URL as rawUrl', () => {
      const url = 'https://betmeet.app/auth/callback?code=abc';
      const result = parseDeepLink(url);
      if (result.kind === 'oauth-callback') {
        expect(result.rawUrl).toBe(url);
      }
    });
  });

  // ── Password reset ────────────────────────────────────────────────────────
  describe('password reset', () => {
    it('returns password-reset for betmeet://auth/reset-password with token_hash and type=recovery', () => {
      const url = 'betmeet://auth/reset-password?token_hash=abc123&type=recovery';
      const result = parseDeepLink(url);
      expect(result.kind).toBe('password-reset');
      if (result.kind === 'password-reset') {
        expect(result.tokenHash).toBe('abc123');
        expect(result.type).toBe('recovery');
      }
    });

    it('returns password-reset for a token_hash+recovery URL regardless of path', () => {
      const url = 'betmeet://auth/whatever?token_hash=XYZ&type=recovery';
      const result = parseDeepLink(url);
      expect(result.kind).toBe('password-reset');
    });

    it('extracts the exact token_hash value', () => {
      const tokenHash = 'some-very-long-token-hash-value-12345';
      const url = `betmeet://auth/reset-password?token_hash=${tokenHash}&type=recovery`;
      const result = parseDeepLink(url);
      if (result.kind === 'password-reset') {
        expect(result.tokenHash).toBe(tokenHash);
      }
    });

    it('does NOT return password-reset if type is not recovery', () => {
      const url = 'betmeet://auth/reset-password?token_hash=abc123&type=signup';
      const result = parseDeepLink(url);
      expect(result.kind).toBe('unknown');
    });

    it('does NOT return password-reset if token_hash is missing', () => {
      const url = 'betmeet://auth/reset-password?type=recovery';
      const result = parseDeepLink(url);
      expect(result.kind).toBe('unknown');
    });
  });

  // ── Unknown URLs ──────────────────────────────────────────────────────────
  describe('unknown URLs', () => {
    it('returns unknown for an unrecognised betmeet:// path', () => {
      const result = parseDeepLink('betmeet://some/other/path');
      expect(result.kind).toBe('unknown');
    });

    it('returns unknown for an unrecognised https URL', () => {
      const result = parseDeepLink('https://example.com/some/path');
      expect(result.kind).toBe('unknown');
    });

    it('returns unknown for an empty string', () => {
      const result = parseDeepLink('');
      expect(result.kind).toBe('unknown');
    });

    it('preserves the rawUrl in UnknownPayload', () => {
      const url = 'betmeet://unknown/path';
      const result = parseDeepLink(url);
      if (result.kind === 'unknown') {
        expect(result.rawUrl).toBe(url);
      }
    });
  });

  // ── Malformed URLs ────────────────────────────────────────────────────────
  describe('malformed URLs', () => {
    it('returns unknown (does not throw) for a completely invalid URL', () => {
      expect(() => parseDeepLink('not-a-url-at-all')).not.toThrow();
      const result = parseDeepLink('not-a-url-at-all');
      expect(result.kind).toBe('unknown');
    });

    it('returns unknown (does not throw) for null-like edge case strings', () => {
      expect(() => parseDeepLink('://missing-scheme')).not.toThrow();
    });

    it('returns unknown for betmeet:// with no path', () => {
      const result = parseDeepLink('betmeet://');
      expect(result.kind).toBe('unknown');
    });
  });
});
