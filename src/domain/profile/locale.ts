/**
 * PROFILE-3's locale value object (model.md §2.6). `DEFAULT_LOCALE` is
 * hardcoded to `'es'` regardless of device language — an explicit, recorded
 * UX call (ADR-012), never derived from a device-locale API.
 */
export type AppLocale = 'es' | 'en';

export const DEFAULT_LOCALE: AppLocale = 'es';

export function isSupportedLocale(value: string): value is AppLocale {
  return value === 'es' || value === 'en';
}
