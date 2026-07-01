# ADR-028: Backend built in phases, Phase 1 = auth hook + core mutation API + seeded competition data

## Status
Accepted (2026-07-01).

## Context
The user wants a fully independent backend (auth hook, all Server-Action-equivalent mutations, football-data.org sync, scoring, cron, native push dispatch) — but the immediate, stated blocker is "no puedo hacer pruebas manuales sin el backend." Building the entire surface before anything is testable would delay that goal further, not serve it.

## Decision
Build in four phases, each independently shippable:

- **Phase 1 (this bolt)**: port the Access Token Hook (ADR-027); Prisma schema for `Profile`, `Pool`/`PoolMembership`/`PoolDirectedInvite`, `Competition`/`CompetitionPhase`/`Team`/`Match`, `Prediction`, `EmailActionThrottle`, `AvatarAsset`, `NotificationPreference`; capability handlers for exactly what mobile already calls today (`auth.resendConfirmation`, `profile.*`, `competition.getFixture`/`getKnockoutPhaseIds`, `predictions.getMyPredictions`/`save`); a manual seed script for competition/team/match data (no live provider sync yet). This alone unblocks Layer 2 testing for Bolts 1, 2, 3, 5, 6.
- **Phase 2 (later)**: admin overrides (`forceMatchResult`, `revertMatchOverride`), gated on `Profile.verificationStatus = 'ADMIN'` — mirrors `betmeet-clone`'s `getAdminUserId()` pattern exactly.
- **Phase 3 (later)**: football-data.org sync orchestration + official scoring write (`PredictionScore`) + a scheduler. Not `pg_cron`/`pg_net` — see ADR-029.
- **Phase 4 (later)**: notification dispatch — necessarily new code regardless of hosting decision, since mobile needs FCM/APNs, not `betmeet-clone`'s Web Push. This is the same "push-SDK choice" blocker already flagged in `progress.md` before Bolt 10; Phase 4 resolves it as part of backend work rather than waiting for Bolt 10 to start.

Mobile's own client-side scoring/score-breakdown logic (Bolt 4/6, `computeScore()`, `buildScoreBreakdown()`) already works from `Match`'s final score fields without needing a server-computed `PredictionScore` row — so Phase 1 deliberately does **not** need scoring or `PredictionScore` to unblock predictions testing.

## Consequences
- Pools capabilities (`pools.*`) are **not** in Phase 1 — no `pools-api.ts` exists on the mobile side yet (Bolt 7 not started), so there is nothing to satisfy yet. The `Pool`/`PoolMembership`/`PoolDirectedInvite` tables are still defined now (schema is cheap to write once) so Bolt 7's future capability handlers don't need a schema migration of their own.
- Match data is **manually seeded**, not synced from football-data.org, until Phase 3. Scores/status must be advanced manually (e.g. via Prisma Studio or a small script) to exercise kickoff-lock/live-update paths during Layer 2 testing until then.
- Admin overrides (Phase 2) are required before Phase 3's scoring can be exercised end-to-end without a real provider feed.
