/**
 * Pools' core data shapes (model.md §8). `PoolDTO`'s backend response shape
 * (design.md §2) mirrors `Pool` field-for-field so the mobile-side mapping
 * is a type-level identity, not a transform.
 */

export type PoolVisibility = 'PUBLIC' | 'PRIVATE';

export type Pool = {
  id: string;
  name: string;
  type: PoolVisibility;
  capacity: number;
  memberCount: number;
  /**
   * Only ever populated for pools the viewer is a member of (design.md
   * §2's `PoolDTO` note) — `null` for public-directory rows the viewer
   * hasn't joined.
   */
  inviteToken: string | null;
  ownerId: string;
  membersCanInvite: boolean;
  createdAt: string;
};

export type PoolMembership = {
  poolId: string;
  userId: string;
  joinedAt: string;
  /** This member's personal archive state (POOLS-5) — cosmetic only. */
  archivedAt: string | null;
};

export type PoolMember = {
  userId: string;
  /** `null` if the member hasn't completed nickname assignment yet — same nullability as ProfileSnapshot.nickname. */
  nickname: string | null;
  isOwner: boolean;
  joinedAt: string;
};

export type PoolSummary = Pool & { viewerMembership: PoolMembership | null };

/**
 * Bolt 8 — the lean shape `pools.getMyPoolsForPicker` returns for the
 * predictions screen's pool-override picker (design.md §1.3/§3): a name
 * a user can recognize, nothing else. Deliberately not `PoolSummary`/
 * `Pool` — the picker never needs capacity/inviteToken/ownerId/etc.
 */
export type PoolPickerEntry = { id: string; name: string };
