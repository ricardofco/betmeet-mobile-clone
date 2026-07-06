/**
 * Bolt 10 (Test stage) — this backend's FIRST Jest configuration. Every
 * prior bolt's backend work (Bolt 7/8) was verified exclusively via real
 * curl + live-DB checks (ADR-030's precedent), with zero unit tests, since
 * almost every backend function directly touches `prisma`. This bolt is the
 * first to introduce backend unit tests, deliberately scoped to PURE
 * functions only (no `prisma`/network mocking harness is built) — see
 * `memory-bank/bolts/bolt-10-scoring-rankings/implement-and-test.md` for
 * which functions are covered here vs. verified for real against the live
 * Supabase DB instead (`score-match.ts`'s idempotency, `score-sweeper.ts`'s
 * targeting, and the `joinedAt` exclusion all inherently need real DB state
 * and are proven there, not here).
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
  testMatch: ['**/__tests__/**/*.test.ts'],
};
