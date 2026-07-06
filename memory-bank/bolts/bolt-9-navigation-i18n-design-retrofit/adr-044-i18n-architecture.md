# ADR-044 — i18n Architecture: Domain Resolution Function + Platform Wiring

**Date:** 2026-07-03 (finalized) — reconfirmed by the user at the Design-stage checkpoint
**Status:** Accepted — fully resolved, no longer contingent (see §4)
**Bolt:** 9 — Navigation, i18n & Design Retrofit

## Context

NFR-10.4 requires device-detected `es`/`en` UI-string translation, defaulting to `es` when undetected/unsupported, and ADR-041 already reconciled this against the existing profile-stored `Profile.locale` (ADR-012/PROFILE-3) — with one open question flagged for this bolt's Design stage (unify vs. keep fully independent). This ADR records the concrete architecture, following the project's established `domain/` (framework-free) vs. `platform/` (SDK-wiring) layering (the same split `evaluateGuard`/`SupabaseAdapter` already demonstrate).

**Resolution (Design-stage checkpoint, this session):** the user explicitly confirmed **unification** — one explicit choice in the existing `ChangeLocaleScreen` drives both the stored `Profile.locale` preference and the rendered UI chrome language. ADR-041's working assumption is now the final, confirmed decision; §4 below is implemented as written (not contingent).

## Decision

1. **`src/domain/i18n/resolve-initial-language.ts`** (new, framework-free — no RN/i18next/AsyncStorage imports, unit-testable in isolation): a pure function
   ```
   resolveInitialLanguage(input: { storedProfileLocale: AppLocale | null; deviceLocales: string[] }): AppLocale
   ```
   implementing the fallback order: explicit stored locale wins if present; otherwise best match of `deviceLocales` against `['es','en']`; otherwise `'es'`.

2. **Detecting "has the user ever explicitly chosen a locale" reuses an existing signal — no new sentinel key.** Re-confirmed by reading `locale-store.ts`: `AsyncStorage.setItem('profile.locale', ...)` is only ever called from `setLocale()` (an explicit user action via `LocaleSwitch`); the default-fallback path in `hydrate()` never writes to AsyncStorage. Therefore the mere **presence** of the `profile.locale` AsyncStorage key is already a reliable "explicit choice happened at least once" signal. `platform/i18n/i18n.ts`'s init reads this key directly via `AsyncStorage.getItem('profile.locale')` (not through the Zustand store) to avoid a hydration-timing race between two independent async reads of the same key at boot.

3. **`src/platform/i18n/i18n.ts`** (new, sibling to `platform/supabase`/`platform/backend-api`): creates the `i18next` instance synchronously at module load with `es`/`en` resource catalogs and `DEFAULT_LOCALE` as the immediate initial language (so `react-i18next` always has something renderable). `AppProviders` then asynchronously (mirroring ADR-013's "loading splash already covers the gap" pattern — no new splash state) reads `react-native-localize`'s device locales + the AsyncStorage key, calls `resolveInitialLanguage()`, and calls `i18next.changeLanguage()` with the result.

4. **`change-locale-screen.tsx`/`locale-switch.tsx` (PROFILE-3) — unification, confirmed:** `locale-switch.tsx`'s `handleSelect` gains one additive call, `i18n.changeLanguage(value)`, alongside its existing `setLocale(value)` (local store) and `syncLocale(value)` (backend mutation) — one user action drives all three: the persisted business-data field, its local cache, and the rendered UI chrome language, together.

5. **String catalogs:** `src/platform/i18n/locales/{es,en}.{json,ts}` (or per-feature namespaces) — exact granularity is an Implement-stage detail, not an architectural one.

## MF-shared-singleton note

See ADR-043 — `i18next`/`react-i18next` are host+`pools`-remote singletons; `react-native-localize` is host-only (its only consumer is `platform/i18n/i18n.ts`, which runs once at host boot).

## Consequences

- No change to `Profile.locale`'s persisted default or backend contract (ADR-012 stands, per ADR-041).
- A Bolt-5-through-8 string-extraction pass is required across every screen currently hardcoding English literals (`model.md §6`'s inventory) — tracked as Implement-stage work, not a new architectural decision.
- ADR-041's open question is now closed. If a future need for independence arises (e.g. notification-copy language diverging from UI chrome), that would be a new, separately-justified change request against this confirmed decision — not a reopening of this ADR.
