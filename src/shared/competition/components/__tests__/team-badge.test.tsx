import { render, screen } from '@testing-library/react-native';
import { TeamBadge } from '@/shared/competition/components/team-badge';

describe('TeamBadge (COMPETITION-1 AC, COMPETITION-3)', () => {
  it('renders a resolved team name and FIFA trigram', async () => {
    await render(
      <TeamBadge team={{ id: 't1', fifaCode: 'GER', name: 'Germany', flagKey: 'de' }} />,
    );

    expect(screen.getByText('Germany')).toBeOnTheScreen();
    expect(screen.getByText('GER')).toBeOnTheScreen();
  });

  it('renders a knockout placeholder label, never blank (COMPETITION-1 AC)', async () => {
    await render(<TeamBadge team={{ kind: 'placeholder', label: 'Winner of Round of 16 Match 3' }} />);

    expect(screen.getByText('Winner of Round of 16 Match 3')).toBeOnTheScreen();
  });

  it('renders a TBD fallback for a bare null slot', async () => {
    await render(<TeamBadge team={null} />);

    expect(screen.getByText('TBD')).toBeOnTheScreen();
  });

  it('renders the UK home-nations with their correct subdivision flag key, not a generic fallback (COMPETITION-3 AC)', async () => {
    await render(<TeamBadge team={{ id: 't2', fifaCode: 'SCO', name: 'Scotland', flagKey: 'gb-sct' }} />);

    expect(screen.getByText('Scotland')).toBeOnTheScreen();
    expect(screen.getByText('SCO')).toBeOnTheScreen();
    expect(screen.getByLabelText('Flag: gb-sct')).toBeTruthy();
  });
});
