/**
 * `requireAdmin()` (ADR-059's authoritative gate) — the ONE place
 * `verificationStatus === 'ADMIN'` can ever be checked from. Prisma is
 * mocked here (this backend's own established convention keeps its Jest
 * suite to pure functions only — see `jest.config.js`'s header comment —
 * but `requireAdmin` is a single, narrow `findUnique` call, worth mocking
 * directly rather than deferring every one of its three branches to the
 * real-DB curl runbook). The real-DB pass (`implement-and-test.md`) proves
 * this for a genuine ADMIN and a genuine non-admin caller for real, on top
 * of these three unit-level branches.
 */
const findUnique = jest.fn();

jest.mock('../../../db', () => ({
  prisma: {
    profile: {
      findUnique: (...args: unknown[]) => findUnique(...args),
    },
  },
}));

import { requireAdmin } from '../require-admin';

describe('requireAdmin', () => {
  beforeEach(() => {
    findUnique.mockReset();
  });

  it('returns true when the profile has verificationStatus ADMIN', async () => {
    findUnique.mockResolvedValue({ verificationStatus: 'ADMIN' });
    await expect(requireAdmin('user-1')).resolves.toBe(true);
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { verificationStatus: true },
    });
  });

  it.each(['UNVERIFIED', 'VERIFIED', 'BANNED'])(
    'returns false for every non-ADMIN verificationStatus (%s)',
    async status => {
      findUnique.mockResolvedValue({ verificationStatus: status });
      await expect(requireAdmin('user-1')).resolves.toBe(false);
    },
  );

  it('returns false when no profile row exists at all', async () => {
    findUnique.mockResolvedValue(null);
    await expect(requireAdmin('user-1')).resolves.toBe(false);
  });
});
