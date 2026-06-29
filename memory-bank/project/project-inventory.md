# Project Inventory — `betmeet-clone` (Source of Truth)

> **Agent note:** This is a factual catalog of what exists in `betmeet-clone` (the web app, sibling repo at `../betmeet-clone`), produced for the brownfield migration to this React Native app. It is a snapshot taken 2026-06-26. Re-verify against the source repo before relying on specifics (file paths, line numbers, exact counts) if this file feels stale — see `migration-analysis.md` for translation guidance and `domain-overview.md` for the business/domain model extracted from this inventory.

## 1. What it is

"Liga Mundial" — a sports-prediction SaaS for the FIFA World Cup 2026. Users register, join leagues ("Pools" in code, "Ligas" in product copy), predict match results, and compete on deterministic-scoring rankings.

## 2. Tech stack (source app)

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router only — Server Components + Server Actions) |
| Language | TypeScript 6 |
| Package manager | pnpm |
| Styling | Tailwind CSS v4 (CSS-first, no `tailwind.config.*`) |
| UI kit | shadcn/ui (`@base-ui/react`) + class-variance-authority + tailwind-merge + lucide-react + sonner (toasts) |
| Forms | react-hook-form + `@hookform/resolvers` + zod |
| Database | PostgreSQL 18 (Supabase cloud; local Docker for dev) |
| ORM | Prisma 7 (`@prisma/client`, `@prisma/adapter-pg`) — client generated to `src/generated/prisma` |
| Auth | Supabase Auth — email/password, Google OAuth, MFA (TOTP), Passkeys (beta, WebAuthn) |
| Sessions | `@supabase/ssr` (cookie-based, no client-side token storage) |
| Storage | Supabase Storage (avatars bucket) |
| Content | Content Collections (MDX) for the Rules Center |
| External data | football-data.org (adapter pattern, replaced an earlier `API-Football` integration) |
| Push | Standard Web Push + VAPID (`web-push` npm package) — **not** OneSignal/FCM |
| Email | Supabase Auth built-in SMTP, configured against Resend; Mailpit traps email in local dev |
| Realtime | Supabase Realtime **Broadcast** (signal-only, not a payload channel) |
| Scheduling | Supabase `pg_cron` + `pg_net` → HTTP POST to Next.js API routes |
| Hosting | Vercel (serverless, region `iad1`, Fluid Compute enabled) |
| Testing | Vitest (unit), Playwright (e2e) |
| Lint/format | Biome (format+lint), ESLint 9 (flat config) |
| Git hooks | Lefthook + Commitlint (gitmoji convention) |

## 3. Repository structure (relevant to domain/migration)

```
betmeet-clone/
├── prisma/
│   ├── schema.prisma            # single source of truth for the data model (474 lines, 16 tables)
│   ├── migrations/               # versioned Prisma migrations (baseline + RLS/triggers/hooks)
│   └── seed.ts
├── src/
│   ├── app/                      # App Router: pages, layouts, API routes
│   │   ├── (app)/                # authenticated route group: matches, pools, rankings, rules, settings, admin
│   │   ├── (auth)/                # sign-in, sign-up, forgot/reset-password, verify-email
│   │   ├── auth/callback/, auth/confirm/   # OAuth + email-confirmation handlers
│   │   ├── onboarding/profile/
│   │   └── api/cron/sync/, api/notifications/dispatch/, api/csp-report/
│   ├── features/<name>/          # feature-based architecture (see §4)
│   ├── lib/                      # prisma client, supabase clients (server/browser/admin), auth-logger, safe-redirect
│   ├── i18n/                     # es/en dictionaries, no [locale] URL segment
│   ├── generated/prisma/         # generated Prisma client (build artifact, not hand-written)
│   └── proxy.ts                  # Next.js Middleware — THE authoritative request gate (see domain-overview.md §6)
├── content/rules/{es,en}/*.mdx   # Rules Center content, one set per locale
├── scripts/                      # seed-competition.ts, seed-admin.ts, seed-avatars.ts, sync-flags.ts, check-flags.ts
├── public/flags/                 # SVG country flags (lipis/flag-icons, vendored — no runtime hotlink)
├── docs/                         # PROJECT.md, ARCHITECTURE.md, STACK.md, WORKFLOWS.md (curated overview docs)
└── aidlc-docs/                   # AI-DLC process artifacts: carry-forward-decisions.md, audit.md, operations runbook
```

## 4. Feature module inventory

Every feature in `src/features/<name>/` follows the same internal shape: `actions/` (Server Actions, mutations), `components/`, `queries.ts` (reads), `schemas.ts` (Zod), `services/` (business logic), `types.ts`, `__tests__/`.

