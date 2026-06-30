import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_LOCALE } from '@/domain/profile/locale';
import { useLocaleStore } from '@/host/profile/locale-store';

/**
 * ADR-013/ADR-012: locale defaults to `'es'` (hardcoded, never
 * device-derived) until a locally-persisted value is found. AsyncStorage is
 * mocked via its own ships-with-the-package Jest mock (jest.config.js
 * setupFiles).
 */
describe('useLocaleStore (design.md §4, ADR-012, ADR-013)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useLocaleStore.setState({ locale: DEFAULT_LOCALE, hydrated: false });
  });

  it('starts at DEFAULT_LOCALE (es) before hydration', () => {
    expect(useLocaleStore.getState().locale).toBe('es');
    expect(useLocaleStore.getState().hydrated).toBe(false);
  });

  it('hydrate() with no persisted value leaves the default locale, marks hydrated', async () => {
    await useLocaleStore.getState().hydrate();
    expect(useLocaleStore.getState().locale).toBe('es');
    expect(useLocaleStore.getState().hydrated).toBe(true);
  });

  it('hydrate() restores a previously-persisted locale (e.g. en) — explicit user choice survives restart', async () => {
    await AsyncStorage.setItem('profile.locale', 'en');
    await useLocaleStore.getState().hydrate();
    expect(useLocaleStore.getState().locale).toBe('en');
  });

  it('hydrate() ignores a corrupted/unsupported persisted value and falls back to default', async () => {
    await AsyncStorage.setItem('profile.locale', 'fr');
    await useLocaleStore.getState().hydrate();
    expect(useLocaleStore.getState().locale).toBe('es');
  });

  it('hydrate() is idempotent — calling it twice does not re-read storage a second time', async () => {
    await AsyncStorage.setItem('profile.locale', 'en');
    await useLocaleStore.getState().hydrate();
    await AsyncStorage.setItem('profile.locale', 'es'); // changed underneath
    await useLocaleStore.getState().hydrate();
    expect(useLocaleStore.getState().locale).toBe('en'); // unchanged — second hydrate is a no-op
  });

  it('setLocale updates the in-memory value immediately (instant UI switch, PROFILE-3 AC)', async () => {
    await useLocaleStore.getState().setLocale('en');
    expect(useLocaleStore.getState().locale).toBe('en');
  });

  it('setLocale persists to AsyncStorage so the choice survives a restart', async () => {
    await useLocaleStore.getState().setLocale('en');
    expect(await AsyncStorage.getItem('profile.locale')).toBe('en');
  });
});
