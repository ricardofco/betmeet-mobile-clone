# System Context — Liga Mundial Mobile Migration

> **Intent ID:** `liga-mundial-mobile-migration` · Produced after Checkpoint 2 approval, as part of the auto-continue sequence (context → units → stories → bolt plan).

## 1. External systems mobile talks to

| System | Why mobile talks to it | How (per §7.1 of requirements.md) |
|---|---|---|
| **Backend API** (logic equivalent to `betmeet-clone`'s Server Actions/services, hosting TBD — out of this intent's authority) | All business-rule-bearing mutations and reads from `domain-overview.md §5`: nickname/discriminator assignment, pool capacity/invite/membership rules, prediction validation + save, the authoritative scoring run, notification preference/dispatch, admin overrides, sync-dashboard reads | REST/RPC over HTTPS, bearer-token authenticated (the user's Supabase session JWT), versioned contract (see §3) |
| **Supabase Auth** | Sign-in/up, Google OAuth, TOTP MFA enrollment/challenge, session issuance/refresh | Supabase RN client SDK, behind the mobile-side Supabase adapter (§4) |
| **Supabase Postgres (direct, RLS-scoped)** | Only for reads/writes the database itself already protects regardless of caller: prediction kickoff-lock enforcement (DB trigger), any RLS-scoped read mobile chooses to take directly rather than via the API | Supabase RN client SDK, behind the same adapter |
| **Supabase Storage** | Avatar upload (signed URL flow, same pattern as web) | Supabase RN client SDK, behind the same adapter |
| **Supabase Realtime (Broadcast)** | Subscribing to the `live-results` / `results-updated` signal-only channel to know when to refetch live match/ranking data | Supabase RN client SDK, behind the same adapter |
| **FCM (Android) / APNs (iOS)** | Native push delivery (device token registration; the backend remains responsible for sending) | Platform push SDK (Expo Notifications or direct FCM/APNs — packaging decision deferred to Construction per requirements.md §8) |
| **Deep link targets** (`betmeet://…`, Universal Links / App Links) | Email-confirmation continuation, league-invite links opened outside the app | OS-level `Linking` API |

Mobile **never** talks to: football-data.org (sync stays server-side), Resend/email SMTP (Supabase Auth's own emails), Supabase pg_cron/pg_net (server-only scheduling), Vercel (hosting concern, not a runtime dependency).

## 2. The Supabase-access encapsulation layer (binding NFR — requirements.md §7.2)

A single internal module (exact name/location decided in Construction, but its existence and boundary are fixed here) wraps **every** Supabase SDK call mobile makes — auth, storage, realtime, and any direct RLS-scoped DB read. No screen, hook, or feature module calls the Supabase SDK directly. This module is the only place that would need to change if Supabase's SDK, auth flow, or realtime channel naming ever changes.

```
┌─────────────────────────────────────────────────────────┐
│                     Feature modules                      │
│   (auth UI, profile UI, predictions UI, pools UI, ...)   │
└───────────────┬───────────────────────────┬──────────────┘
                │                           │
                ▼                           ▼
   ┌─────────────────────────┐   ┌───────────────────────────┐
   │  Backend-API client      │   │  Supabase adapter (single  │
   │  (business-rule reads/   │   │  encapsulation point)      │
   │  writes — §7.1 Option A) │   │  - auth                    │
   └───────────┬──────────────┘   │  - storage                 │
               │                  │  - realtime broadcast      │
               │                  │  - kickoff-lock-protected   │
               │                  │    direct writes            │
               │                  └──────────────┬─────────────┘
               ▼                                 ▼
   ┌─────────────────────────┐       ┌──────────────────────────┐
   │  Backend API              │       │  Supabase (Auth, Postgres │
   │  (hosting TBD)            │──────▶│  + RLS, Storage, Realtime)│
   └─────────────────────────┘       └──────────────────────────┘
```

Both the Backend-API client and the Supabase adapter are themselves implemented **inside this repo** (`betmeet-mobile-clone`) — neither imports code from `betmeet-clone` (requirements.md §7.3).

## 3. The API contract mobile depends on (shape, not implementation)

Mobile needs the following capability groups exposed by the backend (mirroring the web app's Server Actions/services 1:1 in behavior — see `project-inventory.md §7` for the exhaustive source list). This is a contract requirement, not an endpoint design (REST vs. RPC, exact paths/verbs are a Construction/backend concern):

| Capability group | Mirrors (source) | Notes |
|---|---|---|
| Auth flows requiring server logic beyond Supabase Auth itself | `signUp`, `signIn`, `changeEmail`, `changeUnconfirmedEmail`, `deleteAccount`, `resendConfirmation`, MFA enroll/verify, throttle/cooldown enforcement | Most of auth's *transport* is Supabase Auth directly (see §1); this group covers the business-rule layer wrapped around it (cooldowns, soft-delete semantics, account-deletion's pool-ownership transfer) |
| Profile | nickname availability/assignment + cooldown, avatar source state transitions, onboarding completion | Nickname discriminator assignment and the 30-day-cooldown-with-grace rule are server-authoritative, not reimplementable client-side |
| Pools | create/join/leave/kick/delete/rename, invite token generation/redemption, directed invites, visibility toggle, capacity enforcement | Capacity/uniqueness races must be checked server-side (transactional), not just client-validated |
| Predictions | save (incl. pool-override + global dual-save), reset override, eligibility/lock check, penalty-winner validation | Server re-validates eligibility with its own clock regardless of what mobile believes — mobile's countdown UI is advisory only |
| Competition (read) | fixture/team/match read model, equivalent to `getFixture`/`getFixtureWithMyPredictions` | Read-only from mobile; no sync-trigger capability exposed to mobile (that stays admin-only) |
| Scoring (read) | resolved per-prediction points/status, equivalent to `resolvePoints` | The scoring *algorithm* itself is reimplemented client-side too (requirements.md §7.3) for the same reason the web app shares one implementation between real scoring and its educational calculator — but the *authoritative* persisted score always comes from the backend |
| Rankings | global ranking, pool leaderboard, live projection equivalents | Live projection needs a read endpoint mobile can poll or refresh on a Realtime signal |
| Notifications | preferences CRUD, push-subscription/device-token registration | Device-token model replaces the web app's `endpoint`/`p256dh`/`auth` Web Push subscription shape |
| Admin | sync dashboard reads, force-result, revert-override, manual sync trigger | Lowest-priority surface (requirements.md §7.4); same contract shape as the rest, gated server-side on `verificationStatus === "ADMIN"` exactly as today |

Authentication for every call in this contract: the user's current Supabase session JWT, bearer-token style — the same JWT the Supabase adapter already manages, so there is exactly one session/token lifecycle in the app, not two.

## 4. Module Federation host/remote topology

```
┌──────────────────────────────────────────────────────────────────────┐
│ HOST BUNDLE                                                          │
│                                                                       │
│  ┌────────┐  ┌─────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  auth   │  │ profile │  │ predictions  │  │ notifications        │  │
│  │ (gate)  │  │ (incl.  │  │ (high-       │  │ (permission request, │  │
│  │         │  │ onboard)│  │  frequency)  │  │  device-token reg.)  │  │
│  └────────┘  └─────────┘  └─────────────┘  └─────────────────────┘  │
│                                                                       │
│  Shared singletons / host-bundled libraries (not routed chunks):     │
│    - scoring (pure algorithm — single source of truth)               │
│    - Supabase adapter (§2)                                           │
│    - Backend-API client (§3)                                         │
│    - react, react-native, navigation runtime, state runtime          │
│      (exact libraries TBD in Construction; whichever is chosen is a  │
│      shared singleton, never duplicated per remote)                  │
└───────────────────────────────┬───────────────────────────────────────┘
                                │ Module Federation v2 (on-demand remotes)
        ┌───────────────────────┼───────────────────────┬───────────────────┐
        ▼                       ▼                       ▼                   ▼
┌───────────────┐     ┌───────────────────┐    ┌──────────────────┐  ┌────────────┐
│ pools (leagues)│     │ competition        │    │ scoring-rankings  │  │ education   │
│ remote          │     │ (read-only fixture/│    │ remote            │  │ (Rules      │
│                 │     │  team data) remote │    │                   │  │  Center)    │
│                 │     │ or shared          │    │                   │  │ remote      │
└───────────────┘     └───────────────────┘    └──────────────────┘  └────────────┘
        ┌───────────────────┐    ┌───────────────────┐
        ▼                   ▼    
┌───────────────────┐  ┌───────────────────┐
│ notifications       │  │ admin               │
│ (preferences screen)│  │ remote, low priority │
│ remote               │  │                      │
└───────────────────┘  └───────────────────┘
```

Rationale recap (full detail in `requirements.md §7.4`):
- **Host**: auth, profile, predictions (frequency), plus the notification permission/token-registration logic (must run reliably and early, before any remote has loaded).
- **Remote**: pools, competition, scoring-rankings, the notification-preferences screen, education, admin — all lower-frequency or naturally deferred-load candidates.
- **Shared, not routed**: `scoring` — every consumer (host's predictions, the scoring-rankings remote, the education remote's calculator) imports the same package so point math cannot diverge between host and any remote, mirroring the invariant the web app already enforces between its real scoring engine and its educational calculator.

**Native-module consequence for federation** (requirements.md §7.5): any remote whose feature requires a native module not already linked into the host binary (e.g. `react-native-svg` for a flag/QR-rendering screen, `react-native-image-picker` for avatar upload) needs that native module present in the shipped app regardless of host/remote placement — Module Federation defers *JS* loading, not native linking. Construction must confirm native-module presence before assigning a feature to a remote.

## 5. Data model alignment

Mobile's read/write contract is structurally aligned with the Prisma models cataloged in `project-inventory.md §6` (`Profile`, `Pool`, `PoolMembership`, `PoolDirectedInvite`, `Competition`/`CompetitionPhase`/`Team`/`Match`, `Prediction`, `PredictionScore`, `NotificationPreference`/`NotificationEvent`/`NotificationDelivery`) with one explicit deviation: **`PushSubscription`'s shape (`endpoint`/`p256dh`/`auth`, Web-Push-specific) is replaced by a device-push-token model** (FCM/APNs token + platform) per requirements.md §7.5 — this is a new shape, not a port, and must be reflected in whatever backend table/contract serves mobile's notification registration.

## 6. Related artifacts

- `requirements.md` — the decisions this context elaborates.
- `../../project/domain-overview.md` — the business rules and state machines each unit brief below traces back to.
- `../../project/migration-analysis.md` — the mechanism-translation reasoning behind §2–§4 above.
- `units/{unit-id}/unit-brief.md` (next artifacts) — one per module in requirements.md §4.
