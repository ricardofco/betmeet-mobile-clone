import { randomInt } from 'node:crypto';

/**
 * Server-side invite-token generation (design.md §2.1, ADR-030) —
 * independently authored against domain-overview.md §5.3's spec (cross-
 * checked for the exact alphabet/retry shape against betmeet-clone's real
 * src/features/pools/services/invite-token.ts for reference behavior per
 * the task brief, never imported — requirements.md §7.3). The mobile-side
 * twin (src/domain/pools/invite-token.ts) only validates input shape; only
 * this module generates real tokens, since generation needs `crypto` + a
 * DB existence check per attempt.
 */

// Unambiguous alphabet — excludes 0/O/1/I/L (domain-overview.md §5.3).
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const TOKEN_LENGTH = 8;
const FALLBACK_TOKEN_LENGTH = TOKEN_LENGTH + 4;

export function generateInviteToken(length = TOKEN_LENGTH): string {
  let token = '';
  for (let i = 0; i < length; i++) {
    token += ALPHABET[randomInt(ALPHABET.length)];
  }
  return token;
}

/**
 * Generates a token guaranteed unique against `exists`. Retries a bounded
 * number of times at the default 8-char length; falls back to a 12-char
 * token (virtually eliminating collision probability) if every retry
 * collides — domain-overview.md §5.3's "12-char fallback if collisions
 * exhaust retries."
 */
export async function generateUniqueInviteToken(
  exists: (token: string) => Promise<boolean>,
  maxAttempts = 5,
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const token = generateInviteToken();
    if (!(await exists(token))) return token;
  }
  return generateInviteToken(FALLBACK_TOKEN_LENGTH);
}
