import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { TamaguiProvider } from 'tamagui';
import { PredictionsScreen } from '@/host/predictions/screens/predictions-screen';
import { predictionsApi } from '@/platform/backend-api/predictions-api';
import { competitionApi } from '@/platform/backend-api/competition-api';
import { i18n } from '@/platform/i18n/i18n';
import tamaguiConfig from '../../../../../tamagui.config';
import type { Match } from '@/domain/competition';

jest.mock('@/platform/backend-api/predictions-api');
jest.mock('@/platform/backend-api/competition-api');

// This bolt is the first real mount of Bolt 5's fixture data on a screen
// (design.md §4) — `useLiveCompetitionSubscription` itself is already
// unit-tested in Bolt 5 (use-live-competition-subscription.test.tsx); this
// screen test only needs to verify it's invoked without crashing, so it's
// mocked here rather than re-exercising its own internal debounce/relevance
// logic a second time.
jest.mock('@/shared/competition', () => {
  const actual = jest.requireActual('@/shared/competition');
  return {
    ...actual,
    useLiveCompetitionSubscription: jest.fn(),
  };
});

const mockedPredictionsApi = predictionsApi as jest.Mocked<typeof predictionsApi>;
const mockedCompetitionApi = competitionApi as jest.Mocked<typeof competitionApi>;

function makeMatch(overrides: Partial<Match> & { id: string }): Match {
  return {
    phaseId: 'group-stage',
    kickoffAt: '2026-06-20T18:00:00Z',
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

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
        <I18nextProvider i18n={i18n}>
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </I18nextProvider>
      </TamaguiProvider>
    );
  }
  return Wrapper;
}

describe('PredictionsScreen (PREDICTIONS-1/2/5 entry screen, design.md §4)', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    // `i18n`'s own default is `'es'` (`DEFAULT_LOCALE`, ADR-012) — normally
    // corrected by `AppProviders`' boot effect, which this isolated screen
    // test never mounts. Force `'en'` so this file's English-string
    // assertions stay deterministic.
    await i18n.changeLanguage('en');
  });

  it('shows a loading indicator while fixture/prediction/phase queries are in flight', async () => {
    mockedCompetitionApi.getFixture.mockReturnValue(new Promise(() => {}));
    mockedPredictionsApi.getMyPredictions.mockReturnValue(new Promise(() => {}));
    mockedCompetitionApi.getKnockoutPhaseIds.mockReturnValue(new Promise(() => {}));

    await render(<PredictionsScreen />, { wrapper: createWrapper() });

    // Still resolving — the fixture list hasn't rendered yet.
    expect(screen.queryByText('Germany')).not.toBeOnTheScreen();
    expect(screen.queryByLabelText('Home score')).not.toBeOnTheScreen();
  });

  it('renders the joined fixture+prediction list once loaded', async () => {
    mockedCompetitionApi.getFixture.mockResolvedValue([makeMatch({ id: 'm1' })]);
    mockedPredictionsApi.getMyPredictions.mockResolvedValue([]);
    mockedCompetitionApi.getKnockoutPhaseIds.mockResolvedValue([]);

    await render(<PredictionsScreen />, { wrapper: createWrapper() });

    expect(await screen.findByText('Germany')).toBeOnTheScreen();
    expect(screen.getByLabelText('Home score')).toBeOnTheScreen();
  });

  it('shows an error state when the fixture query fails', async () => {
    mockedCompetitionApi.getFixture.mockRejectedValue(new Error('network down'));
    mockedPredictionsApi.getMyPredictions.mockResolvedValue([]);
    mockedCompetitionApi.getKnockoutPhaseIds.mockResolvedValue([]);

    await render(<PredictionsScreen />, { wrapper: createWrapper() });

    expect(await screen.findByText(/Couldn't load fixtures/)).toBeOnTheScreen();
  });
});
