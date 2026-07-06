# Audit Trail

> Append-only. Raw user requests, checkpoint decisions, and anything skipped/deferred. Never rewrite past entries.

## 2026-07-03 — Change request during Bolt 8 Layer 2 (Construction paused for evaluation)

**Raw request (translated from Spanish):** "Improve the app's UI. Right now everything lives on the Home screen — each module should be moved into a bottom tab navigator and separated out. Also, there are screens missing an iOS back button. Overall the UI is too simple/plain and needs real visual design applied."

**Follow-up additions (same request, same session):**
1. Settings should be reached via a hamburger menu, not a bottom-tab item.
2. Multi-language support (Spanish/English), auto-detected from device OS locale, defaulting to Spanish when undetected/unsupported.

**Evaluation outcome (evaluation-only pass, no code written, Construction remains paused):**
- Bottom tab navigator + module separation + hamburger-menu-for-Settings → classified **Architectural Change** (navigation topology). Confirmed real gap: `Home`/`Predictions`/`Pools` are separate stack-push routes off `Home` (`screen-registry.ts`), not a persistent tab bar — matches user's "everything lives in Home" perception. Not a `betmeet-clone` port gap (web app uses a top nav / sheet drawer; bottom tabs is a mobile-native pattern).
- Missing iOS back buttons → classified **Omitted Requirement / defect**. Confirmed: `root-navigator.tsx` registers `Pools` (line 179) and `Settings` (line 184) with `headerShown: false` and no custom header, so no back affordance is rendered on iOS for those pushed screens.
- i18n (es/en, device-detected, default es) → classified **New Requirement**, with a direct conflict against existing **ADR-012** ("locale defaults to `es` regardless of device language") — ADR-012 covers the profile-stored preference (PROFILE-3 wizard step, server-authoritative), not device-detected UI string translation. No i18n library exists in the repo (`tech-stack.md` has no i18n entry; no `react-i18next`/`react-native-localize`/equivalent found). Reconciling stored-preference vs. device-detected UI language requires a fresh ADR before Construction touches it.
- "General visual design polish" → too unspecified to action; flagged as a placeholder New Requirement pending a design-system decision (tokens/library) from the user.
- No file other than this audit entry was modified. `requirements.md`, `system-context.md`, `tech-stack.md`, and `bolt-plan.md` are flagged as needing updates but were **not** edited — pending user approval to resume a short Inception cycle for this change.
- Bolts flagged for re-read/rework once approved: 0 (nav ADR), 1 (`AuthGatedNavigator` screen-tree assumption), 3 (ADR-012 conflict), 5, 6, 7, 8 (hardcoded strings, Home-hub assumption, missing back headers).
- Construction (Bolt 9 or any bolt) was **not** resumed pending explicit user approval of the plan below.

## 2026-07-03 — User approved the change; technical decisions made; Memory Bank formalized (still no code, Construction still paused)

**User approval + decisions (relayed by the coordinator agent):** approved proceeding with the change evaluated above, and made the three previously-open technical decisions:
- Navigation library: **React Navigation 7** — extends the already-adopted `@react-navigation/native`/`native-stack` (ADR-003) with `@react-navigation/bottom-tabs` (tabs) + `@react-navigation/drawer` (Settings).
- i18n stack: **i18next + react-i18next + react-native-localize** (device-locale detection, es/en, default es).
- UI/design system: **Tamagui**, with plain `StyleSheet` remaining acceptable for simple/one-off cases.

**Memory Bank artifacts formalized (Inception-conventions mini-cycle, no application code written, Bolt 9 not started):**
- `memory-bank/intents/liga-mundial-mobile-migration/requirements.md` — new §10 (5 new requirements NFR-10.1–10.5, sourced to the user's request/follow-ups, plus the 3 binding tech decisions above).
- `memory-bank/intents/liga-mundial-mobile-migration/system-context.md` — new §7 addendum clarifying the tab/drawer navigation-shell change does not alter Module Federation host/remote boundaries (§4).
- `memory-bank/intents/liga-mundial-mobile-migration/bolt-plan.md` — new **Bolt 9** ("Navigation, i18n & Design Retrofit") inserted after Bolt 8; old Bolts 9–12 renumbered to 10–13 (scope unchanged, each gained a Bolt-9 dependency); sequencing diagram and risk-register table updated to match.
- `memory-bank/standards/tech-stack.md` — Navigation/State/i18n/UI-design-system/Package-manager entries filled in (previously blank/TBD); Federation-boundaries section updated with the pending Bolt-9 MF-shared-singleton additions.
- `memory-bank/bolts/bolt-9-navigation-i18n-design-retrofit/adr-041-device-i18n-vs-profile-locale-preference.md` — new ADR reconciling ADR-012 (profile-stored `Profile.locale`, business data) against the new device-detected `i18next` UI language. Decision: device detection governs only the first launch before any explicit choice; an explicit choice in the existing PROFILE-3 `change-locale-screen.tsx` thereafter drives both. **One open question explicitly flagged, not guessed** (full independence vs. unification) — to be re-confirmed with the user at Bolt 9's own Design stage before Implement.
- `memory-bank/progress.md` — Bolts table renumbered to match `bolt-plan.md`; "Bolts Completed" line updated to reflect 14 total bolts.

**Construction remains paused.** Bolt 9 has not been started; no application code was written in this pass.
