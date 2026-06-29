# Migration Analysis — `betmeet-clone` (Next.js/Supabase web) → React Native mobile

> **Agent note:** This file translates the source app's *implementation mechanisms* into what they imply for this React Native + Re.Pack app. It assumes `domain-overview.md` (the business rules) is correct and stable, and asks: "given that business rule, what does the web app's specific Next.js/Supabase mechanism mean we need to build differently on mobile?" Use this during Inception to scope units and flag architecture decisions — it does not make those decisions for you.

## 1. Framing

This is a **brownfield migration of product behavior, not of code.** Almost nothing in `betmeet-clone`'s `src/app/`, Server Actions, or middleware can be copy-pasted — React Native has no SSR, no Server Components, no Next.js Middleware, no cookies-as-session-storage, and no built-in Server-Action RPC mechanism. What *does* port cleanly is: the **pure business logic** (validation rules, the scoring algorithm, state-machine decisions) and the **database-level enforcement** (RLS, triggers, CHECK constraints), because both are independent of the web framework.

## 2. The central open question: does mobile get its own backend, or call the existing one?

The source app's mutations (`"use server"` Server Actions) run privileged Prisma queries against Postgres directly from within the Next.js process — they are not currently exposed as a callable API. Two broad paths exist, and **this should be an explicit Inception/architecture decision, not an implicit one**:

| Option | What it means | Tradeoff |
|---|---|---|
| **A — Expose the existing logic as an API** | Wrap the existing Server Action bodies (which are already plain async functions calling Prisma/services) in Next.js Route Handlers (`app/api/.../route.ts`) that the RN app calls over HTTPS, alongside the existing web app. | Reuses all validation/business logic verbatim, single source of truth for rules; requires building and versioning a real API contract, auth-token-based (not cookie-based) for mobile callers. |
| **B — Mobile talks to Supabase directly** for everything RLS already protects (auth, storage uploads, simple CRUD covered by RLS policies), and only calls a thin API for the logic that currently lives in TypeScript service code with no DB-level equivalent (nickname/discriminator assignment, invite token generation, scoring, notification dispatch, admin overrides). | Less new backend surface for the simple cases, but risks two implementations of the same business rule  (one in RLS/triggers, one re-implemented in RN/API) — the **kickoff lock** is the one case where this is *already* safe (DB trigger enforces it regardless of caller), but most business rules (nickname cooldown, pool capacity races, penalty-winner validation, scoring) are **not** expressed in the database and would need a server-side authority. | Faster for a thin slice, but the validation rules from `domain-overview.md §5` cannot be assumed enforced for any flow that bypasses the existing Server Action logic. |

Recommendation to surface at Inception (not a decision made here): start from **A** for anything in §5 of the domain overview, reserve **B** strictly for what the database already enforces independent of caller (kickoff lock, RLS-scoped reads, Supabase Auth flows themselves).

## 3. Mechanism-by-mechanism translation table

