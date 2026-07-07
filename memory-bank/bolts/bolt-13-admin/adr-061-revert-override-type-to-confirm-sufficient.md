# ADR-061 — ADMIN-5's revert-override confirmation: client-side type-the-FIFA-codes, confirmed sufficient by human checkpoint

## Status
Accepted (2026-07-06).

## Context

`model.md §6/§7` establishes revert-override as **the single
highest-blast-radius, least-reversible mutation in the entire bolt plan**:
it deletes every `PredictionScore` row for the reverted match (not zeroed,
not archived), no snapshot of the prior forced result is ever kept in
either app, and — a genuine asymmetry from betmeet-clone specific to this
mobile backend — there is **no sync mechanism that will ever repopulate a
real result afterward** (`ADR-058`'s narrowed scope confirms no such sync
exists in this backend at all). In betmeet-clone, "the next API sync
repopulates the real result"; in this app, a revert here has no guaranteed
path back to a populated result at all short of an admin manually forcing a
new result via ADMIN-4.

`design.md §7` proposed a mobile-only, client-side friction device beyond
what betmeet-clone itself has (its own `revert-override.ts` carries no
confirmation step and no `reason` field): a `revert-confirm-form.tsx` step
requiring the admin to type the two teams' FIFA codes (e.g. `"ARG-FRA"`,
shown directly above the input, no memorization needed) before the Confirm
button enables. This is explicitly **not server-validated** —
`admin.revertMatchOverride`'s body stays exactly `{ matchId }` (ADR-060-style
capability-contract discipline: the server has no meaningful way to check "did
the admin mean it," so this is a UI device, not a security control.

Two options were weighed at Design stage and **explicitly flagged for human
sign-off** rather than assumed settled by the Design pass alone (`design.md`'s
closing checkpoint, item 2):

1. **Type-to-confirm** (as designed) — a reasonable, standard mobile
   friction pattern, proportionate to a client-side UX safeguard.
2. **A Bolt-8-style separate consequence-spelled-out confirm screen**
   (the pattern used for account deletion, `delete-account-screen.tsx`) —
   heavier, arguably better-matched to the "no undo, no fallback" severity
   of this specific mutation, but a materially bigger UI surface for what is,
   mechanically, a two-field mutation.

## Decision

**CONFIRMED by the human checkpoint (2026-07-06)**: option 1, client-side
type-to-confirm, **is sufficient**. A separate Bolt-8-style dedicated
consequence screen is explicitly **not** built for ADMIN-5 in this bolt.

`revert-confirm-form.tsx` ships as designed:
- Shows the match's current forced result, the mandatory `reason` it does
  **not** have (ADMIN-5 has no `reason` field, unlike ADMIN-4 — fidelity to
  betmeet-clone's own `revert-override.ts` shape, which has none either), and
  who/when overrode it.
- An explicit warning line: *"this cannot be undone, no feed will
  repopulate this match."*
- A type-to-confirm `TextInput` (the two teams' FIFA codes) gating the
  Confirm button.

`admin.revertMatchOverride`'s request body remains exactly `{ matchId }` —
no `confirmationText` field is ever sent to or checked by the backend; the
confirmation step is entirely a client-side UX device, and the real, only
authorization boundary remains `requireAdmin()` (ADR-059), unaffected by this
decision either way.

## Consequences

- **This is recorded as a deliberately made product-risk decision, not a
  defaulted one.** A human reviewed the trade-off between the two options
  above, given this mutation's uniquely high blast radius and irreversibility
  in this specific mobile app, and confirmed the lighter mechanism is
  adequate — the same explicit-sign-off discipline this repo already applies
  to genuinely judgment-call-shaped decisions (e.g. Bolt 9's ADR-041 locale
  unification question, resolved by direct user confirmation rather than
  Design-stage default).
- If a future Layer 2 (device) manual test pass, or a real incident,
  surfaces evidence that this level of friction is in practice insufficient
  (e.g. an admin accidentally reverts the wrong match despite the
  type-to-confirm step), this decision should be revisited with a new ADR
  that supersedes this one — not silently patched or re-litigated without a
  record.
- ADMIN-4's mandatory `reason` field and ADMIN-5's type-to-confirm step are
  two **different** confirmation mechanisms for two different mutations —
  this is intentional (`design.md §7`), not an oversight that ADMIN-5 should
  inherit ADMIN-4's `reason` field or vice versa. Any future bolt that adds a
  third admin mutation should choose its own proportionate mechanism rather
  than assuming one of these two is the universal default.
