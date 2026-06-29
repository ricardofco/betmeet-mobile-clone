# POOLS-3 — Directed invites by nickname or email

**Unit:** `unit-06-pools` · **Placement:** Remote

## Story

As a league member, I want to invite a specific person by their nickname or email, so that they're notified directly instead of relying on sharing a link.

## Source rules

`domain-overview.md §5.3`: the owner can always invite; in a public league any member can invite; in a private league members can invite only if `membersCanInvite` is enabled; targeting by `base#discriminator` nickname or by email.

## Acceptance criteria

- The invite-permission rule is enforced exactly as specified above — a private league with `membersCanInvite` off shows the invite action as unavailable (with an explanatory message) to non-owner members.
- Inviting by nickname requires the exact `base#discriminator` format; inviting by email accepts any valid email, matched or not to an existing account.
- Sending a directed invite triggers a `POOL_INVITE` notification event (owned by `unit-08-notifications` — this story only triggers it, doesn't implement delivery).
- A user cannot invite themselves (clear validation error, not a silent no-op).

## Dependencies

- `unit-08-notifications` (event consumer).
- Backend directed-invite contract.
