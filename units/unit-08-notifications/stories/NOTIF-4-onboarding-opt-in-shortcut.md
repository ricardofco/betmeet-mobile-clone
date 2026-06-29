# NOTIF-4 — Onboarding "opt into everything" shortcut

**Unit:** `unit-08-notifications` · **Placement:** Host (invoked from the host-bundle onboarding wizard)

## Story

As a new user finishing onboarding, I want a single tap to enable notifications rather than configuring five separate toggles, so that the setup stays fast.

## Source rules

`domain-overview.md §4.4`: "Completing the `notifications` step ... opts the user into **all 5 notification types at once** — this is different from Settings' granular per-type switches, and is a deliberate UX shortcut, not a bug."

## Acceptance criteria

- Accepting the notifications step during onboarding (vs. skipping it) does two things in one action: grants OS push permission (NOTIF-1) and sets all 5 preference flags to true.
- Skipping this onboarding step leaves all 5 preferences at their default (off) and does not request OS permission — the user can still do both individually later from Settings (NOTIF-2).
- This shortcut behavior is documented as deliberate in-code (not just in this spec) so a future engineer doesn't "fix" it into matching Settings' granular behavior.

## Dependencies

- `unit-02-profile` PROFILE-4 (the onboarding wizard step that invokes this).
- NOTIF-1, NOTIF-2.