| Feature | Files (approx.) | Purpose | Key Prisma models |
|---|---|---|---|
| `auth` | 40 | Identity: email/password, Google OAuth, MFA TOTP, Passkeys, password/email change, account deletion | `Profile`, `EmailActionThrottle`, `auth.users` (read/admin-API only) |
| `profile` | 32 | Nickname (`base#discriminator`), avatar, locale, onboarding wizard | `Profile`, `AvatarAsset` |
| `pools` | 56 | Leagues: create/join/leave/kick, invite tokens, directed invites, visibility, archive | `Pool`, `PoolMembership`, `PoolDirectedInvite` |
| `competition` | 31 | Competition/phase/team/match data, football-data.org sync, realtime broadcast | `Competition`, `CompetitionPhase`, `Team`, `Match`, `ProviderSyncRun` |
| `predictions` | 24 | Submit/edit predictions, kickoff lock, penalty-winner selector, fixture-by-day grouping | `Prediction`, reads `Match`/`Team`/`PredictionScore` |
| `scoring` | 3 | Pure scoring algorithm (no DB access) — shared by `scoring-rankings` and `education` | none (pure functions) |
| `scoring-rankings` | 19 | Persists scores on match finish, global/pool leaderboards, live projection | `PredictionScore`, reads `Prediction`/`Match`/`PoolMembership` |
| `admin` | 22 | Sync dashboard, manual result override, manual sync trigger | `Match` (override fields), `ProviderSyncRun` |
| `education` | 22 | Public landing sections + in-app Rules Center + interactive scoring calculator (presentational only) | none (reads MDX, imports `scoring`) |
| `notifications` | 14 | Outbox pattern for Web Push: preferences, subscriptions, event queue, dispatcher | `NotificationPreference`, `PushSubscription`, `NotificationEvent`, `NotificationDelivery` |

Total ≈ 381 `.ts`/`.tsx` files under `src/`.

## 5. Route inventory

| Route | Auth required | Notes |
|---|---|---|
| `/` | No | Public landing |
| `/sign-in`, `/sign-up` | No (auth-only — bounces authenticated users to `/matches`) | |
| `/forgot-password`, `/reset-password` | No / requires recovery session | `/reset-password` is deliberately **not** auth-only-gated (see proxy rules) |
| `/verify-email` | Authenticated-but-unconfirmed lands here | |
| `/auth/callback`, `/auth/confirm` | No | OAuth (PKCE) / email-confirmation (`token_hash`) handlers |
| `/onboarding`, `/onboarding/profile` | Authenticated, onboarding incomplete | Linear wizard: nickname → avatar → rules → notifications → passkey |
| `/matches` | Yes | **The authenticated home** of the product (not `/`) |
| `/pools`, `/pools/[id]` | Yes (member for detail) | Leagues list / detail / leaderboard |
| `/rankings` | Yes | Global ranking |
| `/rules` | Yes (deliberately **not** public, despite being informational) | Rules Center |
| `/settings/profile` (and similar) | Yes | Profile/account settings |
| `/admin`, `/admin/matches` | Yes (`verificationStatus === "ADMIN"` only) | Desktop-shaped dashboard |

## 6. Data model inventory (Prisma — `prisma/schema.prisma`, 474 lines)

