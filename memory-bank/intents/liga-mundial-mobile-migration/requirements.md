# Requirements — Liga Mundial Mobile Migration

> **Intent ID:** `liga-mundial-mobile-migration`
> **Status:** Checkpoint 2 — pending user approval.
> **AI-DLC phase:** Inception (specs only — no implementation in this intent).

## 1. Problem

"Liga Mundial" exists today only as a Next.js 16 + Supabase + Prisma web app (`betmeet-clone`, sibling repo, not part of this codebase). Users want a native mobile experience (this repo, `betmeet-mobile-clone` — React Native 0.86 + Re.Pack/Rspack) with the same product behavior. This is a **brownfield migration of product behavior**, not of code: the web app is the functional source of truth, but almost none of its implementation mechanisms (Server Actions, Next.js Middleware, cookie sessions, Web Push, MDX rendering) carry over directly to React Native.

## 2. Goal

Specify (Inception only — no code in this intent) everything needed to reconstruct, on iOS and Android, the full set of user-facing capabilities of `betmeet-clone`: identity & onboarding, leagues, predictions, scoring/rankings, notifications, the rules/education center, and the admin dashboard — translated into mobile-native mechanisms, with Module Federation boundaries and native-module needs identified per feature.

## 3. Source of truth (read in full before this document was written; do not re-derive from scratch)

- `memory-bank/project/project-inventory.md` — catalog of the web app's features, routes, Prisma models, Server Actions, services, external integrations, cron jobs.
- `memory-bank/project/domain-overview.md` — business rules, state machines, the exact scoring algorithm, the `proxy.ts` auth-gate state machine, the cross-feature dependency map.
- `memory-bank/project/migration-analysis.md` — mechanism-by-mechanism translation table, per-feature migration risk, the backend-architecture options this intent resolves below.
- `memory-bank/standards/*` — fixed technical constraints for this repo (RN 0.86 New Architecture, Re.Pack/Rspack not Metro, TypeScript 5.8 strict, FlashList for lists, Module Federation v2 not yet scaffolded).

## 4. Scope — all modules included, no exclusions

Per explicit user decision (2026-06-29 — "ahora estamos solo planeando... planeemos TODO"), **every** feature module from the source app is in scope for this Inception round, including `admin`:

| # | Module | One-line scope |
|---|---|---|
| 1 | **auth** | Email/password, Google OAuth, TOTP MFA, account deletion, password/email change, session/onboarding gate |
| 2 | **profile** | Nickname (`base#discriminator`), avatar, locale, onboarding wizard |
| 3 | **pools** (leagues) | Create/join/leave/kick, invite tokens, directed invites, visibility, archive |
| 4 | **competition** | Read-only fixture/team/match data on mobile (the football-data.org sync stays 100% server-side) |
| 5 | **predictions** | Submit/edit predictions, kickoff lock, penalty-winner selector |
| 6 | **scoring** | The deterministic point algorithm — pure logic, reimplemented as mobile's own shared package |
| 7 | **scoring-rankings** | Global/pool leaderboards, live projection during in-progress matches |
| 8 | **notifications** | Preferences, native push subscription/delivery, in-app notification surfaces |
| 9 | **education** | Rules Center content + interactive scoring calculator |
| 10 | **admin** | Sync dashboard, manual result override, manual sync trigger |

This is a planning-only round: inclusion here does not imply all ten ship in the first bolt — sequencing is a bolt-planning concern (§9 / the bolt plan artifact), not a scoping concern.

## 5. Non-goals (explicitly out of scope for this intent)

- **No implementation.** This intent produces specs only (requirements, system-context, unit briefs, stories, bolt plan). No app code, no dependency installation, no Module Federation scaffolding.
- **No platforms beyond iOS + Android.** No tvOS/macOS targets.
- **No real offline support.** `betmeet-clone` has no offline/cache-first behavior (its one service worker exists solely to receive Web Push, not to cache data/assets) — mobile's scope is limited to graceful handling of connectivity loss (error/retry states), not offline reads or writes.
- **No passkeys at launch.** Native platform passkey support (iOS/Android) is deferred to a future phase; TOTP is the only second factor at launch (see §7).
- **No third-party push provider.** FCM/APNs are used directly; OneSignal/Firebase-as-a-service are out of scope (see §7).
- **No fixed performance budget numbers yet.** A general objective (fast startup, small initial bundles) is captured; concrete FPS/TTI/chunk-size targets are deferred to Construction.
- **No state-management or navigation library choice.** These are implementation decisions for Construction, to be recorded as ADRs against `memory-bank/standards/`.
- **No decision on where the future API physically lives** (inside `betmeet-clone` as new Route Handlers vs. a separate service) — that is a backend/web-side decision outside this mobile-side intent's authority; this intent only specifies the contract mobile needs to consume.

## 6. Success metrics (for the migration effort as a whole — refined per-unit in unit briefs)

