import { render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { I18nextProvider } from 'react-i18next';
import { i18n } from '@/platform/i18n/i18n';
import { MatchCard } from '@/shared/competition/components/match-card';
import type { Match } from '@/domain/competition';

/**
 * Change-2026-07-08 (follow-up) — `MatchCard`/`LiveIndicator` adopted
 * `useTranslation()` for status-label/TBD/penalty-abbreviation/live-pill
 * copy; without an ancestor `I18nextProvider`, `t()` falls back to
 * `react-i18next`'s uninitialized default instance and returns the raw key
 * path instead of resolved text. Forces `'en'` for deterministic assertions,
 * same convention as `renderWithQueryClient`
 * (`src/host/profile/test-utils/`) — this component needs no
 * `TamaguiProvider`/`QueryClientProvider` (plain `StyleSheet`, no Tamagui,
 * no query), so a minimal local wrapper is used instead of pulling in that
 * unrelated helper's extra dependencies.
 */
async function renderWithI18n(ui: ReactElement) {
  await i18n.changeLanguage('en');
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
}

function makeMatch(overrides: Partial<Match> & { id: string }): Match {
  return {
    phaseId: 'group-stage',
    kickoffAt: '2026-06-16T18:00:00Z',
    status: 'SCHEDULED',
    homeTeam: { id: 'h', fifaCode: 'GER', name: 'Germany', flagKey: 'de' },
    awayTeam: { id: 'a', fifaCode: 'NED', name: 'Netherlands', flagKey: 'nl' },
    homeScore: null,
    awayScore: null,
    homePenaltyScore: null,
    awayPenaltyScore: null,
    ...overrides,
  };
}

describe('MatchCard (COMPETITION-1 AC)', () => {
  it('renders both teams, scores, and status', async () => {
    const match = makeMatch({ id: 'm1', status: 'FINISHED', homeScore: 2, awayScore: 1 });
    await renderWithI18n(<MatchCard match={match} />);

    expect(screen.getByText('Germany')).toBeOnTheScreen();
    expect(screen.getByText('Netherlands')).toBeOnTheScreen();
    expect(screen.getByText('2 – 1')).toBeOnTheScreen();
    expect(screen.getByText('Finished')).toBeOnTheScreen();
  });

  it('shows the LIVE indicator instead of a status label when the match is live', async () => {
    const match = makeMatch({ id: 'm2', status: 'LIVE', homeScore: 0, awayScore: 0 });
    await renderWithI18n(<MatchCard match={match} />);

    expect(screen.getByLabelText('Live')).toBeTruthy();
    expect(screen.queryByText('Live')).toBeNull(); // the plain status-label text path is not used for LIVE
  });

  it('renders dashes for unscored matches', async () => {
    const match = makeMatch({ id: 'm3', status: 'SCHEDULED' });
    await renderWithI18n(<MatchCard match={match} />);

    expect(screen.getByText('– – –')).toBeOnTheScreen();
  });

  it('renders penalty scores when present', async () => {
    const match = makeMatch({
      id: 'm4',
      status: 'FINISHED',
      homeScore: 1,
      awayScore: 1,
      homePenaltyScore: 4,
      awayPenaltyScore: 3,
    });
    await renderWithI18n(<MatchCard match={match} />);

    expect(screen.getByText('(4 – 3 pen.)')).toBeOnTheScreen();
  });

  it('renders knockout placeholders for unresolved team slots, not blank', async () => {
    const match = makeMatch({
      id: 'm5',
      homeTeam: { kind: 'placeholder', label: 'Winner of Round of 16 Match 3' },
      awayTeam: { kind: 'placeholder', label: 'Runner-up Group A' },
      kickoffAt: null,
    });
    await renderWithI18n(<MatchCard match={match} />);

    expect(screen.getByText('Winner of Round of 16 Match 3')).toBeOnTheScreen();
    expect(screen.getByText('Runner-up Group A')).toBeOnTheScreen();
    expect(screen.getByText('TBD')).toBeOnTheScreen(); // kickoff time placeholder
  });
});