| Model | Purpose | Notable fields/enums |
|---|---|---|
| `Profile` | Public identity, extends Supabase `auth.users` (shared UUID PK) | `nicknameBase`/`nicknameDiscriminator`, `avatarSource` (`GOOGLE_PHOTO\|DEFAULT_SET\|CUSTOM_UPLOAD`), `verificationStatus` (`UNVERIFIED\|VERIFIED\|ADMIN`), `mfaEnabled`, `onboardingCompleted`, `locale`, `deletedAt` (soft-delete) |
| `EmailActionThrottle` | Server-only cooldown ledger for email-bound actions, keyed by email (not user id) | `(email, action)` unique |
| `AvatarAsset` | Seeded default avatar set | `storagePath`, `storageUrl`, `displayOrder` |
| `Pool` | A league | `type` (`PUBLIC\|PRIVATE`), `capacity`, `inviteToken` (unique, ≤12 chars), `ownerId`, `membersCanInvite` |
| `PoolDirectedInvite` | Targeted invite by nickname or email | `status` (`PENDING\|ACCEPTED\|REVOKED\|EXPIRED`), `invitedEmailHash` (SHA-256, privacy) |
| `PoolMembership` | User↔Pool membership, incl. personal archive | `joinedAt`, `archivedAt` |
| `Competition` | A tournament | `slug` (unique), `season`, `provider`, `isActive` |
| `CompetitionPhase` | Group/knockout/league stage | `type` (`GROUP\|KNOCKOUT\|LEAGUE`), `groupCode`, `displayOrder` |
| `Team` | A national team | `fifaCode` (unique, 3-char), `isoAlpha2`, `flagKey`/`flagPath` |
| `Match` | One fixture | `status` (`SCHEDULED\|LOCKED\|LIVE\|FINISHED\|POSTPONED\|CANCELLED`), scores, penalty scores, `winnerTeamId`, `manualOverride*` fields |
| `ProviderSyncRun` | Sync audit/lock table | `scope` (`TEAMS\|FIXTURES\|LIVE_STATUS\|RESULTS\|FULL\|CLEANUP`), `status` (`STARTED\|SUCCESS\|PARTIAL_SUCCESS\|FAILED\|RATE_LIMITED\|SKIPPED_LOCKED`), unique `(provider, scope, windowKey)` |
| `Prediction` | A user's prediction for a match (optionally pool-scoped) | `homeScore`/`awayScore` (0–20, DB CHECK), `penaltyWinnerTeamId`, `lockedAt`, `lockReason` (`PredictionLockReason` enum) |
| `PredictionScore` | 1:1 computed score per prediction | `matchedCase` (`EXACT\|RESULT\|PARTIAL\|MISS`), `basePoints`, `penaltyApplied`, `penaltyPoints`, `totalPoints` |
| `NotificationPreference` | 1:1 per-user push opt-ins | 5 booleans, all default `false` |
| `PushSubscription` | Web Push subscription (browser-specific: endpoint/p256dh/auth) | `isActive`, `lastSuccessAt`/`lastFailureAt`/`failureReason` |
| `NotificationEvent` | Outbox row, deduped | `type` (`MATCH_STARTED\|MATCH_FINISHED\|POOL_INVITE\|GLOBAL_RANK_IMPROVED\|GOAL_SCORED`), `dedupeKey` (unique), `status` (`PENDING\|SENT\|FAILED\|SKIPPED`) |
| `NotificationDelivery` | Per-(event, subscription) delivery attempt log | `status` (`SENT\|FAILED\|SKIPPED`) |

Database-level enforcement beyond the ORM (important — mobile inherits this for free if it ever talks to the DB through the same Postgres instance/RLS):
- `prediction_lock_guard` trigger: rejects any UPDATE to a locked prediction's score/penalty fields.
- `predictions_scores_range` CHECK: `home_score`/`away_score` between 0 and 20.
- RLS policies on every table; `predictions_select_own`/`insert_own`/`update_own_unlocked`; `provider_sync_runs` not readable by normal users.
- Custom Access Token Hook (Postgres function, `prisma/migrations/20260617120000_*` + `20260619140000_*`) injects non-standard JWT claims: `email_verified`, `onboarding_completed`, `account_deleted`.

## 7. Server Actions inventory (by feature)

All are `"use server"` functions taking `FormData` or typed args, called from Client Components. Full business-rule detail lives in `domain-overview.md`; this is the surface-area list.

- **auth**: `signUp`, `signIn`, `signOut`, `forgotPassword`, `resetPassword`, `changePassword`, `changeEmail`, `changeUnconfirmedEmail`, `deleteAccount`, `resendConfirmation`, `initiateGoogleSignIn`, `handleGoogleCallback`, `disableMfa`, `enrollMfa`/`confirmMfaEnrollment`, `verifyMfa`/`getMfaFactors`, `reportPasskeyFailure` (passkey sign-in itself runs client-side via Supabase SDK, no server action).
- **profile**: `checkNicknameAvailability`, `setNickname`, `completeOnboarding`, `createAvatarUploadUrl`, `setAvatarFromDefaultSet`, `setAvatarFromGoogle`, `setAvatarFromUpload`, `setLocale`.
- **pools**: `createPool`, `joinPoolByToken`, `joinPublicPool`, `createDirectedInvite`, `kickMember`, `leavePool`, `deletePool`, `renamePool`, `updatePoolMembersCanInvite`, `updatePoolVisibility`, `searchNicknames`, `setPoolArchived`, `loadOwnedPoolsForDeletion`.
- **predictions**: `savePrediction`, `resetPredictionOverride`.
- **admin**: `forceMatchResult`, `revertMatchOverride`, `triggerSync`.
- **notifications**: `savePushSubscription`, `deactivatePushSubscription`/`deactivateAllPushSubscriptions`, `updateNotificationPreferences`.
- **education**: none — fully presentational.
- **scoring / scoring-rankings / competition**: no Server Actions — these are read/services consumed by the above, plus cron-triggered server-only jobs.

## 8. Services inventory (business logic, by feature)

