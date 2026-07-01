import { useCompetitionStore } from '@/shared/competition/competition-store';

/**
 * ADR-020: this store is scoped to only the past-matches toggle —
 * `LiveSubscriptionState` is deliberately not here, so this suite only
 * needs to assert the toggle flips within a session.
 */
describe('competition-store (design.md §3.2, ADR-020)', () => {
  beforeEach(() => {
    useCompetitionStore.setState({ showPastMatches: false });
  });

  it('defaults to not showing past matches', () => {
    expect(useCompetitionStore.getState().showPastMatches).toBe(false);
  });

  it('togglePastMatches flips the flag', () => {
    useCompetitionStore.getState().togglePastMatches();
    expect(useCompetitionStore.getState().showPastMatches).toBe(true);

    useCompetitionStore.getState().togglePastMatches();
    expect(useCompetitionStore.getState().showPastMatches).toBe(false);
  });
});
