import {
  isPlausibleInviteToken,
  normalizeInviteToken,
  INVITE_TOKEN_ALPHABET,
  MIN_INVITE_TOKEN_LENGTH,
  MAX_INVITE_TOKEN_LENGTH,
} from '@/domain/pools/invite-token';

describe('normalizeInviteToken', () => {
  it('trims and uppercases', () => {
    expect(normalizeInviteToken('  ab3xk9m2  ')).toBe('AB3XK9M2');
  });

  it('is a no-op for an already-normalized token', () => {
    expect(normalizeInviteToken('AB3XK9M2')).toBe('AB3XK9M2');
  });
});

describe('isPlausibleInviteToken (model.md §4, domain-overview.md §5.3)', () => {
  it('accepts a well-formed 8-char token (the default length)', () => {
    expect(isPlausibleInviteToken('AB3XK9M2')).toBe(true);
  });

  it('accepts a well-formed 12-char token (the collision-fallback length)', () => {
    expect(isPlausibleInviteToken('AB3XK9M2QRTV')).toBe(true);
  });

  it('accepts the minimum boundary (6 chars)', () => {
    expect(isPlausibleInviteToken('AB3XK9')).toBe(true);
  });

  it(`MIN_INVITE_TOKEN_LENGTH is ${MIN_INVITE_TOKEN_LENGTH} and MAX is ${MAX_INVITE_TOKEN_LENGTH}`, () => {
    expect(MIN_INVITE_TOKEN_LENGTH).toBe(6);
    expect(MAX_INVITE_TOKEN_LENGTH).toBe(12);
  });

  it('rejects below the minimum (5 chars)', () => {
    expect(isPlausibleInviteToken('AB3XK')).toBe(false);
  });

  it('rejects above the maximum (13 chars)', () => {
    expect(isPlausibleInviteToken('AB3XK9M2QRTVW')).toBe(false);
  });

  it('accepts lowercase input (normalized before shape check)', () => {
    expect(isPlausibleInviteToken('ab3xk9m2')).toBe(true);
  });

  it('accepts input with surrounding whitespace (a pasted link fragment)', () => {
    expect(isPlausibleInviteToken('  AB3XK9M2  ')).toBe(true);
  });

  it.each(['0', 'O', '1', 'I', 'L'])('rejects the ambiguous excluded character "%s"', char => {
    expect(isPlausibleInviteToken(`AB3XK${char}`)).toBe(false);
  });

  it('rejects a token containing a symbol', () => {
    expect(isPlausibleInviteToken('AB3XK9-2')).toBe(false);
  });

  it('every character in INVITE_TOKEN_ALPHABET individually passes the shape check when padded to length', () => {
    for (const char of INVITE_TOKEN_ALPHABET) {
      expect(isPlausibleInviteToken(char.repeat(6))).toBe(true);
    }
  });

  it('INVITE_TOKEN_ALPHABET excludes 0/O/1/I/L', () => {
    for (const excluded of ['0', 'O', '1', 'I', 'L']) {
      expect(INVITE_TOKEN_ALPHABET.includes(excluded)).toBe(false);
    }
  });
});
