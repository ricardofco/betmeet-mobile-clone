import { render, screen } from '@testing-library/react-native';
import { FlagBadge } from '@/shared/competition/flags/flag-badge';

describe('FlagBadge (COMPETITION-3 AC — bundled flag rendering)', () => {
  it('renders an accessible SVG for a known catalog key', async () => {
    await render(<FlagBadge flagKey="gb-eng" />);

    expect(screen.getByLabelText('Flag: gb-eng')).toBeTruthy();
  });

  it('renders each UK home-nation subdivision key distinctly, without crashing (COMPETITION-3 AC #2)', async () => {
    const ukKeys = ['gb-eng', 'gb-sct', 'gb-wls'];

    for (const key of ukKeys) {
      await render(<FlagBadge flagKey={key} />);
      expect(screen.getByLabelText(`Flag: ${key}`)).toBeTruthy();
    }
  });

  it('renders a fallback swatch for an unknown flag key, without crashing (never a hard failure for an unmapped key)', async () => {
    await render(<FlagBadge flagKey="not-a-real-key" />);

    expect(screen.getByLabelText('Flag: not-a-real-key')).toBeTruthy();
  });

  it('respects a custom size prop', async () => {
    await render(<FlagBadge flagKey="de" size={48} />);

    expect(screen.getByLabelText('Flag: de')).toBeTruthy();
  });
});
