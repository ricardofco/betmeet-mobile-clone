import {
  isAuthenticated,
  isExplicitlyFalse,
  isExplicitlyTrue,
  UNAUTHENTICATED_CLAIMS,
  type AuthClaims,
} from '@/domain/auth/auth-claims';

describe('isAuthenticated', () => {
  it('is false when sub is null (unauthenticated)', () => {
    expect(isAuthenticated(UNAUTHENTICATED_CLAIMS)).toBe(false);
  });

  it('is true when sub is a string', () => {
    const claims: AuthClaims = { ...UNAUTHENTICATED_CLAIMS, sub: 'user-123' };
    expect(isAuthenticated(claims)).toBe(true);
  });
});

describe('tri-state claim helpers (domain-overview.md §6 — fail-open on absence)', () => {
  it('isExplicitlyTrue is true only for true, never for null or false', () => {
    expect(isExplicitlyTrue(true)).toBe(true);
    expect(isExplicitlyTrue(false)).toBe(false);
    expect(isExplicitlyTrue(null)).toBe(false);
  });

  it('isExplicitlyFalse is true only for false, never for null or true', () => {
    expect(isExplicitlyFalse(false)).toBe(true);
    expect(isExplicitlyFalse(true)).toBe(false);
    expect(isExplicitlyFalse(null)).toBe(false);
  });

  it('a missing claim (null) is neither explicitly true nor explicitly false — the fail-open case', () => {
    const absentClaim = null;
    expect(isExplicitlyTrue(absentClaim)).toBe(false);
    expect(isExplicitlyFalse(absentClaim)).toBe(false);
  });
});
