import { compareByNicknameAscending } from '@/domain/rankings/nickname-tie-break';

describe('compareByNicknameAscending (ADR-049 — the one unified tie-break)', () => {
  it('sorts nicknames alphabetically ascending', () => {
    const rows = [{ nickname: 'zeta#01' }, { nickname: 'alpha#01' }, { nickname: 'mike#01' }];
    const sorted = [...rows].sort(compareByNicknameAscending);
    expect(sorted.map(r => r.nickname)).toEqual(['alpha#01', 'mike#01', 'zeta#01']);
  });

  it('treats a null nickname as an empty string (sorts before any real nickname)', () => {
    const rows = [{ nickname: 'alpha#01' }, { nickname: null }];
    const sorted = [...rows].sort(compareByNicknameAscending);
    expect(sorted.map(r => r.nickname)).toEqual([null, 'alpha#01']);
  });

  it('returns 0 for identical nicknames', () => {
    expect(compareByNicknameAscending({ nickname: 'same#01' }, { nickname: 'same#01' })).toBe(0);
  });
});
