# Unit Brief — `unit-05-predictions`

> **Intent:** `liga-mundial-mobile-migration` · **Federation placement:** **Host bundle** (explicit correction, requirements.md §7.4 — highest-frequency screen in the product, must not pay an on-demand remote-download cost).

## Purpose

Let a user submit and edit score predictions for matches (globally and per-league), enforce the kickoff-based editing lock, and handle the penalty-winner selector for tied knockout matches.

## Source rules

`domain-overview.md §4.2` (the kickoff-lock state machine, verbatim), `§5.4` (prediction validation rules), `§7` (dependency map: predictions depends on profile for onboarding-gating, on competition for fixture data, on scoring-rankings for resolved points display).

## In scope

- Submitting/editing a global prediction (home/away score, 0–20 each) for any `SCHEDULED` match before kickoff.
- The penalty-winner selector: required when knockout + tied, forbidden otherwise; winner must be one of the two match teams; the server is the final authority regardless of what the client renders.
- Pool-scoped prediction overrides, including the "save as global too" dual-save behavior.
- Resetting a pool-scoped override back to the global prediction.
- Read-only display of resolved points/status once a match is scored (delegates the actual computation to `unit-07-scoring-rankings`'s backend contract, displays via `unit-03-scoring`'s shared algorithm for any client-side preview needs).
- A client-side countdown/lock-state indicator that flips a match to read-only at kickoff — understood as a **UX courtesy only**; the server re-validates eligibility with its own clock on every save attempt regardless of what the client believes.

## Out of scope

- The scoring algorithm itself (`unit-03-scoring`).
- Persisting/computing the authoritative score (`unit-07-scoring-rankings`'s backend contract).
- Fixture/team data fetching (`unit-04-competition` — this unit consumes it).

## Dependencies

- **Depends on:** `unit-01-auth` (session), `unit-02-profile` (must be onboarded — mirrors the web app's `getOnboardedUserId` gate on every save), `unit-04-competition` (match/team data, kickoff time, phase type), `unit-03-scoring` (any client-side point preview), `unit-06-pools` (pool membership check for pool-scoped saves).
- **Depended on by:** `unit-07-scoring-rankings` (reads predictions in ranking/leaderboard context, though that's server-side).

## Native modules

None beyond what's already required by host-bundle peers (auth/profile).

## Backend contract needed

Save/reset-override/eligibility-check/validation per `system-context.md §3` "Predictions". The 0–20 score bound and the kickoff lock are also enforced at the database level (a trigger + CHECK constraint) regardless of caller — this unit's client-side validation is a UX layer, not the sole line of defense.

## Unit-level acceptance criteria

- A prediction cannot be saved or edited once its match's kickoff time has passed, the match status is anything other than `SCHEDULED`, or either team is unassigned — and the **server's** decision is authoritative even if the client's local clock disagrees.
- The penalty-winner selector appears exactly when required (knockout + tied) and never otherwise; a server-side mismatch (e.g. stale client state) is surfaced as a clear error, not a silent failure.
- A pool-scoped override and a "save as global too" dual-save either both succeed or both fail (no partial-write state visible to the user).

## Risks

- This is the highest-traffic screen in the app (per the federation-placement override) — any added native-module dependency here has an outsized startup-bundle-size impact; Construction should be conservative about what this unit pulls in directly vs. what it can lazily defer.

## Stories

See `stories/`: PREDICTIONS-1 through PREDICTIONS-5.
