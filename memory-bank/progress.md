# Progress

> **Agent note:** This is your long-term progress tracker. Update it whenever you complete a Bolt, close a phase, or reach a major milestone.

## Overall Status
- **Current Phase:** Inception — artifacts drafted for intent `liga-mundial-mobile-migration`, awaiting Checkpoint 3 (combined review) and Checkpoint 4 (Construction handoff decision). No code written yet.
- **Bolts Completed:** 0 / 13 (Bolt 0 through Bolt 12, all planned, none started)

## Milestones Achieved
- [x] Memory Bank and standards initialized
- [x] Domain knowledge enriched: `memory-bank/project/project-inventory.md`, `domain-overview.md`, `migration-analysis.md` (full analysis of `betmeet-clone`, the functional source of truth)
- [x] First intent captured (`/aidlc-inception`) — `memory-bank/intents/liga-mundial-mobile-migration/requirements.md` approved at Checkpoint 2
- [x] `system-context.md` drafted, incl. Module Federation host/remote topology (pending Checkpoint 3 approval alongside the rest)
- [x] All 10 unit briefs + 47 stories drafted under `units/unit-01-auth/` … `units/unit-10-admin/` (pending Checkpoint 3)
- [x] Bolt plan drafted — `memory-bank/intents/liga-mundial-mobile-migration/bolt-plan.md` (13 bolts, pending Checkpoint 3)
- [ ] Module Federation host/remote topology scaffolded (`/repack-init`) — this is Bolt 0's deliverable, not yet started
- [x] Checkpoint 3 (combined artifacts review) approved by user
- [ ] Checkpoint 4 (Construction handoff) confirmed

## Bolts (Execution Units — planned, not started)

| Bolt | Scope | Depends on | Risk |
|---|---|---|---|
| 0 | Platform scaffolding (Module Federation, Supabase adapter, Backend-API client skeleton) | — | Medium |
| 1 | Auth core (sign-in/up, navigation guard, secure session storage) | Bolt 0 | High |
| 2 | Auth secondary flows (OAuth, MFA, password reset, change password/email) | Bolt 1 | Medium-High |
| 3 | Profile & onboarding wizard | Bolt 1 | Medium |
| 4 | Scoring package *(parallelizable with 1–3)* | Bolt 0 | Low |
| 5 | Competition read model (fixtures, live updates, team/flag data) | Bolt 1 | Low-Medium |
| 6 | Predictions core | Bolt 3, 4, 5 | Medium |
| 7 | Pools core | Bolt 3 | Low-Medium |
| 8 | Pools advanced + predictions↔pools integration + account deletion | Bolt 6, 7 | Medium-High |
| 9 | Scoring & rankings | Bolt 6, 8 | Medium |
| 10 | Notifications (native push) | Bolt 1, 3 + FCM/APNs infra setup | High |
| 11 | Education (Rules Center) | Bolt 3, 4 | Low |
| 12 | Admin | Bolt 5, 9 | Low-Medium |

Full detail, sequencing diagram, and risk rollup: `memory-bank/intents/liga-mundial-mobile-migration/bolt-plan.md`.

## Deferred or Blocked Tasks
- Resolve dual lockfiles (`yarn.lock` vs `package-lock.json`) — see `memory-bank/activeContext.md`.
- Remove or repurpose `metro.config.js` once Re.Pack is confirmed as the sole bundler.
- Set real iOS bundle identifier and app display name before release.
- State management and navigation library choices — deferred to Construction ADRs (Bolt 0).
- Exact `scoring` packaging mechanism (MF shared singleton vs. internal workspace package) — deferred to Construction ADR (Bolt 4).
- Push-SDK choice (Expo Notifications vs. direct FCM/APNs SDKs) and FCM/APNs project/certificate setup — must be resolved before Bolt 10 opens, not mid-bolt.
- Where the backend API contract mobile depends on physically lives (inside `betmeet-clone` vs. a separate service) — out of this repo's authority; needed before any bolt that calls it can integrate end-to-end.
