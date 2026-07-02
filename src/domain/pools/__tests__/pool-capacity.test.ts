import { validatePoolCapacity, hasCapacityFor, MIN_POOL_CAPACITY, MAX_POOL_CAPACITY } from '@/domain/pools/pool-capacity';

describe('validatePoolCapacity (model.md §2, domain-overview.md §5.3)', () => {
  it('accepts the minimum boundary (2)', () => {
    expect(validatePoolCapacity(MIN_POOL_CAPACITY)).toBe(true);
  });

  it('accepts the maximum boundary (100)', () => {
    expect(validatePoolCapacity(MAX_POOL_CAPACITY)).toBe(true);
  });

  it('accepts a mid-range value', () => {
    expect(validatePoolCapacity(50)).toBe(true);
  });

  it('rejects below the minimum (1)', () => {
    expect(validatePoolCapacity(1)).toBe(false);
  });

  it('rejects 0', () => {
    expect(validatePoolCapacity(0)).toBe(false);
  });

  it('rejects negative values', () => {
    expect(validatePoolCapacity(-5)).toBe(false);
  });

  it('rejects above the maximum (101)', () => {
    expect(validatePoolCapacity(101)).toBe(false);
  });

  it('rejects non-integer values', () => {
    expect(validatePoolCapacity(2.5)).toBe(false);
  });

  it('rejects NaN', () => {
    expect(validatePoolCapacity(NaN)).toBe(false);
  });
});

describe('hasCapacityFor (advisory only — real guard is the backend transaction, ADR-035)', () => {
  it('has room when memberCount is below capacity', () => {
    expect(hasCapacityFor(1, 2)).toBe(true);
  });

  it('is full when memberCount equals capacity', () => {
    expect(hasCapacityFor(2, 2)).toBe(false);
  });

  it('is full when memberCount exceeds capacity (defensive — should not normally happen)', () => {
    expect(hasCapacityFor(3, 2)).toBe(false);
  });

  it('has room at the maximum capacity boundary with one seat left', () => {
    expect(hasCapacityFor(99, 100)).toBe(true);
  });
});
