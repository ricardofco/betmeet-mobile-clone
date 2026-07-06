import { DEFAULT_LOCALE, isSupportedLocale, type AppLocale } from '@/domain/profile/locale';

/**
 * ADR-044 — framework-free (no RN/i18next/AsyncStorage imports) resolution
 * of i18next's initial UI language, unit-testable in isolation.
 *
 * Fallback order (ADR-041/044, unification confirmed):
 *   1. `storedProfileLocale` (non-null means the user has explicitly chosen
 *      a locale at least once via PROFILE-3's `ChangeLocaleScreen` — the
 *      caller derives this from whether the `profile.locale` AsyncStorage
 *      key exists at all, per ADR-044 point 2, not from this function).
 *   2. Best match of `deviceLocales` (in device-preference order, as
 *      reported by `react-native-localize`) against the app's supported
 *      locales (`es`/`en`).
 *   3. `DEFAULT_LOCALE` (`'es'`, ADR-012) when neither of the above applies.
 */
export type ResolveInitialLanguageInput = {
  storedProfileLocale: AppLocale | null;
  /** Device-reported locale/language tags, most-preferred first (e.g. `['en-US', 'es-MX']`). */
  deviceLocales: string[];
};

export function resolveInitialLanguage({
  storedProfileLocale,
  deviceLocales,
}: ResolveInitialLanguageInput): AppLocale {
  if (storedProfileLocale !== null) {
    return storedProfileLocale;
  }

  for (const tag of deviceLocales) {
    const languageCode = tag.split('-')[0]?.toLowerCase();
    if (languageCode && isSupportedLocale(languageCode)) {
      return languageCode;
    }
  }

  return DEFAULT_LOCALE;
}
