# Unit Brief — `unit-10-admin`

> **Intent:** `liga-mundial-mobile-migration` · **Federation placement:** Remote, low priority (requirements.md §7.4 — desktop-dashboard-shaped, infrequent, admin-only audience). **Included in this planning round without exception** per explicit user decision (requirements.md §4) — not deprioritized out of scope, only out of urgency.

## Purpose

Let an admin user (`Profile.verificationStatus === "ADMIN"`) monitor the external data sync, manually correct a match result when the provider is wrong or delayed, and manually trigger a sync.

## Source rules

`domain-overview.md §5.7` (admin override rules), `§7` (admin's dependency on competition/scoring-rankings/scoring), `§4.1` (manual-override freeze on the match status state machine).

## In scope

- Sync dashboard: read-only view of recent `ProviderSyncRun`s and last-success-by-scope status.
- Force a match result: requires both teams assigned; in a tied knockout match a penalty winner is mandatory and must be consistent with any penalty scores supplied (server validates and rejects a mismatch); synchronously re-scores every prediction for that match as part of the same action.
- Revert a match override: clears the manual data (does not restore the provider's original result, which isn't snapshotted) and removes the resulting scores; the match returns to `SCHEDULED` and awaits the next provider sync to repopulate real data.
- Manually trigger a sync (by scope) — runs through the exact same backend orchestration path as the automated scheduler; does not duplicate that orchestration client-side.

## Out of scope

- The sync orchestration/provider-adapter logic itself (entirely server-side, untouched by this migration — `unit-04-competition`'s unit brief covers the read-only consumer side).
- Any admin user-management capability (promoting a user to ADMIN is an out-of-band operator action in the source app and stays that way — not an in-app feature on either platform).

## Dependencies

- **Depends on:** `unit-01-auth` (admin-only access gate, based on `verificationStatus`), `unit-04-competition` (match/team data to display and override), `unit-03-scoring` (validating an admin-entered penalty score against the derived winner), `unit-07-scoring-rankings` (the override synchronously triggers rescoring).
- **Depended on by:** none — admin is a terminal, audience-restricted unit.

## Native modules

None beyond host-bundle peers.

## Backend contract needed

Sync-dashboard reads, force-result, revert-override, manual-sync-trigger, per `system-context.md §3` "Admin" — same authorization gate as today (`verificationStatus === "ADMIN"`, checked server-side regardless of what the client believes).

## Unit-level acceptance criteria

- A non-admin user cannot reach any screen in this unit, under any navigation path (defense in depth: both a route-level gate and a server-side check on every action, mirroring the web app's "page-level + action-level" admin gate).
- Forcing a result for a tied knockout match without a consistent penalty winner is rejected with a clear error before any state changes.
- Reverting an override clearly communicates to the admin that the original provider result is not restored, only cleared, and a future sync is needed to repopulate it.

## Risks

- Lowest build priority of all ten units (per the federation placement and the general "desktop-shaped, admin-only" framing) — the bolt plan should reflect this without dropping it from scope, per the explicit "plan everything" instruction.

## Stories

See `stories/`: ADMIN-1 through ADMIN-5.
