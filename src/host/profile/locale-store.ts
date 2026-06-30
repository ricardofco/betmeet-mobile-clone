import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { DEFAULT_LOCALE, isSupportedLocale, type AppLocale } from '@/domain/profile/locale';

/**
 * PROFILE-3's active-locale store (design.md §4, ADR-013). Deliberately
 * small, mirrors `auth-session-store.ts`'s minimalism — holds only the
 * active `AppLocale` and a `hydrated` flag. Persistence is local-only here
 * (AsyncStorage, ADR-013); syncing to the backend's `profile.setLocale`
 * capability is the caller's responsibility (e.g. `LocaleSwitch`), not this
 * store's — this store is the single source of truth for "what locale is
 * the UI showing right now," independent of network state.
 *
 * `DEFAULT_LOCALE` (`'es'`, ADR-012) is used only when there is no
 * locally-persisted value yet — i.e. strictly on first launch.
 */
const STORAGE_KEY = 'profile.locale';

export type LocaleStoreState = {
  locale: AppLocale;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setLocale: (locale: AppLocale) => Promise<void>;
};

export const useLocaleStore = create<LocaleStoreState>((set, get) => ({
  locale: DEFAULT_LOCALE,
  hydrated: false,

  async hydrate() {
    if (get().hydrated) return;
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored && isSupportedLocale(stored)) {
        set({ locale: stored, hydrated: true });
        return;
      }
    } catch {
      // Fall through to default — a storage read failure must not block
      // app boot.
    }
    set({ hydrated: true });
  },

  async setLocale(locale: AppLocale) {
    set({ locale });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // Local persistence is best-effort; the in-memory value (and the
      // backend sync the caller separately performs) remain correct for
      // this session regardless.
    }
  },
}));
