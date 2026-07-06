import { resolveInitialLanguage } from '@/domain/i18n/resolve-initial-language';

describe('resolveInitialLanguage', () => {
  it('returns the stored profile locale when present, regardless of device locales', () => {
    expect(
      resolveInitialLanguage({ storedProfileLocale: 'en', deviceLocales: ['es-ES'] }),
    ).toBe('en');
    expect(
      resolveInitialLanguage({ storedProfileLocale: 'es', deviceLocales: ['en-US'] }),
    ).toBe('es');
  });

  it('picks the best-matching supported device locale when no stored locale exists', () => {
    expect(
      resolveInitialLanguage({ storedProfileLocale: null, deviceLocales: ['en-US', 'fr-FR'] }),
    ).toBe('en');
    expect(
      resolveInitialLanguage({ storedProfileLocale: null, deviceLocales: ['es-MX'] }),
    ).toBe('es');
  });

  it('is case-insensitive on the device language code', () => {
    expect(
      resolveInitialLanguage({ storedProfileLocale: null, deviceLocales: ['EN-us'] }),
    ).toBe('en');
  });

  it('falls through multiple device locales until a supported one is found', () => {
    expect(
      resolveInitialLanguage({ storedProfileLocale: null, deviceLocales: ['fr-FR', 'de-DE', 'en-GB'] }),
    ).toBe('en');
  });

  it('defaults to es when no device locale is supported', () => {
    expect(
      resolveInitialLanguage({ storedProfileLocale: null, deviceLocales: ['fr-FR', 'de-DE'] }),
    ).toBe('es');
  });

  it('defaults to es when the device reports no locales at all', () => {
    expect(resolveInitialLanguage({ storedProfileLocale: null, deviceLocales: [] })).toBe('es');
  });
});
