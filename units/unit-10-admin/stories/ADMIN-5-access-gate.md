# ADMIN-5 — Admin-only access gate

**Unit:** `unit-10-admin` · **Placement:** Remote (gate check itself coordinates with `unit-01-auth`'s host-bundle session/claims)

## Story

As the app, I need to ensure only users with admin status can reach or act on any screen in this unit, so that match overrides and sync triggers can't be abused.

## Source rules

`domain-overview.md §4.3`/`§5.7`: `verificationStatus === "ADMIN"` is the sole gate, set only by an out-of-band operator script — never by in-app code on either platform; the web app enforces this with both a route-level check and a server-side check on every action ("defense in depth").

## Acceptance criteria

- A non-admin user cannot navigate to any admin screen through any in-app path (no link/button is even shown, and direct navigation — e.g. a stale deep link — is redirected away with no error leak about why).
- Every admin action (ADMIN-2/3/4) is also re-checked server-side regardless of what the client UI allowed — this story's mobile-side responsibility is the UI-level gate; the server-side check is assumed to exist per the backend contract and should be verified, not just trusted, during testing.
- There is no in-app affordance to grant or request admin status — it remains a fully out-of-band operation.

## Dependencies

- `unit-01-auth` (session/claims the gate reads).
