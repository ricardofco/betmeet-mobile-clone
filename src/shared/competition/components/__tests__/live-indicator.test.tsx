import { render, screen } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';
import { i18n } from '@/platform/i18n/i18n';
import { LiveIndicator } from '@/shared/competition/components/live-indicator';

describe('LiveIndicator (design.md §2.1 — isolated live-state pill)', () => {
  it('renders the LIVE label, accessible by role/label', async () => {
    // Change-2026-07-08 (follow-up) — now translated (`matchStatus.live`/
    // `common.livePill`); needs an ancestor `I18nextProvider`, same as
    // `match-card.test.tsx`'s `renderWithI18n`.
    await i18n.changeLanguage('en');
    await render(
      <I18nextProvider i18n={i18n}>
        <LiveIndicator />
      </I18nextProvider>,
    );

    expect(screen.getByLabelText('Live')).toBeTruthy();
    expect(screen.getByText('LIVE')).toBeOnTheScreen();
  });
});