- Every business rule enumerated in `domain-overview.md §5` (auth/account, profile/nickname, leagues, predictions, scoring, rankings, admin overrides, notifications, competition sync) has a corresponding mobile-side requirement traced to a unit/story — no rule silently dropped or silently "fixed" without a recorded decision (e.g., the known over-broad notification-recipient gap in `domain-overview.md §5.8` must be a deliberate decision, not an accident, when its unit is built).
- The scoring algorithm produces **identical point totals** to the web app for the same inputs — verified by porting the web app's own test cases (`domain-overview.md §5.5`) into the mobile `scoring` package's test suite.
- The kickoff-lock business rule cannot be bypassed by the mobile client, by construction (the same DB-level trigger backstop applies regardless of which client mutates a prediction — see §7's backend-architecture decision).
- Every feature has an explicit Module Federation placement (host or remote) and an explicit native-module dependency list before any unit enters Construction — no feature reaches Construction with this ambiguous.

## 7. Cross-cutting architectural decisions (resolved at this Inception's Checkpoint 1, binding for all units below)

These were raised as open questions in `migration-analysis.md` and resolved directly with the user in this session (not assumed):

### 7.1 Backend architecture
- **Decision:** for everything in `domain-overview.md §5` (nickname/discriminator assignment, pool capacity/invite-token rules, prediction validation, the scoring algorithm's authoritative run, notification dispatch, admin overrides), mobile consumes this logic via an **API contract equivalent to the web app's existing Server Action logic** (Option A from `migration-analysis.md §2`) — not by reimplementing those rules independently against raw Supabase access.
- **Reserved for direct Supabase access from mobile:** the kickoff-lock (already enforced by the `prediction_lock_guard` DB trigger regardless of caller), RLS-scoped reads, and Supabase Auth's own native flows (sign-in/up, OAuth, MFA, session management).
- **Out of this intent's authority:** where that API physically lives (new Route Handlers inside `betmeet-clone`, or a separate service). Units below specify the contract mobile needs; they do not mandate its hosting.

### 7.2 Supabase-access encapsulation (NFR, applies to every unit that touches Supabase)
All mobile-side interaction with Supabase (auth, storage, realtime) **must** go through a single internal adapter/service layer within this repo — never invoked ad hoc from screens/components. This ensures a future change to that external service is a one-place change, not a scattered one. This is a binding architectural constraint for Construction, to be honored regardless of which state/navigation libraries are eventually chosen.

### 7.3 No code dependency between repos
`betmeet-mobile-clone` **must not** import code or packages from `betmeet-clone`. The two repos are independent. Any logic that conceptually "exists in both" — most notably the **scoring algorithm** (`domain-overview.md §5.5`) — is **reimplemented from scratch inside this repo** as its own source of truth (same constants, same algorithm, verified against the same test cases), never imported across repos.

### 7.4 Module Federation placement, per feature

| Feature | Placement | Rationale |
|---|---|---|
| auth | **Host** | Gates all navigation; a remote-chunk download failure must never be able to block login |
| profile (incl. onboarding) | **Host** | `getOnboardedUserId`-equivalent gating is a load-bearing dependency of nearly every other flow |
| **predictions** | **Host** (explicit correction from the default suggestion) | Highest-frequency screen in the product — must not pay an on-demand download cost |
| pools (leagues) | Remote | Cohesive, cohesive dependencies on auth/profile but not a hot-path screen |
| competition (read-only fixture/team data) | Remote or shared | Feeds predictions; sync itself stays server-side |
| scoring-rankings | Remote | Rankings screens are not the app's home |
| notifications | **Split**: permission/token-registration logic in host; preferences screen in remote | Push registration must happen early/reliably; preferences UI is low-frequency |
| education (Rules Center) | Remote | Static, low-frequency content — ideal for deferred download |
| admin | Remote (low priority) | Desktop-dashboard-shaped, infrequent, admin-only audience |
| **scoring** | **Not a routed chunk** — a pure shared library | Must be a single source of truth importable by host and every remote, so point math can never diverge between them. Exact packaging mechanism (Module Federation shared singleton vs. an internal workspace package) is a **Construction/ADR decision**, not fixed here. |

Full host/remote topology diagram and shared-dependency list go in `system-context.md` (next artifact).

### 7.5 Native modules required

| Capability | Feature(s) | Decision |
|---|---|---|
| Second factor | auth | **TOTP only at launch.** Native passkeys (iOS `ASAuthorizationPlatformPublicKeyCredentialProvider` / Android Credential Manager) are **deferred** — explicitly flagged for re-evaluation in a future phase, not silently dropped. |
| Push notifications | notifications | **FCM (Android) + APNs (iOS), direct — no OneSignal/Firebase-as-a-service.** Confirmed after verifying `betmeet-clone` has no existing native-push infrastructure to reuse (it uses browser-only Web Push + VAPID) and that the web team already chose the no-third-party path for the same reasons. |
| Secure session/token storage | auth | `react-native-keychain` |
| Avatar file picker | profile | `react-native-image-picker` |
| SVG rendering (TOTP QR code; possibly team flags) | auth, competition | `react-native-svg` |
| Deep linking (email confirmation, league invites) | auth, pools | Custom scheme `betmeet://` **plus** Universal Links (iOS) / App Links (Android) — both mechanisms, not just the custom scheme |

A feature requiring a native module cannot be a pure-JS remote chunk loaded purely over the wire without the corresponding native code already present in the shipped binary — this constraint is carried into each affected unit brief.

### 7.6 Platforms & non-functional scope
- iOS + Android only.
- No offline support (see §5).
- Performance: general objective only ("optimize startup time, keep initial bundles small"); no fixed numeric budget at this stage.

## 8. Open items explicitly deferred to Construction (not decided here, do not re-litigate at Inception)

- State management library choice.
- Navigation library choice.
- Exact `scoring` packaging mechanism (Module Federation shared singleton vs. internal workspace package).
- Concrete performance budget numbers (target FPS beyond the already-fixed 60, TTI in ms, per-chunk KB ceilings).
- Physical hosting location of the API contract mobile depends on (§7.1).

## 9. Next steps in this Inception

Per the auto-continue rule: once this `requirements.md` is approved at Checkpoint 2, the following are produced **without further pauses** until Checkpoint 3 (artifacts review):
1. `system-context.md` (external systems, the API contract mobile depends on, full Module Federation host/remote topology and shared-dependency list).
2. `units/{unit-id}/unit-brief.md` for each of the 10 modules in §4.
3. `stories/` under each unit.
4. A bolt plan (sequencing/grouping of stories, risk-flagged per bolt).