- **auth**: `email-throttle.ts` (60s cooldown), `sync-profile-verification.ts` (UNVERIFIED→VERIFIED).
- **profile**: `nickname.ts` (discriminator assignment, retry-10x), `nickname-suggestions.ts` (cosmetic only).
- **pools**: `invite-token.ts` (8-char unambiguous-alphabet tokens), `session.ts` (`getCurrentUserId`, `formatNickname`), `competition-lock.ts` (defined but **unwired** — freeze removed), `account-deletion.ts` (ownership transfer on delete).
- **predictions**: `eligibility.ts` (kickoff-lock state machine), `lock.ts` (freeze a prediction), `validation.ts` (penalty-winner rules), `fixture-by-day.ts` (pure date grouping).
- **scoring**: `compute-score.ts` (the algorithm), `scoring-rules.ts` (constants) — pure, zero dependencies.
- **scoring-rankings**: `score-match.ts`, `score-adapter.ts`, `resolve-points.ts`, `ranking.ts` (dense rank), `project-leaderboard.ts` (live, never persisted), `score-sweeper.ts` (backstop).
- **competition**: `sync-orchestrator.ts`, `run-scheduled-sync.ts`, `providers/football-data.ts`, `status-mapping.ts`, `fixture-freshness.ts`, `competition-lock.ts`, `broadcast-results-updated.ts`, `live-results-channel.ts`, `seed-matches.ts`, `upsert-competition-data.ts`.
- **admin**: `require-admin.ts`, `resolve-winner.ts`, `revalidate-result-views.ts`.
- **notifications**: `dispatcher.ts`, `events.ts` (outbox primitive), `match-events.ts`, `ranking-events.ts`.
- **education**: `cue-store.ts` (fail-open localStorage wrapper) — the rest of the feature is presentational components, no services layer.

## 9. External services & integrations

| Service | Used for | Notes |
|---|---|---|
| Supabase Auth | Identity provider | Asymmetric JWT signing keys (ES256), `getClaims()` for local verification |
| Supabase Postgres | All app data | Accessed via Prisma (privileged role) server-side, and directly via Supabase JS SDK client-side for RLS-protected reads/auth |
| Supabase Storage | Avatars bucket | Signed upload URLs, public URL generation |
| Supabase Realtime (Broadcast) | "Go refetch" signal for live results | No payload — `{ at: Date.now() }` only; channel `live-results`, event `results-updated` |
| Supabase pg_cron + pg_net | Scheduled HTTP triggers | Reads `app_base_url`/`sync_trigger_secret` from Supabase Vault |
| football-data.org | Competition/fixture/score data | `X-Auth-Token` header; replaced an earlier `API-Football` integration |
| web-push (VAPID) | Browser push delivery | Standard Web Push, not OneSignal/FCM |
| Resend | Transactional email SMTP backing Supabase Auth | Not called directly from app code |
| Vercel | Hosting | Serverless, `iad1`, Fluid Compute |

## 10. Scheduled jobs (server-side, stay server-side regardless of mobile)

| Job | Cadence | Endpoint |
|---|---|---|
| `sync-live-status` | `*/2 * * * *` | `POST /api/cron/sync?scope=LIVE_STATUS` (skipped if no active match window) |
| `sync-results` | `*/5 * * * *` | `POST /api/cron/sync?scope=RESULTS` |
| `sync-fixtures` | `0 6 * * *` | `POST /api/cron/sync?scope=FIXTURES` |
| `sync-cleanup` | `0 4 * * *` | `POST /api/cron/sync?scope=CLEANUP` (purges sync runs >90 days) |
| `dispatch-notifications` | `* * * * *` | `POST /api/notifications/dispatch` |

All guarded by an `x-sync-secret` header checked against `SYNC_TRIGGER_SECRET`.

## 11. Scripts

| Script | Purpose |
|---|---|
| `scripts/seed-competition.ts` | Upserts World Cup 2026 competition/teams/phases + seeds matches (1 API call, snapshot fallback) |
| `scripts/seed-admin.ts <user-id>` | Promotes a user to `ADMIN` |
| `scripts/seed-avatars.ts` | Uploads the default avatar set to Storage |
| `scripts/sync-flags.ts` / `scripts/check-flags.ts` | Download/validate SVG country flags |

## 12. Environment variables (relevant to any backend/API mobile will depend on)

`DATABASE_URL`, `DIRECT_URL`, `DB_CONNECTION_LIMIT`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `FOOTBALL_DATA_KEY`, `SYNC_TRIGGER_SECRET`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `NEXT_PUBLIC_SITE_URL`, `WORLD_CUP_KICKOFF`.

## 13. Testing setup (source app)

- Vitest (unit) — feature-local `__tests__/` directories; notable coverage on `compute-score.ts`, predictions, scoring-rankings, admin.
- Playwright (e2e) — present in devDependencies; specific specs not inventoried here.
- No dedicated CI-blocking visual/regression tooling found beyond ESLint/Biome/build.

## 14. Related memory files

- [domain-overview.md](domain-overview.md) — business rules, state machines, scoring algorithm, cross-feature dependency map.
- [migration-analysis.md](migration-analysis.md) — what translates to React Native as-is vs. what needs redesign, risk ranking, open architecture questions for Inception.
