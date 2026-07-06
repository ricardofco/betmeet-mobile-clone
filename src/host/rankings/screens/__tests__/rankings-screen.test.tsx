import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { TamaguiProvider } from 'tamagui';
import { RankingsScreen } from '@/host/rankings/screens/rankings-screen';
import { rankingsApi } from '@/platform/backend-api/rankings-api';
import { i18n } from '@/platform/i18n/i18n';
import tamaguiConfig from '../../../../../tamagui.config';
import type { RankingRow } from '@/domain/rankings';

jest.mock('@/platform/backend-api/rankings-api');
const mockedRankingsApi = rankingsApi as jest.Mocked<typeof rankingsApi>;

function makeRow(overrides: Partial<RankingRow> & Pick<RankingRow, 'userId'>): RankingRow {
  return {
    nickname: overrides.userId,
    avatarUrl: null,
    isViewer: false,
    confirmedTotal: 0,
    projectedTotal: null,
    hasConfirmedEntry: true,
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

describe('RankingsScreen (RANKINGS-1, design.md §7.1)', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await i18n.changeLanguage('en');
  });

  it('shows a loading state while the query is in flight', async () => {
    mockedRankingsApi.getGlobalRanking.mockReturnValue(new Promise(() => {}));

    await render(<RankingsScreen />, { wrapper: createWrapper() });

    expect(screen.getByText('Loading rankings…')).toBeOnTheScreen();
  });

  it('shows an error state when the query fails', async () => {
    mockedRankingsApi.getGlobalRanking.mockRejectedValue(new Error('network down'));

    await render(<RankingsScreen />, { wrapper: createWrapper() });

    expect(await screen.findByText("Couldn't load the rankings.")).toBeOnTheScreen();
  });

  it('shows the empty state when there are no ranked players', async () => {
    mockedRankingsApi.getGlobalRanking.mockResolvedValue({ ok: true, isLive: false, rows: [] });

    await render(<RankingsScreen />, { wrapper: createWrapper() });

    expect(await screen.findByText('No ranked players yet.')).toBeOnTheScreen();
  });

  it('renders the CONFIRMED total and no LIVE banner when the response is not live', async () => {
    mockedRankingsApi.getGlobalRanking.mockResolvedValue({
      ok: true,
      isLive: false,
      rows: [
        makeRow({ userId: 'u1', nickname: 'alice#0001', confirmedTotal: 42, projectedTotal: null }),
      ],
    });

    await render(<RankingsScreen />, { wrapper: createWrapper() });

    expect(await screen.findByText('alice#0001')).toBeOnTheScreen();
    expect(screen.getByText('42')).toBeOnTheScreen();
    expect(screen.queryByText('LIVE')).not.toBeOnTheScreen();
  });

  it('renders the PROJECTED total and a LIVE banner when the response is live', async () => {
    mockedRankingsApi.getGlobalRanking.mockResolvedValue({
      ok: true,
      isLive: true,
      rows: [
        makeRow({ userId: 'u1', nickname: 'alice#0001', confirmedTotal: 10, projectedTotal: 15 }),
      ],
    });

    await render(<RankingsScreen />, { wrapper: createWrapper() });

    expect(await screen.findByText('LIVE')).toBeOnTheScreen();
    // Displays the projected total (15), not the confirmed total (10), while live.
    expect(screen.getByText('15')).toBeOnTheScreen();
    expect(screen.queryByText('10')).not.toBeOnTheScreen();
  });
});
