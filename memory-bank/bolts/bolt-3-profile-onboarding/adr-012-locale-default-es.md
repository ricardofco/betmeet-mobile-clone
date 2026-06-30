# ADR-012 — Locale Defaults to `es` Regardless of Device Language

**Date:** 2026-06-30
**Status:** Accepted
**Bolt:** 3 — Profile & Onboarding

---

## Context

PROFILE-3's AC requires this be a recorded, explicit Construction-stage decision, not silently inferred: "A first-time user's locale defaults to `es` regardless of device language, unless Construction decides otherwise as an explicit, recorded UX call (not silently inferred from `domain-overview.md`, which only documents the web app's own default)."

`domain-overview.md §2` documents the web app's own default as `es`, with `en` available, explicit-user-choice-always-wins. That document is silent on whether the web app's default is itself device-language-aware or hardcoded — it only states the *outcome* (`es` default).

Two options were considered for the mobile client:
- **Option A** — Match the web app exactly: hardcode `es` as the first-time default, irrespective of the device's OS-reported locale (`Intl.DateTimeFormat().resolvedOptions().locale` or RN's `NativeModules.SettingsManager`/`I18nManager`).
- **Option B** — Detect device locale; default to `en` if the device reports an English-family locale, `es` otherwise (or some other device-aware heuristic).

---

## Decision

**Option A.** First-time users default to `es`, full stop, regardless of device language. This mirrors the real web app's behavior 1:1 (the migration's general posture per `requirements.md` is "mirror the source app's behavior unless a binding requirement says otherwise" — there is no requirement here that says otherwise).

Implementation: `DEFAULT_LOCALE: AppLocale = 'es'` (model.md §2.6) is a hardcoded constant, never derived from `Localization`/`I18nManager`/any device API. The locale-store's rehydration logic (design.md §4) falls back to this constant only when there is no locally-persisted value *and* no backend-synced value yet — i.e., strictly on first launch for a brand-new profile.

---

## Consequences

- No device-locale-detection code is written in this bolt — simpler, and avoids a class of "works differently on a Spanish-region device vs. an English-region device" bug reports that Option B would introduce.
- A non-Spanish-speaking user must explicitly switch to `en` once (Settings, PROFILE-3) — this is a deliberate product parity choice with the web app, not an oversight. If user research later shows this hurts onboarding for non-Spanish markets, this ADR is the record to revisit, and the fix is constrained to `DEFAULT_LOCALE`'s initialization site (one constant), not a wizard or Settings rewrite.
- Consistent with `isSupportedLocale`'s narrow scope (`model.md §2.6`) — only `'es' | 'en'` are ever valid, so there's no third "device default" code path to maintain.
