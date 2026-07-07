/**
 * ADMIN-2/3's in-memory, non-persisted tracker (ADR-058). Uses
 * `jest.isolateModules` per test so each test gets a FRESH copy of the
 * module's own `lastRunAt`/`lastSweptCount` closure state (this module has
 * no reset function by design — it's meant to persist for the process's
 * whole lifetime) rather than leaking state across tests in this file.
 */
describe('sweep-status tracker (ADR-058)', () => {
  it('starts at "never run" (both null) before any call', () => {
    jest.isolateModules(() => {
      const { getSweepStatus } = require('../sweep-status');
      expect(getSweepStatus()).toEqual({ lastRunAt: null, lastSweptCount: null });
    });
  });

  it('updates lastRunAt/lastSweptCount after recordSweepRun is called', () => {
    jest.isolateModules(() => {
      const { getSweepStatus, recordSweepRun } = require('../sweep-status');
      const at = new Date('2026-07-07T10:00:00.000Z');
      recordSweepRun(3, at);
      expect(getSweepStatus()).toEqual({ lastRunAt: at, lastSweptCount: 3 });
    });
  });

  it('defaults `at` to "now" when not supplied', () => {
    jest.isolateModules(() => {
      const { getSweepStatus, recordSweepRun } = require('../sweep-status');
      const before = Date.now();
      recordSweepRun(0);
      const after = Date.now();
      const status = getSweepStatus();
      expect(status.lastSweptCount).toBe(0);
      expect(status.lastRunAt).not.toBeNull();
      expect(status.lastRunAt!.getTime()).toBeGreaterThanOrEqual(before);
      expect(status.lastRunAt!.getTime()).toBeLessThanOrEqual(after);
    });
  });

  it('reflects the most recent call regardless of which caller triggered it (an admin tap vs. a silent lazy-sweep read are indistinguishable to the tracker)', () => {
    jest.isolateModules(() => {
      const { getSweepStatus, recordSweepRun } = require('../sweep-status');
      recordSweepRun(1, new Date('2026-07-01T00:00:00.000Z'));
      recordSweepRun(5, new Date('2026-07-07T00:00:00.000Z'));
      expect(getSweepStatus()).toEqual({ lastRunAt: new Date('2026-07-07T00:00:00.000Z'), lastSweptCount: 5 });
    });
  });

  it('a count of 0 is distinguishable from "never run" (0 !== null)', () => {
    jest.isolateModules(() => {
      const { getSweepStatus, recordSweepRun } = require('../sweep-status');
      recordSweepRun(0, new Date());
      const status = getSweepStatus();
      expect(status.lastSweptCount).toBe(0);
      expect(status.lastRunAt).not.toBeNull();
    });
  });
});
