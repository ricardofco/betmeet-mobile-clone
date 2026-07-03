import { parseInviteTarget, isPlausibleInviteTarget } from '@/domain/pools/directed-invite-target';

describe('parseInviteTarget (model.md §2)', () => {
  it('parses an email target', () => {
    expect(parseInviteTarget('someone@example.com')).toEqual({
      kind: 'email',
      email: 'someone@example.com',
    });
  });

  it('lowercases + trims an email target', () => {
    expect(parseInviteTarget('  Someone@Example.COM  ')).toEqual({
      kind: 'email',
      email: 'someone@example.com',
    });
  });

  it('parses a nickname#NNNN target', () => {
    expect(parseInviteTarget('cool_player#1234')).toEqual({
      kind: 'nickname',
      base: 'cool_player',
      discriminator: '1234',
    });
  });

  it('trims a nickname target', () => {
    expect(parseInviteTarget('  cool_player#1234  ')).toEqual({
      kind: 'nickname',
      base: 'cool_player',
      discriminator: '1234',
    });
  });

  it('rejects a discriminator that is not exactly 4 digits', () => {
    expect(parseInviteTarget('cool_player#123')).toEqual({
      kind: 'unresolvable',
      raw: 'cool_player#123',
    });
    expect(parseInviteTarget('cool_player#12345')).toEqual({
      kind: 'unresolvable',
      raw: 'cool_player#12345',
    });
    expect(parseInviteTarget('cool_player#abcd')).toEqual({
      kind: 'unresolvable',
      raw: 'cool_player#abcd',
    });
  });

  it('rejects a bare nickname with no discriminator', () => {
    expect(parseInviteTarget('cool_player')).toEqual({
      kind: 'unresolvable',
      raw: 'cool_player',
    });
  });

  it('rejects a target with more than one #', () => {
    expect(parseInviteTarget('cool#player#1234')).toEqual({
      kind: 'unresolvable',
      raw: 'cool#player#1234',
    });
  });

  it('treats any string containing @ as an email, even if malformed', () => {
    // Format-only parser (model.md §2) — actual email validity is a
    // backend/DB-resolution concern, not this parser's job.
    expect(parseInviteTarget('not-really-an-email@')).toEqual({
      kind: 'email',
      email: 'not-really-an-email@',
    });
  });
});

describe('isPlausibleInviteTarget', () => {
  it('rejects below the 3-char minimum', () => {
    expect(isPlausibleInviteTarget('ab')).toBe(false);
  });

  it('accepts the 3-char minimum', () => {
    expect(isPlausibleInviteTarget('abc')).toBe(true);
  });

  it('accepts the 120-char maximum', () => {
    expect(isPlausibleInviteTarget('a'.repeat(120))).toBe(true);
  });

  it('rejects above the 120-char maximum', () => {
    expect(isPlausibleInviteTarget('a'.repeat(121))).toBe(false);
  });

  it('validates against the trimmed length', () => {
    expect(isPlausibleInviteTarget('  ab  ')).toBe(false);
    expect(isPlausibleInviteTarget('  abc  ')).toBe(true);
  });
});
