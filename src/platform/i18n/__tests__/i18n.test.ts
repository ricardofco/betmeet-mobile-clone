import AsyncStorage from '@react-native-async-storage/async-storage';
import { i18n, resolveAndApplyInitialLanguage, PROFILE_LOCALE_STORAGE_KEY } from '@/platform/i18n/i18n';

/**
 * ADR-044 — platform-layer wiring test. The pure fallback-ordering logic
 * itself is unit-tested in isolation at `domain/i18n/resolve-initial-
 * language.test.ts`; this suite proves the wiring around it: reading
 * `react-native-localize`'s device locales, reading the same `profile.locale`
 * AsyncStorage key `locale-store.ts` (Bolt 3, ADR-013) writes to, and
 * applying the result to the shared `i18next` instance.
 *
 * `mockGetLocales` is a stable, module-scoped jest.fn wrapped by the
 * `jest.mock` factory below — deliberately NOT `jest.spyOn(RNLocalize,
 * 'getLocales')` against an `import * as RNLocalize` namespace object,
 * which Babel's CommonJS interop copies by value at import time (a
 * `jest.spyOn` reassignment on that per-file copy does not reach a
 * different file's — e.g. `platform/i18n/i18n.ts`'s — own copy of the same
 * namespace). Routing every call through one indirection function sidesteps
 * that entirely.
 */
const mockGetLocales = jest.fn();
jest.mock('react-native-localize', () => ({
  getLocales: (...args: unknown[]) => mockGetLocales(...args),
  findBestLanguageTag: jest.fn(),
}));

describe('resolveAndApplyInitialLanguage (ADR-044)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockGetLocales.mockReset();
    await i18n.changeLanguage('es'); // reset to a known state before each test
  });

  it('applies the device-detected language when no explicit profile locale was ever stored', async () => {
    mockGetLocales.mockReturnValue([{ languageTag: 'en-US', languageCode: 'en', countryCode: 'US', isRTL: false }]);

    await resolveAndApplyInitialLanguage();

    expect(i18n.language).toBe('en');
  });

  it('falls back to the default locale (es) when the device locale is unsupported', async () => {
    mockGetLocales.mockReturnValue([{ languageTag: 'fr-FR', languageCode: 'fr', countryCode: 'FR', isRTL: false }]);

    await resolveAndApplyInitialLanguage();

    expect(i18n.language).toBe('es');
  });

  it('an explicitly-stored profile locale wins over device detection (ADR-041/044 unification)', async () => {
    mockGetLocales.mockReturnValue([{ languageTag: 'en-US', languageCode: 'en', countryCode: 'US', isRTL: false }]);
    await AsyncStorage.setItem(PROFILE_LOCALE_STORAGE_KEY, 'es');

    await resolveAndApplyInitialLanguage();

    expect(i18n.language).toBe('es');
  });
});
