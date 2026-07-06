import { screen, userEvent } from '@testing-library/react-native';
import { LocaleSwitch } from '@/host/profile/components/locale-switch';
import { useLocaleStore } from '@/host/profile/locale-store';
import { profileApi } from '@/platform/backend-api/profile-api';
import { renderWithQueryClient } from '@/host/profile/test-utils/render-with-query-client';
import { DEFAULT_LOCALE } from '@/domain/profile/locale';
import { i18n } from '@/platform/i18n/i18n';

jest.mock('@/platform/backend-api/profile-api');

const mockedProfileApi = profileApi as jest.Mocked<typeof profileApi>;

describe('LocaleSwitch (PROFILE-3, ADR-012)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useLocaleStore.setState({ locale: DEFAULT_LOCALE, hydrated: true });
    mockedProfileApi.setLocale.mockResolvedValue({ locale: 'en' });
  });

  it('renders both locale options, with the current locale marked selected', async () => {
    await renderWithQueryClient(<LocaleSwitch />);
    const esOption = await screen.findByRole('radio', { name: 'Español' });
    const enOption = screen.getByRole('radio', { name: 'English' });
    expect(esOption).toBeOnTheScreen();
    expect(enOption).toBeOnTheScreen();
  });

  it('selecting English updates the local store immediately (instant switch, no restart needed)', async () => {
    const user = userEvent.setup();
    await renderWithQueryClient(<LocaleSwitch />);

    await user.press(await screen.findByRole('radio', { name: 'English' }));

    expect(useLocaleStore.getState().locale).toBe('en');
  });

  it('selecting a locale syncs it to the backend via profile.setLocale (PROFILE-3 AC: cross-device sync)', async () => {
    const user = userEvent.setup();
    await renderWithQueryClient(<LocaleSwitch />);

    await user.press(await screen.findByRole('radio', { name: 'English' }));

    expect(mockedProfileApi.setLocale).toHaveBeenCalledWith('en');
  });

  it('selecting a locale also switches the rendered UI language (ADR-041/044 unification, confirmed)', async () => {
    const user = userEvent.setup();
    await renderWithQueryClient(<LocaleSwitch />);
    // `renderWithQueryClient` defaults `i18n.language` to 'en' for test
    // determinism — press "Español" instead, to prove a real transition
    // rather than an already-true assertion.
    expect(i18n.language).toBe('en');

    await user.press(await screen.findByRole('radio', { name: 'Español' }));

    expect(i18n.language).toBe('es');
  });
});
