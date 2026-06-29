# AUTH-2 — Google OAuth sign-in with deep-link continuation

**Unit:** `unit-01-auth` · **Placement:** Host

## Story

As a user, I want to sign in with my Google account, so that I don't need to create a separate password.

## Source rules

`domain-overview.md §5.1` (Google OAuth auto-links to an existing email); `migration-analysis.md` row on PKCE/token_hash → deep links (the web app's browser-redirect OAuth dance has no direct mobile equivalent — needs its own design, not a port).

## Acceptance criteria

- The user can start Google sign-in from the sign-in/sign-up screen; the OS-level OAuth flow (system browser or native Google sign-in, per whatever Construction selects) returns control to the app via a deep link / Universal Link.
- If the Google account's email matches an existing (non-Google) account, the accounts are linked automatically — the user is not asked to "choose" or create a duplicate account.
- A Google-sourced avatar photo populates the profile's avatar **unless** the user has since set a custom upload (this rule is owned by `unit-02-profile`'s avatar-source state machine, but AUTH-2 is responsible for passing the Google profile photo URL through on first OAuth sign-in).
- Failure/cancellation of the OAuth flow returns the user to sign-in with a non-blocking error, not a crash or dead-end screen.

## Out of scope

- Avatar-source state machine itself (`unit-02-profile`).

## Dependencies

- Deep link scheme (`betmeet://` + Universal/App Links) must be registered before this story can be verified end-to-end.
- AUTH-7 (navigation guard) for post-OAuth routing.
