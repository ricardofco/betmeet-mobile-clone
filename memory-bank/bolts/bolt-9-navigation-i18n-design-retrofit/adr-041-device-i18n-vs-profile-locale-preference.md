# ADR-041 — Device-Detected UI Language (i18next) Coexists With, Does Not Replace, the Profile-Stored Locale Preference (ADR-012)

**Date:** 2026-07-03
**Status:** Accepted — **open question resolved 2026-07-03 at the Design-stage checkpoint: unification confirmed by the user.** See ADR-044 for the final, non-contingent architecture and wiring.
**Bolt:** 9 — Navigation, i18n & Design Retrofit

---

## Context

A Construction-pause change evaluation (2026-07-03, mid-Bolt-8-Layer-2) surfaced a new requirement: the app UI should support Spanish/English, auto-detected from the device's OS locale via `react-native-localize`, defaulting to `es` when the device locale is undetected or unsupported (`requirements.md §10` NFR-10.4). This is a genuinely new capability — no i18n library exists anywhere in the repo through Bolt 8; every screen's strings are hardcoded.

This directly overlaps, in subject matter only, with **ADR-012** (Bolt 3, `bolt-3-profile-onboarding/adr-012-locale-default-es.md`): "locale defaults to `es` regardless of device language." Read carelessly, the two look contradictory (one wants device-detection, the other explicitly rejects it). They are not contradictory once the two "locale" concepts are separated:

- **ADR-012's `locale`** is `Profile.locale` — a **business-data field** (PROFILE-3, `src/domain/profile/locale.ts`, `locale-store.ts`, `change-locale-screen.tsx`), explicit-user-choice, persisted to the backend, synced across the user's devices. Its only stated purpose to date (per `domain-overview.md §2`, mirrored 1:1 from `betmeet-clone`) is mirroring the web app's own per-user locale preference. ADR-012's decision was narrowly about this field's **first-time default value**, not about how the UI renders its own chrome strings — Bolt 3 never introduced any UI-string-translation mechanism at all.
- **NFR-10.4's `locale`** is **app-chrome UI language** — which string catalog `i18next`/`react-i18next` renders for buttons, labels, error messages, etc. — driven by `react-native-localize`'s device-reported locale, with `es` as the undetected/unsupported fallback.

These are two different pieces of state that happen to share the word "locale."

---

## Decision

Both mechanisms are kept, coexisting, **not one superseding the other**:

1. **ADR-012 is not overturned.** `Profile.locale`'s first-time default remains hardcoded `es` regardless of device language, exactly as ADR-012 decided — this ADR does not touch that field, its default, or `change-locale-screen.tsx`.
2. **`i18next`'s active UI language is seeded from `react-native-localize` at app start** (device locale → `es`/`en`, `es` fallback), independent of `Profile.locale`, satisfying NFR-10.4 as its own new mechanism.
3. **`change-locale-screen.tsx` (PROFILE-3) is extended, not replaced**: setting `Profile.locale` **also** switches `i18next`'s active language to match, immediately and locally (no need to wait for a backend round-trip) — i.e., an explicit user choice in that one existing screen is the single place a user can override the device-detected default, and it drives both the persisted business-data field (unchanged behavior) and the UI's rendered language (new behavior) together, from one user action.
4. On subsequent app launches, once `Profile.locale` has ever been explicitly set (Bolt 3's existing rehydration logic — "no locally-persisted value *and* no backend-synced value yet" is the only case ADR-012's hardcoded default applies to), that value takes precedence over a fresh `react-native-localize` read for i18next's initial language too — so a user who explicitly chose `en` in Settings does not get silently reverted to `es` UI strings because their device's OS locale is Spanish, or vice versa.

In short: **device detection governs first-launch-before-any-explicit-choice only; an explicit `Profile.locale` choice (via the existing PROFILE-3 screen) always wins thereafter, for both the stored field and the rendered UI language.** This does not reintroduce device-awareness into ADR-012's own default (still hardcoded `es` for the field itself pre-choice) — it adds a second, independent consumer (`i18next`'s initial language) that is device-aware where ADR-012's field is not, then unifies both under the same explicit-choice screen going forward.

---

## Open question (flagged explicitly, not guessed)

It is not yet confirmed against `betmeet-clone`'s real code (or decided fresh, since this is mobile-native behavior with no web equivalent — the web app has no "device OS locale" concept, only browser `Accept-Language`, which `betmeet-clone` does not currently use per the Bolt 3 investigation) whether:

- A user should be able to have **`Profile.locale = 'es'` (persisted business preference, e.g. for future email/notification-copy language) while the app's UI chrome renders in `en`** because their device is set to English and they never visited Settings — i.e., are the two meant to be **fully independent** rather than unified via one screen as decided in point 3 above?
- Or is unification (one screen, one user action, both change together) the actually-correct UX, as this ADR currently decides?

**This ADR's Decision (unification via the existing PROFILE-3 screen) is the working assumption for Bolt 9's Design stage**, chosen because it is the simpler mechanism and avoids a second, unexplained "why are these different" setting confusing users. It must be explicitly re-confirmed (not silently carried forward) at Bolt 9's Design stage, with the user, before Implement — if the user disagrees, only point 3 changes (the unification wiring); points 1, 2, and 4's fallback ordering are unaffected.

---

## Consequences

- No change to `Profile.locale`'s persisted default, its backend contract, or `betmeet-clone` parity (ADR-012 stands as originally written).
- `react-native-localize` is a new native dependency, additive to Bolt 9's scope; must be added to every MF `shared` singleton list if any remote ever needs to read the active language directly (to be confirmed at Design stage — likely yes, since `pools` renders user-facing strings too).
- `change-locale-screen.tsx` (Bolt 3) gains a small additive responsibility (call `i18n.changeLanguage(...)` alongside its existing persist-to-backend call) rather than being rewritten.
- If the open question above resolves toward "fully independent," this ADR's point 3 is superseded by a follow-up ADR at that time — not silently reworked without a record.
