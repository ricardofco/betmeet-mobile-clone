import { isVisibilityChangeNoOp, requiresNameUniquenessCheck } from '@/domain/pools/pool-visibility';

describe('isVisibilityChangeNoOp (model.md §7, BR-65.4 — idempotent)', () => {
  it('is a no-op when the target matches the current type (PUBLIC)', () => {
    expect(isVisibilityChangeNoOp('PUBLIC', 'PUBLIC')).toBe(true);
  });

  it('is a no-op when the target matches the current type (PRIVATE)', () => {
    expect(isVisibilityChangeNoOp('PRIVATE', 'PRIVATE')).toBe(true);
  });

  it('is not a no-op when switching PUBLIC to PRIVATE', () => {
    expect(isVisibilityChangeNoOp('PUBLIC', 'PRIVATE')).toBe(false);
  });

  it('is not a no-op when switching PRIVATE to PUBLIC', () => {
    expect(isVisibilityChangeNoOp('PRIVATE', 'PUBLIC')).toBe(false);
  });
});

describe('requiresNameUniquenessCheck (model.md §7 — only PRIVATE→PUBLIC needs it)', () => {
  it('requires the check when the target is PUBLIC', () => {
    expect(requiresNameUniquenessCheck('PUBLIC')).toBe(true);
  });

  it('does not require the check when the target is PRIVATE', () => {
    expect(requiresNameUniquenessCheck('PRIVATE')).toBe(false);
  });
});
