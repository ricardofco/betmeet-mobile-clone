import { isValidTransferTarget, transferCandidates, type MemberForTransfer } from '@/domain/pools/ownership-transfer';

const members: MemberForTransfer[] = [
  { userId: 'owner-1', isOwner: true },
  { userId: 'member-1', isOwner: false },
  { userId: 'member-2', isOwner: false },
];

describe('isValidTransferTarget (model.md §3)', () => {
  it('accepts a current, non-owner member', () => {
    expect(isValidTransferTarget('member-1', 'owner-1', members)).toBe(true);
  });

  it('rejects the current owner as a target', () => {
    expect(isValidTransferTarget('owner-1', 'owner-1', members)).toBe(false);
  });

  it('rejects a userId that is not a member at all', () => {
    expect(isValidTransferTarget('stranger', 'owner-1', members)).toBe(false);
  });
});

describe('transferCandidates', () => {
  it('excludes the owner and lists every other member', () => {
    expect(transferCandidates(members)).toEqual([
      { userId: 'member-1', isOwner: false },
      { userId: 'member-2', isOwner: false },
    ]);
  });

  it('returns an empty array when the owner is the only member', () => {
    expect(transferCandidates([{ userId: 'owner-1', isOwner: true }])).toEqual([]);
  });
});
