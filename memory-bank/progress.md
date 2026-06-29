# Progress

> **Agent note:** This is your long-term progress tracker. Update it whenever you complete a Bolt, close a phase, or reach a major milestone.

## Overall Status
- **Current Phase:** Construction — **Bolt 0 (platform scaffolding) closed.** Bolt 1 (Auth core) is next, to be started in a separate session.
- **Bolts Completed:** 1 / 13 (Bolt 0: Model/Design/ADR/Implement/Test all done — Layer 1 green, Layer 2 happy-path verified on a real iOS Simulator — see `memory-bank/bolts/bolt-0-platform-scaffolding/`)

## Milestones Achieved
- [x] Memory Bank and standards initialized
- [x] Domain knowledge enriched: `memory-bank/project/project-inventory.md`, `domain-overview.md`, `migration-analysis.md` (full analysis of `betmeet-clone`, the functional source of truth)
- [x] First intent captured (`/aidlc-inception`) — `memory-bank/intents/liga-mundial-mobile-migration/requirements.md` approved at Checkpoint 2
- [x] `system-context.md` drafted, incl. Module Federation host/remote topology
- [x] All 10 unit briefs + 47 stories drafted under `units/unit-01-auth/` … `units/unit-10-admin/`
- [x] Bolt plan drafted — `memory-bank/intents/liga-mundial-mobile-migration/bolt-plan.md` (13 bolts)
- [x] Checkpoint 3 (combined artifacts review) approved by user
- [x] Checkpoint 4 (Construction handoff) confirmed — Construction started on Bolt 0
- [x] Module Federation host/remote topology scaffolded — host (`rspack.config.mjs`) + one example remote `education` (`rspack.config.education-remote.mjs`), per ADR-002
- [x] Bolt 0 Layer 2 (device-level) verification — happy path confirmed on a real iOS Simulator (host launches, `education` remote loads on demand). Fallback-path proof (remote dev server killed mid-session) and an Android run are still open, non-blocking — see `implement-and-test.md`.

## Bolts (Execution Units)

| Bolt | Scope | Depends on | Risk | Status |
|---|---|---|---|---|
| 0 | Platform scaffolding (Module Federation, Supabase adapter, Backend-API client skeleton) | — | Medium | **Done** (Layer 1 ✅, Layer 2 happy-path ✅) |
| 1 | Auth core (sign-in/up, navigation guard, secure session storage) | Bolt 0 | High | Not started — to be started in a separate session |
| 2 | Auth secondary flows (OAuth, MFA, password reset, change password/email) | Bolt 1 | Medium-High | Not started |
| 3 | Profile & onboarding wizard | Bolt 1 | Medium | Not started |
| 4 | Scoring package *(parallelizable with 1–3)* | Bolt 0 | Low | Not started |
| 5 | Competition read model (fixtures, live updates, team/flag data) | Bolt 1 | Low-Medium | Not started |
| 6 | Predictions core | Bolt 3, 4, 5 | Medium | Not started |
| 7 | Pools core | Bolt 3 | Low-Medium | Not started |
| 8 | Pools advanced + predictions↔pools integration + account deletion | Bolt 6, 7 | Medium-High | Not started |
| 9 | Scoring & rankings | Bolt 6, 8 | Medium | Not started |
| 10 | Notifications (native push) | Bolt 1, 3 + FCM/APNs infra setup | High | Not started |
| 11 | Education (Rules Center) | Bolt 3, 4 | Low | Not started |
| 12 | Admin | Bolt 5, 9 | Low-Medium | Not started |

Full detail, sequencing diagram, and risk rollup: `memory-bank/intents/liga-mundial-mobile-migration/bolt-plan.md`.

## Deferred or Blocked Tasks
- ~~Resolve dual lockfiles~~ — **done in Bolt 0** (Yarn only).
- Remove or repurpose `metro.config.js` once Re.Pack is confirmed as the sole bundler (now provably dead, not yet deleted).
- Set real iOS bundle identifier and app display name before release.
- Bolt 0's Layer 2: fallback-path proof (kill the remote's dev server mid-session, confirm `RemoteBoundary`'s retry UI instead of a crash) and an Android Simulator/Emulator run — not yet done, non-blocking (see `memory-bank/bolts/bolt-0-platform-scaffolding/implement-and-test.md`).
- Real env-var injection for `SUPABASE_URL`/`SUPABASE_ANON_KEY`/`BACKEND_API_BASE_URL` — `src/platform/*/config.ts` currently throw a clear error until this is wired; unit-01-auth's bolt is expected to resolve it.
- Push-SDK choice (Expo Notifications vs. direct FCM/APNs SDKs) and FCM/APNs project/certificate setup — must be resolved before Bolt 10 opens, not mid-bolt.
- Where the backend API contract mobile depends on physically lives (inside `betmeet-clone` vs. a separate service) — out of this repo's authority; needed before any bolt that calls it can integrate end-to-end.
- Repo's HEAD is detached at the initial commit (not on a branch) — pre-existing, unrelated to Bolt 0, flagged for whenever commits are made.