| Web mechanism | Used for | What mobile needs instead | Portability of underlying logic |
|---|---|---|---|
| Server Actions (`"use server"`) | All mutations (predictions, pools, profile, notifications, admin) | REST/RPC endpoints calling the same service functions | **High** — the function bodies are plain TS/Prisma, framework-agnostic |
| Next.js Middleware (`src/proxy.ts`) | The entire auth/email-confirm/soft-delete/onboarding gate, evaluated per request | A root navigation guard that decodes the same JWT claims (`account_deleted`, `email_verified`, `onboarding_completed`) on launch and on each protected-screen entry | **High for the rules, zero for the mechanism** — same claims, same fail-open-on-absence semantics (`domain-overview.md §6`), different evaluation point |
| `@supabase/ssr` cookie-based session | Session persistence across SSR requests | Supabase JS SDK's RN support with a custom `storage` adapter (`AsyncStorage`/`react-native-keychain` for the refresh token) | **High** — Supabase's client SDK has first-class RN session-storage support; this is the most "just works" piece |
| `redirect()` (Next.js navigation throw) | Post-action navigation | `navigation.navigate(...)` after an awaited response | Trivial |
| `revalidatePath` / `revalidateTag` / `unstable_cache` / React `cache()` | Server-side cache invalidation, per-request memoization | Client-side query cache (e.g. React Query/SWR-style) keyed on the same logical tags already named in the source code (`competition-fixture`, `rankings`, `pool-leaderboard-{id}`), invalidated on the same triggers (sync success, admin override, membership change, prediction save) | **High** — the invalidation *triggers* are already enumerated in the source; only the cache implementation changes |
| PKCE (`/auth/callback`) + `token_hash` (`/auth/confirm`) email-confirmation dual flow | Browser-safe email links (resistant to mail-scanner link rewriting) | Deep links (custom URL scheme, e.g. `betmeet://auth/confirm?...`), handled via `Linking` | **Medium** — the *reason* (mail-scanner safety) still applies; the `user_metadata.invite_next` workaround (built specifically around static email-template limitations) likely simplifies on mobile since deep-link payloads aren't constrained the same way, but needs its own design, not a port |
| WebAuthn Passkeys (`navigator.credentials`, Supabase's web Passkeys beta SDK) | Passwordless / 2nd factor | Native platform passkey APIs (iOS `ASAuthorizationPlatformPublicKeyCredentialProvider`, Android Credential Manager) | **Low** — confirm with Supabase docs whether their passkey support extends to React Native at all before committing to feature parity; budget for "TOTP MFA only, no passkeys at launch" as a fallback scope |
| TOTP MFA (`supabase.auth.mfa.*`) | Second factor | Same Supabase SDK calls, just from the RN client; QR code currently rendered as an SVG data URI (needs `react-native-svg` or a server-rendered PNG) | **High** |
| Web Push (VAPID, `PushSubscription` model, service worker) | All push notifications | Native push (FCM for Android, APNs for iOS — likely via Expo Notifications or a direct FCM/APNs SDK) | **Low for delivery, high for the rest** — the outbox/preference/dedup logic (`NotificationEvent`, `queueNotificationEvent`, the 5 preference flags) is pure Prisma/TS business logic, fully reusable; only the "subscribe" step (replace `endpoint`/`p256dh`/`auth` with a device push token) and the "send" step (replace `webpush.sendNotification` with FCM/APNs calls) are web-specific |
| Supabase Realtime Broadcast (signal-only "go refetch") | Live match score propagation | Subscribe to the **same** channel/event (`live-results` / `results-updated`) from the RN Supabase client, and on receipt re-fetch from the equivalent read endpoint; fall back to polling (using the same `±3h of kickoff` heuristic the web app uses to decide when to poll aggressively at all) | **High** — Supabase Realtime client works the same way on RN; this is largely a port, not a redesign |
| Content Collections (MDX, Rules Center) | Static rules content rendering | A different MDX toolchain for RN (e.g. pre-compile to a JSON AST, or `react-native-markdown-display` against the raw `.mdx`) | **Medium** — the *content* (`content/rules/{es,en}/*.mdx`) is portable as data; only the rendering pipeline changes |
| `next/image` remote image optimization | Avatars, flags | RN `Image`/`expo-image` with manual sizing; flags should likely ship as bundled assets rather than remote SVGs given they're already vendored in the web repo | **High** (asset strategy, not logic) |
| `localStorage` (education cue-dismissal, fail-open design) | Per-browser "dismissed" UI state | `AsyncStorage`/MMKV, preserving the same fail-open try/catch pattern | **High** |
| Direct-to-Storage signed upload (`fetch(signedUrl, {method:"PUT"})`) | Avatar upload | Same approach works from RN (`fetch` + `Blob`/`FormData`); only the file picker changes (`expo-image-picker`/`react-native-image-picker` instead of `<input type="file">`) | **High** |

## 4. Per-feature migration risk

| Feature | Business-logic portability | Web-specific blockers | Risk | Notes |
|---|---|---|---|---|
| `scoring` | Pure functions, zero deps | None | **Low** | Extract verbatim into a shared package consumed by both web and the future mobile backend/client — this guarantees the two can never compute different point totals. Highest-value, lowest-risk first slice. |
| `predictions` | High (eligibility/lock/validation are plain functions) | Server Actions → API; live countdown UX is a client nicety, not authoritative | **Low-Medium** | The DB trigger backstops the lock regardless of client; mobile inherits that protection automatically once it writes through the same database/API. |
| `scoring-rankings` | High (pure computation + Prisma writes) | `unstable_cache`/`revalidateTag` need a client-cache equivalent; live projection needs a read endpoint | **Low-Medium** | |
| `pools` | High | Server Actions → API; otherwise plain CRUD + a few business rules (capacity, naming, invite gating) | **Low-Medium** | |
| `competition` | High for reads; sync/orchestration stays 100% server-side regardless | Realtime signal-and-refetch pattern needs a mobile-side subscribe+refetch (or polling) implementation | **Low** for mobile scope (mobile never triggers sync, only consumes its results) | |
| `notifications` | Outbox/preference/dedup logic is fully reusable | Entire delivery channel (Web Push) must be replaced with native push | **High** | Budget real design time here — this is a platform swap, not a port. Decide the push provider (Expo Notifications vs. raw FCM/APNs vs. a 3rd-party like OneSignal) early since it affects the subscription data model. |
| `profile` | High (nickname rules, avatar-source state machine) | File picker, signed-upload flow, locale cookie → device storage | **Low-Medium** | |
| `auth` | High for email/password and TOTP MFA | Passkeys need native APIs (uncertain Supabase RN support — verify before scoping); PKCE/token_hash email flows need redesign as deep links; the entire `proxy.ts` gate needs a navigation-guard equivalent | **High** | The single largest "needs real design, not a port" item — see §2 and §3 rows on Middleware and Passkeys. |
| `admin` | High, but likely **out of initial mobile scope** | Desktop-dashboard-shaped UI (tables, many numeric inputs); the underlying actions are 1:1 portable as API endpoints if ever needed on mobile | **Low priority, not low risk-if-attempted** | Recommend explicitly scoping admin **out** of the mobile app's first release unless a stakeholder says otherwise — confirm at Inception rather than assuming. |
| `education` | Fully portable logic (it has none beyond importing `scoring`) | MDX rendering pipeline differs; `localStorage`→`AsyncStorage` | **Low** | |

## 5. What mobile gets "for free" regardless of architecture choice

These exist at the database level and apply to any client (web Server Action, future mobile API, or a hypothetical direct-from-RN Supabase write) as long as it writes through the same Postgres instance:

- The prediction kickoff-lock (`prediction_lock_guard` trigger) and score-range CHECK constraint (0–20).
- RLS policies scoping every table to its owner/member (`predictions_select_own`, etc.).
- The `ProviderSyncRun` unique-window constraint preventing duplicate concurrent sync runs.
- The Custom Access Token Hook injecting `email_verified`/`onboarding_completed`/`account_deleted` claims into any session JWT, regardless of which client requested it.

This is a meaningful migration asset: it means the **highest-stakes** business rule (don't let users edit a prediction after kickoff) cannot be subverted by a buggy or malicious mobile client even before any mobile-side validation exists.

## 6. What stays 100% server-side, untouched by this migration

- All cron-triggered jobs (`sync-live-status`, `sync-results`, `sync-fixtures`, `sync-cleanup`, `dispatch-notifications`) — mobile never triggers these, only reads their results.
- The football-data.org provider adapter and sync orchestration.
- The notification dispatcher's "send" loop (once retargeted from Web Push to FCM/APNs, it's still a server-side job, not something the mobile client runs).

## 7. Top migration risks, ranked

1. **Auth gate redesign** (`proxy.ts` → navigation guard) — not hard individually, but every other screen depends on getting this right first; get it solid early rather than discovering edge cases per-feature.
2. **Passkeys uncertainty** — verify Supabase's actual RN/native passkey support before any unit promises feature parity; have a fallback (TOTP-only) ready to propose.
3. **Push notification platform swap** — budget this as a redesign, not a port; decide the provider before building the subscription data model so it isn't reshaped twice.
4. **Backend/API surface decision (§2)** — left unresolved, every subsequent unit will guess differently about how mobile reaches business logic; resolve this before decomposing units, not during.
5. **Live-update strategy** (Realtime signal + refetch vs. polling) — low individual risk but touches predictions, pools, and rankings screens simultaneously; design once, reuse the pattern everywhere rather than solving it three times.

## 8. Suggested sequencing hint for Inception (informational, not a decision)

The dependency map in `domain-overview.md §7` suggests `auth` + `profile` (the onboarding gate) are prerequisites for almost everything else being meaningfully testable, and `scoring` is a true leaf with no inward dependencies — a natural "first vertical slice" is: minimal auth (email/password only, defer passkeys) → onboarding → read-only fixture/predictions view using the shared `scoring` package → write path for predictions once the API/backend decision (§2) is made. This is a suggestion for whoever runs Inception to evaluate, not a committed plan.

## 9. Related memory files

- [domain-overview.md](domain-overview.md) — the business rules and dependency map this analysis assumes.
- [project-inventory.md](project-inventory.md) — full catalog of what exists in the source app today.
