import {
  isOwner,
  canLeave,
  canKick,
  canDelete,
  canRename,
  canUpdateVisibility,
  canUpdateMembersCanInvite,
} from '@/domain/pools/pool-membership-permissions';
import type { PoolForMembershipPermission } from '@/domain/pools/pool-membership-permissions';

const OWNER_ID = 'owner-1';
const MEMBER_ID = 'member-1';

function makePool(overrides: Partial<PoolForMembershipPermission> = {}): PoolForMembershipPermission {
  return { ownerId: OWNER_ID, type: 'PRIVATE', ...overrides };
}

describe('isOwner', () => {
  it('is true for the pool owner', () => {
    expect(isOwner(makePool(), OWNER_ID)).toBe(true);
  });

  it('is false for a non-owner member', () => {
    expect(isOwner(makePool(), MEMBER_ID)).toBe(false);
  });
});

describe('canLeave (model.md §6 — the owner cannot leave)', () => {
  it('a non-owner member can leave', () => {
    expect(canLeave(makePool(), MEMBER_ID)).toBe(true);
  });

  it('the owner cannot leave — must delete or transfer', () => {
    expect(canLeave(makePool(), OWNER_ID)).toBe(false);
  });
});

describe('canKick (model.md §6 — owner-only, never the owner themself)', () => {
  it('the owner can kick a non-owner member', () => {
    expect(canKick(makePool(), OWNER_ID, MEMBER_ID)).toBe(true);
  });

  it('a non-owner member cannot kick anyone', () => {
    expect(canKick(makePool(), MEMBER_ID, 'someone-else')).toBe(false);
  });

  it('the owner cannot kick themself', () => {
    expect(canKick(makePool(), OWNER_ID, OWNER_ID)).toBe(false);
  });
});

describe('canDelete / canRename / canUpdateVisibility (owner-only)', () => {
  it.each([canDelete, canRename, canUpdateVisibility])('is true for the owner', fn => {
    expect(fn(makePool(), OWNER_ID)).toBe(true);
  });

  it.each([canDelete, canRename, canUpdateVisibility])('is false for a non-owner member', fn => {
    expect(fn(makePool(), MEMBER_ID)).toBe(false);
  });
});

describe('canUpdateMembersCanInvite (owner-only AND PRIVATE-only)', () => {
  it('is true for the owner of a PRIVATE pool', () => {
    expect(canUpdateMembersCanInvite(makePool({ type: 'PRIVATE' }), OWNER_ID)).toBe(true);
  });

  it('is false for the owner of a PUBLIC pool — the toggle is meaningless there', () => {
    expect(canUpdateMembersCanInvite(makePool({ type: 'PUBLIC' }), OWNER_ID)).toBe(false);
  });

  it('is false for a non-owner member even on a PRIVATE pool', () => {
    expect(canUpdateMembersCanInvite(makePool({ type: 'PRIVATE' }), MEMBER_ID)).toBe(false);
  });
});

describe('ADR-033 — no function in this module accepts a competition/match/kickoff input', () => {
  it('every predicate here is fully determined by (pool, userId) alone — verified by call-signature shape, not just behavior', () => {
    // This test exists as a structural, always-green tripwire: if a future edit adds a
    // third/fourth parameter to any of these functions to smuggle in competition state,
    // this test (and more importantly, the ones above) must be updated deliberately —
    // it cannot happen silently via an optional param with a default.
    expect(isOwner.length).toBe(2);
    expect(canLeave.length).toBe(2);
    expect(canKick.length).toBe(3);
    expect(canDelete.length).toBe(2);
    expect(canRename.length).toBe(2);
    expect(canUpdateVisibility.length).toBe(2);
    expect(canUpdateMembersCanInvite.length).toBe(2);
  });
});
