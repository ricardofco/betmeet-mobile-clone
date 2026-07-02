import { validatePoolName, normalizePoolName, MIN_POOL_NAME_LENGTH, MAX_POOL_NAME_LENGTH } from '@/domain/pools/pool-name';

describe('validatePoolName (model.md §3, domain-overview.md §5.3)', () => {
  it('accepts a 3-char name (minimum boundary)', () => {
    expect(validatePoolName('abc')).toBe(true);
  });

  it('accepts a 60-char name (maximum boundary)', () => {
    expect(validatePoolName('a'.repeat(MAX_POOL_NAME_LENGTH))).toBe(true);
  });

  it('rejects a 2-char name', () => {
    expect(validatePoolName('ab')).toBe(false);
  });

  it('rejects a 61-char name', () => {
    expect(validatePoolName('a'.repeat(MAX_POOL_NAME_LENGTH + 1))).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(validatePoolName('')).toBe(false);
  });

  it('validates against the trimmed length, not the raw length', () => {
    // '  ab  ' trims to 'ab' (2 chars) — should fail even though the raw string is 6 chars.
    expect(validatePoolName('  ab  ')).toBe(false);
    // '  abc  ' trims to 'abc' (3 chars) — should pass.
    expect(validatePoolName('  abc  ')).toBe(true);
  });

  it('rejects a name that is only whitespace', () => {
    expect(validatePoolName('     ')).toBe(false);
  });

  it(`MIN_POOL_NAME_LENGTH is 3`, () => {
    expect(MIN_POOL_NAME_LENGTH).toBe(3);
  });
});

describe('normalizePoolName', () => {
  it('trims leading/trailing whitespace', () => {
    expect(normalizePoolName('  My League  ')).toBe('My League');
  });

  it('preserves internal whitespace', () => {
    expect(normalizePoolName('  My   League  ')).toBe('My   League');
  });
});
