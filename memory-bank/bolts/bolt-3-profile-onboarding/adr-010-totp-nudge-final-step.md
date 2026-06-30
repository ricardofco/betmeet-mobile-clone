# ADR-010 — Onboarding's Final Step: TOTP-Enrollment Nudge (Passkey Step Replacement)

**Date:** 2026-06-30
**Status:** Accepted
**Bolt:** 3 — Profile & Onboarding

---

## Context

`domain-overview.md §4.4` (the web app's own state machine, source-of-truth for *mechanics* but not necessarily for *content*) lists the onboarding wizard's final step as `passkey` — the web app lets a new user enroll a WebAuthn passkey as the last onboarding action.

`requirements.md §7.5` (binding for this migration) states TOTP-only MFA at launch; native passkeys are explicitly **deferred**, not silently dropped (see also Bolt 2's ADR-009, which designed the `MfaProvider` seam precisely so a future passkey implementation slots in without disturbing existing callers).

There is, therefore, no passkey-enrollment capability available to invoke in this step at all for this migration. `unit-brief.md` flagged this as an open question ("likely: nothing, or a TOTP-enrollment nudge — flagged, not decided here").

---

## Decision

The wizard's final step, `second-factor`, is a **TOTP-enrollment nudge** screen (`OnboardingSecondFactorScreen`):

- Explains MFA's value in 1–2 sentences.
- **"Enable now"** — navigates into the **existing** Bolt 2 `TotpEnrollmentScreen`, reused as-is (not rebuilt, not forked). On successful enrollment, control returns to the wizard's completion flow.
- **"Skip for now"** — calls `markSkipped('second-factor')` directly, same non-blocking semantics as the `rules` and `notifications` steps.

`second-factor` is modeled identically to `rules`/`notifications` in `OnboardingWizardState` (model.md §2.7): `isStepSkippable('second-factor') === true`, `isStepRequired('second-factor') === false`. There is no special-cased "this is the last step, so it can't be skipped" branch — `domain-overview.md §4.4` doesn't carve out such an exception, and PROFILE-4's AC only names `nickname`/`avatar` as required, implying every other step (including the last) is skippable.

Completing the final step — whether `'done'` (enrolled) or `'skipped'` — is the sole trigger for `profile.completeOnboarding` (model.md §2.8).

---

## Consequences

- The wizard shell stays fully generic over its step list: no step-specific completion logic beyond the fixed `ONBOARDING_STEP_ORDER` array. Adding a real `passkey` step later (when Bolt 2's `MfaProvider` seam gets a concrete passkey implementation) is a content change to this one screen, not a wizard-engine change.
- `TotpEnrollmentScreen` is invoked from two distinct entry points now (Settings → AccountSettingsScreen, and Onboarding → OnboardingSecondFactorScreen) with identical behavior — no duplication, per the project's "compose, don't duplicate" rule.
- A user who skips MFA during onboarding can still enable it later from Settings (unchanged Bolt 2 flow) — skipping is never a permanent foreclosure.
- If `requirements.md §7.5`'s passkey deferral is ever lifted, this ADR is the first place to update — the wizard step's *content*, not its *position* or *skippability*, changes.
