import {
  allOwnersAssigned,
  poolsNeedingAssignment,
  poolsToBeDeleted,
  isConfirmPhraseValid,
  DELETE_ACCOUNT_CONFIRM_PHRASE,
  type OwnedPoolTransfer,
} from '@/domain/auth/account-deletion';

const owned: OwnedPoolTransfer[] = [
  { poolId: 'pool-with-candidates', poolName: 'A', candidates: [{ userId: 'u1', nickname: 'u1#1111' }] },
  { poolId: 'pool-no-candidates', poolName: 'B', candidates: [] },
];

describe('poolsNeedingAssignment / poolsToBeDeleted (model.md §4)', () => {
  it('splits owned pools by whether they have transfer candidates', () => {
    expect(poolsNeedingAssignment(owned)).toEqual([owned[0]]);
    expect(poolsToBeDeleted(owned)).toEqual([owned[1]]);
  });
});

describe('allOwnersAssigned', () => {
  it('is false when a pool needing an assignment has none', () => {
    expect(allOwnersAssigned(owned, [])).toBe(false);
  });

  it('is true when every pool needing an assignment has a valid one (pools with no candidates need none)', () => {
    expect(allOwnersAssigned(owned, [{ poolId: 'pool-with-candidates', newOwnerId: 'u1' }])).toBe(true);
  });

  it('is false when the assignment targets a userId that is not actually a candidate', () => {
    expect(allOwnersAssigned(owned, [{ poolId: 'pool-with-candidates', newOwnerId: 'not-a-candidate' }])).toBe(
      false,
    );
  });

  it('is true for an empty owned-pools list regardless of assignments', () => {
    expect(allOwnersAssigned([], [])).toBe(true);
  });
});

describe('isConfirmPhraseValid / DELETE_ACCOUNT_CONFIRM_PHRASE', () => {
  it('requires an exact match', () => {
    expect(isConfirmPhraseValid(DELETE_ACCOUNT_CONFIRM_PHRASE)).toBe(true);
    expect(isConfirmPhraseValid('Delete my account')).toBe(false);
    expect(isConfirmPhraseValid('delete my account ')).toBe(false);
    expect(isConfirmPhraseValid('')).toBe(false);
  });
});
