import AsyncStorage from '@react-native-async-storage/async-storage';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as RNLocalize from 'react-native-localize';
import { resolveInitialLanguage } from '@/domain/i18n/resolve-initial-language';
import { DEFAULT_LOCALE, isSupportedLocale, type AppLocale } from '@/domain/profile/locale';
import { en } from '@/platform/i18n/locales/en';
import { es } from '@/platform/i18n/locales/es';

/**
 * ADR-044 — platform-layer i18next wiring (SDK-facing, sibling to
 * `platform/supabase`/`platform/backend-api`). The pure fallback-ordering
 * logic itself lives in `domain/i18n/resolve-initial-language.ts`; this
 * module only wires `react-native-localize` + AsyncStorage + `i18next`
 * together and calls it.
 *
 * The same AsyncStorage key Bolt 3's `locale-store.ts` uses
 * (`profile.locale`, ADR-013) is read directly here — not through the
 * Zustand store — to avoid a hydration-timing race between two independent
 * async reads of the same key at boot (ADR-044 point 2).
 */
export const PROFILE_LOCALE_STORAGE_KEY = 'profile.locale';

export const i18n = i18next.createInstance();

// Fire-and-forget: resources are provided synchronously below, so `init()`
// completes on the same tick in practice — `resolveAndApplyInitialLanguage()`
// (called from `AppProviders`) corrects the language afterwards regardless.
i18n.use(initReactI18next).init({
  // Synchronous default so `react-i18next` always has something renderable
  // immediately at module load — `resolveInitialLanguageAsync()` below then
  // corrects it before the app's real UI needs to render meaningfully,
  // mirroring ADR-013's "loading splash already covers the gap" pattern.
  lng: DEFAULT_LOCALE,
  fallbackLng: DEFAULT_LOCALE,
  resources: {
    es: { translation: es },
    en: { translation: en },
  },
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

async function readStoredProfileLocale(): Promise<AppLocale | null> {
  try {
    const stored = await AsyncStorage.getItem(PROFILE_LOCALE_STORAGE_KEY);
    if (stored && isSupportedLocale(stored)) {
      return stored;
    }
  } catch {
    // A storage read failure must not block app boot — fall through to
    // device detection, same discipline as `locale-store.ts`'s `hydrate()`.
  }
  return null;
}

function readDeviceLocales(): string[] {
  try {
    return RNLocalize.getLocales().map(locale => locale.languageTag);
  } catch {
    return [];
  }
}

/**
 * Called once from `AppProviders` at boot. Resolves the real initial
 * language (stored explicit choice > device detection > `es` default,
 * ADR-041/044) and applies it to the shared `i18next` instance.
 */
export async function resolveAndApplyInitialLanguage(): Promise<void> {
  const storedProfileLocale = await readStoredProfileLocale();
  const deviceLocales = readDeviceLocales();
  const resolved = resolveInitialLanguage({ storedProfileLocale, deviceLocales });
  await i18n.changeLanguage(resolved);
}

export default i18n;
