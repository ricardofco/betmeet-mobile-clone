# AUTH-6 — Account deletion

**Unit:** `unit-01-auth` · **Placement:** Host

## Story

As a user, I want to permanently delete my account, so that my data and access are removed when I no longer want to use the app.

## Source rules

`domain-overview.md §5.1`: deletion is a two-step, irreversible workflow — (1) resolve owned leagues (reassign ownership to another member, or delete the league outright if no other members exist — a league with other members and no chosen successor blocks deletion until resolved), (2) soft-delete the profile (nickname released) **and** hard-delete the underlying auth user; a soft-deleted account can never sign in again, checked at sign-in, at OAuth callback, and via the session-claim check on every request (AUTH-7).

## Acceptance criteria

- Before deletion can proceed, the user is shown every league they own that has other members, and must choose a successor owner for each (or the league is deleted if it has no other members) — this step is fulfilled via `unit-06-pools`'s ownership-transfer capability, surfaced inline in this flow.
- Deletion cannot be confirmed while any owned multi-member league lacks a chosen successor.
- On confirmation, the account is irreversibly deleted: the user is signed out and cannot sign back in with the same credentials (verified by attempting sign-in immediately after — must fail the same way a soft-deleted "zombie" account does, per AUTH-7's `account_deleted` claim check).

## Out of scope

- The pool-ownership-transfer UI/logic itself, beyond surfacing it here — owned by `unit-06-pools`.

## Dependencies

- `unit-06-pools` (ownership transfer).
- AUTH-7 (post-deletion sign-in must be blocked by the same gate that blocks any soft-deleted account).
