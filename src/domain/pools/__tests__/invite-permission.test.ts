import { canInvite } from '@/domain/pools/invite-permission';
import type { PoolForInvitePermission } from '@/domain/pools/invite-permission';

function makePool(overrides: Partial<PoolForInvitePermission> = {}): PoolForInvitePermission {
  return { type: 'PRIVATE', membersCanInvite: true, ...overrides };
}

describe('canInvite (model.md §5, domain-overview.md §5.3)', () => {
  it('the owner can always invite, regardless of visibility or the toggle', () => {
    expect(canInvite(makePool({ type: 'PRIVATE', membersCanInvite: false }), true)).toBe(true);
    expect(canInvite(makePool({ type: 'PUBLIC', membersCanInvite: false }), true)).toBe(true);
  });

  it('any member of a PUBLIC pool can invite (no toggle)', () => {
    expect(canInvite(makePool({ type: 'PUBLIC', membersCanInvite: false }), false)).toBe(true);
    expect(canInvite(makePool({ type: 'PUBLIC', membersCanInvite: true }), false)).toBe(true);
  });

  it('a member of a PRIVATE pool can invite only when membersCanInvite is true', () => {
    expect(canInvite(makePool({ type: 'PRIVATE', membersCanInvite: true }), false)).toBe(true);
    expect(canInvite(makePool({ type: 'PRIVATE', membersCanInvite: false }), false)).toBe(false);
  });
});
