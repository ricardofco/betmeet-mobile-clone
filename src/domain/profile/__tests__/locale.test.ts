import { DEFAULT_LOCALE, isSupportedLocale } from '@/domain/profile/locale';

describe('locale (model.md §2.6, ADR-012)', () => {
  it('DEFAULT_LOCALE is es, hardcoded — never device-derived (ADR-012)', () => {
    expect(DEFAULT_LOCALE).toBe('es');
  });

  it('isSupportedLocale accepts es', () => {
    expect(isSupportedLocale('es')).toBe(true);
  });

  it('isSupportedLocale accepts en', () => {
    expect(isSupportedLocale('en')).toBe(true);
  });

  it('isSupportedLocale rejects any other value (e.g. a raw device locale string)', () => {
    expect(isSupportedLocale('en-US')).toBe(false);
    expect(isSupportedLocale('fr')).toBe(false);
    expect(isSupportedLocale('')).toBe(false);
  });
});
