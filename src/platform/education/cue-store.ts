import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageKey } from '@/domain/education/cue-store';

/**
 * EDU-4's async `AsyncStorage` wrapper (design.md §9.1, ADR-056) — the
 * platform-tier half of the domain/platform split, mirroring
 * `src/host/profile/locale-store.ts`'s own try/catch shape exactly.
 *
 * Fail-open, preserved 1:1 from betmeet-clone's `localStorage`-backed
 * original (model.md §5, BR-2.16/BR-2.18): if `AsyncStorage` is unavailable
 * or throws, callouts are shown (`shouldShowCallout` resolves `true`) and
 * writes are silent no-ops (`dismissCallout` never throws) — education never
 * breaks the render.
 *
 * The one real difference from betmeet-clone's synchronous `localStorage`
 * original: both functions are async (`AsyncStorage`'s own contract) —
 * callers (`use-dismissible-cue.ts`) resolve this via a `useEffect`, not a
 * synchronous first-render read.
 */
export async function shouldShowCallout(cueId: string): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(storageKey(cueId));
    return stored !== '1';
  } catch {
    return true;
  }
}

export async function dismissCallout(cueId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey(cueId), '1');
  } catch {
    // Fail-open: local persistence is best-effort only — a write failure
    // must never surface as an error to the caller (BR-2.18 equivalent).
  }
}
