import { assignDensePositions } from '@/domain/rankings/dense-ranking';

type Row = { id: string; nickname: string | null; points: number };

function row(id: string, points: number, nickname: string | null = id): Row {
  return { id, nickname, points };
}

const byNickname = (a: Row, b: Row) => (a.nickname ?? '').localeCompare(b.nickname ?? '');

describe('assignDensePositions (model.md §5 — "1, 1, 2", never "1, 1, 3")', () => {
  it('the "1,1,2" case: two tied leaders share position 1, the next distinct group is position 2 (not 3)', () => {
    const rows = [row('a', 10), row('b', 10), row('c', 5)];
    const result = assignDensePositions(rows, r => r.points, byNickname);

    const byId = new Map(result.map(r => [r.id, r]));
    expect(byId.get('a')?.position).toBe(1);
    expect(byId.get('b')?.position).toBe(1);
    expect(byId.get('a')?.isTied).toBe(true);
    expect(byId.get('b')?.isTied).toBe(true);
    expect(byId.get('c')?.position).toBe(2); // NOT 3
    expect(byId.get('c')?.isTied).toBe(false);
  });

  it('a "no ties" case: every distinct points value gets a strictly sequential position', () => {
    const rows = [row('a', 30), row('b', 20), row('c', 10)];
    const result = assignDensePositions(rows, r => r.points, byNickname);

    const byId = new Map(result.map(r => [r.id, r]));
    expect(byId.get('a')?.position).toBe(1);
    expect(byId.get('b')?.position).toBe(2);
    expect(byId.get('c')?.position).toBe(3);
    expect(result.every(r => !r.isTied)).toBe(true);
  });

  it('an all-tied case: every row shares position 1 and is marked tied', () => {
    const rows = [row('a', 7), row('b', 7), row('c', 7), row('d', 7)];
    const result = assignDensePositions(rows, r => r.points, byNickname);

    expect(result.every(r => r.position === 1)).toBe(true);
    expect(result.every(r => r.isTied)).toBe(true);
  });

  it('breaks ties using the supplied tie-break comparator (nickname-ascending), not source order', () => {
    // Deliberately supplied out of alphabetical order.
    const rows = [row('z-row', 5, 'zeta'), row('a-row', 5, 'alpha'), row('m-row', 5, 'mike')];
    const result = assignDensePositions(rows, r => r.points, byNickname);

    // Same points => same position, but the SORTED ORDER within the tied
    // group must follow the tie-break comparator.
    expect(result.map(r => r.nickname)).toEqual(['alpha', 'mike', 'zeta']);
    expect(result.every(r => r.position === 1 && r.isTied)).toBe(true);
  });
});
