# Domain Overview — Liga Mundial (extracted from `betmeet-clone`)

> **Agent note:** This is the business/domain knowledge extracted from the source-of-truth web app, independent of its Next.js implementation. Read this before decomposing Inception units — it tells you *what the product must do*, not how the web app happens to do it. For "how it's implemented today and what that means for the mobile port," see `migration-analysis.md`. For the raw file/route/model catalog, see `project-inventory.md`.

## 1. Product in one paragraph

Users register, build a public identity (nickname + avatar), join or create **leagues** ("Pools" in code/DB — see glossary), and predict the exact score of each FIFA World Cup 2026 match. Predictions lock at kickoff. Points are awarded deterministically once a match finishes, and users compete on global and per-league rankings. Admins can monitor the external data sync and manually correct match results when the data provider is wrong.

## 2. Glossary (product copy vs. technical identifiers — CF-5)

| Technical identifier (keep in code/DB) | Product copy (use in UI) |
|---|---|
| `Pool` | **Liga** (never "quiniela") |
| Leaderboard | **Ranking** |
| Pick | **Predicción** |
| Kickoff | **Inicio del partido** |
| Invite | **Invitación** |

Locale: `es` (default) and `en`; no `/es`/`/en` URL prefix on web — preference stored in cookie + `Profile.locale`. Mobile has no URL prefix concept either; persist the same preference (e.g. device storage + `Profile.locale` sync).

## 3. Core entities & relationships

```
Profile (1) ──owns──> (N) Pool
Profile (N) ──member of──> (N) Pool   [via PoolMembership]
Profile (N) ──invited to──> (N) Pool  [via PoolDirectedInvite]
Profile (1) ──makes──> (N) Prediction
Profile (1) ──has──> (1) NotificationPreference
Profile (1) ──has──> (N) PushSubscription

Competition (1) ──has──> (N) CompetitionPhase ──has──> (N) Match
Match ──home/away──> Team (x2), optionally ──winner──> Team

Prediction ──for──> (1) Match, optionally scoped to (1) Pool
Prediction ──scored by──> (0..1) PredictionScore

NotificationEvent ──delivered via──> (N) NotificationDelivery ──to──> (1) PushSubscription
```

A `Prediction` can be **global** (`poolId = null`) or a **pool-scoped override** (`poolId` set) — a user can predict differently inside a specific league than their global prediction; the pool override always wins for that pool's leaderboard.

## 4. State machines

### 4.1 Match status
`SCHEDULED → LIVE → FINISHED`, with side branches to `POSTPONED`/`CANCELLED`, and a rarely-produced `LOCKED` (derived, not provider-sourced — only emitted by the generic status mapper as a fallback when no provider status applies and kickoff has passed).

Transition rules:
- Provider sync drives all transitions normally (see §9).
- **Terminal-status guard**: `FINISHED`/`CANCELLED` never regress backward even if the provider's live feed lags and reports an already-finished match as still `IN_PLAY`.
- **Manual-override freeze**: once `Match.manualOverride = true`, the provider sync never touches that match again — only an explicit admin "revert" clears it.
- Reverting an override resets to `SCHEDULED` unconditionally (not to whatever the provider's real status is) — it's a hard reset, "no longer scoreable," and the next sync repopulates real data.

### 4.2 Prediction lock (the kickoff-lock state machine — `getPredictionEligibility`)
```
no home/away team assigned       → not editable, reason MATCH_NOT_EDITABLE
no kickoff time                  → not editable, reason MATCH_NOT_EDITABLE
now >= kickoffAt                 → not editable, reason KICKOFF_REACHED   ← the lock cutoff, no grace period
status === CANCELLED             → not editable, reason CANCELLED
status === POSTPONED             → not editable, reason POSTPONED
status not SCHEDULED (other)     → not editable, reason MATCH_STATUS_LOCKED
otherwise (status SCHEDULED, now < kickoffAt, both teams set) → editable
```
The server re-checks this with **its own clock** on every save — the client's countdown UI is a courtesy, never authoritative. A Postgres trigger (`prediction_lock_guard`) additionally rejects any UPDATE to a locked prediction's score fields, independent of the application layer — **this protection exists at the database level and any client (web or mobile) inherits it automatically if it talks to the same database.**

A prediction is editable an **unlimited number of times** until the lock cutoff (no per-day/per-hour edit limit).

### 4.3 Verification status (`Profile.verificationStatus`)
`UNVERIFIED → VERIFIED` is automatic and one-way, triggered every time email confirmation is detected (sign-in, OAuth callback, email-confirm route). `→ ADMIN` is **never** set by application code — only via an out-of-band script run by an operator. Admin status, once set, is never touched by the automatic sync (the transition query explicitly excludes rows already `ADMIN`).

### 4.4 Onboarding (linear wizard, client-driven, server marks completion)
Steps in order: `nickname → avatar → rules → notifications → passkey`. Supports stepping back. The `rules` and `notifications` steps are both **explicitly skippable** and never block completion; no "seen rules" state is persisted. Completing the `notifications` step (vs. configuring it later in Settings) opts the user into **all 5 notification types at once** — this is different from Settings' granular per-type switches, and is a deliberate UX shortcut, not a bug.

### 4.5 Notification event lifecycle (outbox pattern)
`PENDING → SENT | FAILED | SKIPPED`. `SKIPPED`/`FAILED` events are **revived to `PENDING`** if the same domain event re-fires with the same dedupe key (e.g. a goal gets re-synced); `SENT`/`PENDING` are left alone to avoid duplicate notifications. An event is marked `SENT` at the event level if **at least one** of the user's subscriptions/devices succeeded, even if others failed.

### 4.6 Pool directed invite status
`PENDING → ACCEPTED | REVOKED | EXPIRED`.

### 4.7 Provider sync run status (audit/lock table, not user-facing)
`STARTED → SUCCESS | PARTIAL_SUCCESS | FAILED | RATE_LIMITED | SKIPPED_LOCKED`.

## 5. Business rules by domain area

### 5.1 Auth & account
- Password min length 8. Email/password, Google OAuth (auto-links to an existing email), TOTP MFA, Passkeys (WebAuthn, Supabase beta API).
- Sign-in with an unconfirmed email returns a specific "unconfirmed" outcome (not a generic credential error) so the UI can offer resend/change-email inline.
- Resend-confirmation / change-unconfirmed-email are throttled to **≥60 seconds** per email address (keyed by email, not user id, since unconfirmed accounts may have no profile row yet).
- **Account deletion** is a two-step, irreversible workflow: (1) reassign or delete owned leagues (cannot delete an account with an owned league that has other members and no chosen successor), (2) soft-delete the `Profile` (nulls the nickname so it's released — the unique index doesn't consider `deletedAt`) **and** hard-delete the underlying auth user. A soft-deleted account can never sign in again — checked at sign-in, at OAuth callback, and via a session-claim check on every request.
- "Secure email change" (requiring the *old* address to also confirm) is **deliberately disabled** — only the new address confirms. This is a recorded, accepted security tradeoff, not an oversight.
- Email change for an *unconfirmed* account is a distinct flow from email change for a confirmed account (different verification path, since the unconfirmed account's only proof of ownership is its original password).

### 5.2 Profile & nickname
- Nickname base: 3–20 chars, `^[a-zA-Z0-9_-]+$` only. Full identity is `base#NNNN` (4-digit random discriminator, zero-padded, retried up to 10 times on collision).
- A nickname base is considered "available" as long as fewer than 9999 of the 10000 possible discriminators for that base are taken.
- **Nickname change cooldown is 30 days, but with a grace allowance**: the initial onboarding assignment AND one free post-onboarding change are both exempt; only the **third+** change is rate-limited. Cooldown doesn't apply at all while onboarding is incomplete.
- Avatar sources: Google profile photo, a seeded default set, or a custom upload (≤5MB, jpeg/png/webp). A Google-photo avatar refreshes automatically on every sign-in **unless** the user has since uploaded a custom avatar — a custom upload is never silently overwritten.
- Locale preference (`es`/`en`) is explicit-user-wins over any device/browser default language.

### 5.3 Leagues (pools)
- Capacity: 2–100 members, enforced both client-side and transactionally at join time.
- Name: 3–60 chars. **Public** league names must be unique among public leagues (checked on create, rename, and visibility-change-to-public).
- Invite token: 8 unambiguous characters (excludes `0/O/1/I/L`), unique, with a 12-char fallback if collisions exhaust retries.
- Invite permission: the **owner** can always invite. In a **public** league, any member can invite (no toggle). In a **private** league, members can invite only if the owner has enabled `membersCanInvite` (defaults on).
- Directed invites target a user by `nickname#discriminator` or by email; an invite to an email with no matching account stores a privacy-preserving hash, presumably resolved on later signup.
- **Joining, leaving, kicking, and deleting a league are allowed at any time** — including after the competition has started. An earlier "freeze" rule (no membership changes mid-tournament) was explicitly removed; do not reintroduce it without checking whether that decision still holds.
- The owner cannot leave or kick themself — they must delete or transfer the league.
- Visibility (`PUBLIC`↔`PRIVATE`) is owner-only and toggling preserves members and the invite token; switching to private is always allowed, switching to public re-checks name uniqueness.
- A league's member list shows another member's prediction for a match **only after that match has kicked off** (anti-bias) — the viewer always sees their own immediately.
- A pool's leaderboard only counts a member's points for matches whose kickoff is **after** they joined — not their full global history.
- Each member can personally archive/unarchive their own membership (cosmetic, doesn't affect scoring/membership).

### 5.4 Predictions
- Score bounds: integers 0–20 per side (enforced in validation **and** at the DB level).
- **Penalty-winner selector** applies only to a tied knockout-phase match: if knockout and scores are equal, a winner pick is required; if not knockout-and-tied, supplying a penalty winner is itself an error (the server strips/rejects it). The winner must be one of the two match teams.
- A pool-scoped prediction ("override") and a global prediction can be saved together atomically in one request ("save as global too").
- Resetting a pool override deletes only that override row, reverting the member to their global prediction for that match in that pool's view.

### 5.5 Scoring (the deterministic algorithm — `ScoringRuleSet`)

```
EXACT_SCORE        = 5   // exact home AND away score — does not stack with the components below
CORRECT_RESULT      = 2   // correct winner/draw, on a non-exact prediction
PARTIAL_GOAL_COUNT  = 1   // correct goal count for ONE side; home and away evaluated independently — both can apply
MISS                = 0
PENALTY_BONUS       = 1   // bonus for correctly predicting the penalty-shootout winner
```

Algorithm:
1. If predicted score equals actual score exactly → `EXACT`, 5 points, done (no separate component breakdown).
2. Otherwise, additively: +2 if the predicted result (home win/away win/draw) matches the actual result; +1 if the predicted home score equals the actual home score; +1 if the predicted away score equals the actual away score. Outcome label is `RESULT` if the result-match component fired, else `PARTIAL` if either goal-count component fired, else `MISS`. (Max non-exact score is 3 — matching both goal counts *and* the result by definition means EXACT.)
3. **Independently** of the base score: +1 penalty bonus if the match is a tied knockout match (penalty shootout happened) and the predicted shootout winner matches the actual one. A tied shootout score has no derivable winner (invalid state).
4. The penalty winner is **always derived from the shootout score**, never separately chosen as raw input — both for predictions and for admin-entered results.

This algorithm is implemented as pure, dependency-free TypeScript with no database access — both the authoritative scoring engine and the educational "try it yourself" calculator import the *same* constants/function so they can never drift apart. Preserve this property in the mobile port (shared package, not a re-implementation).

### 5.6 Rankings
- **Dense ranking** ("1, 1, 2" — tied entries share a rank, the next rank increments by exactly one regardless of how many tied). This was an explicit, deliberate product decision that deviates from a more "standard" example once considered ("1, 1, 3") — do not silently "fix" it.
- Global ranking ties are broken by an arbitrary-but-deterministic secondary sort (not nickname-based) purely for stable ordering, not as a product-meaningful tiebreaker.
- A **live projection** exists: while a match is in progress, a projected leaderboard recomputes points using the live in-progress score, but the penalty bonus is **never** granted during projection — only once the match is finished and officially scored. Live projections are never persisted; they are recomputed on every read.

### 5.7 Admin overrides
- Restricted to `Profile.verificationStatus === "ADMIN"` (set only by an operator script, never by the app).
- Forcing a result requires both teams assigned; in a tied knockout match a penalty winner is mandatory and must be consistent with any penalty scores supplied.
- Forcing a result **synchronously re-scores every prediction for that match** in the same operation — not queued, not eventual.
- Reverting an override **clears** the manual data (does not restore the provider's original result, which isn't snapshotted) and removes the resulting scores — the next provider sync is expected to repopulate the real result.
- A manual trigger of the external sync runs through the exact same orchestration path as the automated scheduler.

### 5.8 Notifications
- Five independent opt-in preferences, all **default off**: match started, match finished, pool invite, global rank improved, goal scored.
- A goal-scored notification fires when the live total goal count increases while a match is `LIVE`; re-syncing to the same score does not re-fire (dedupe key includes the score).
- A rank-improved notification fires only when a user's **global** dense rank strictly improves after a match is scored; a brand-new user with no prior snapshot is not notified on their first appearance.
- A pool-invite notification fires exactly once per directed invite created.
- **Known modeling gap worth flagging, not silently inheriting**: the recipient set for match-related notifications is, today, "everyone with a prediction on this match" **union** "every member of every league, regardless of whether that league has anything to do with this match." That's broader than it should conceptually be — treat it as a candidate fix during mobile design, not a rule to faithfully reproduce.

### 5.9 Competition data & external sync
- Match data is fetched from football-data.org by **scope**: `FIXTURES` (status filter scheduled, daily), `LIVE_STATUS` (status filter live, every 2 minutes, skipped entirely when no match is within ±3 hours of kickoff or already live — a quota-saving heuristic), `RESULTS` (status filter finished, every 5 minutes), `FULL` (no filter, used only by the one-time seed), `CLEANUP` (no API call, purges old audit rows).
- Country flags are not trusted from the provider — they come from a hand-maintained seed list keyed by 3-letter FIFA code, because the provider's own naming/codes are inconsistent with footballing convention (e.g. England/Scotland/Wales aren't ISO countries).
- Every sync run is followed by a sweep that re-scores any finished-but-unscored match — a backstop independent of the main sync path.
- Live result updates are propagated to connected clients via a **signal-only** broadcast (no payload, just "something changed, go refetch") — chosen specifically because the hosting model can't hold a long-lived server-side socket connection per client.

## 6. The request-gating state machine (`proxy.ts` — Next.js Middleware)

This is **the single most domain-critical piece of cross-cutting logic** in the source app — it is not a "web detail," it *is* the access-control state machine for the whole product, just implemented as edge middleware. Any platform (web or mobile) needs an equivalent gate, evaluated in this exact order, on every authenticated navigation:

1. A session whose `account_deleted` claim is explicitly `true` is ejected (forced sign-out) — even though the JWT itself still verifies, because asymmetric tokens remain valid until their own expiry regardless of server-side state.
2. An unauthenticated user may only reach public routes; everything else redirects to sign-in, remembering the originally intended destination.
3. An authenticated-but-unconfirmed-email user is forced to a "verify your email" screen (with resend/change options), with public routes (including the OAuth/confirm callbacks themselves) still reachable so confirmation can complete.
4. An authenticated+confirmed user landing on an auth-only screen (sign-in/sign-up/forgot-password/verify-email) bounces to the home screen — **unless** they still owe a pending MFA challenge (the gate explicitly lets that case through so the challenge can complete).
5. An authenticated+confirmed user who hasn't finished onboarding is redirected to onboarding from anywhere else, carrying the original intended destination so they land there once done.
6. Otherwise, proceed.

Important nuance baked into the source app: each claim-based check (`account_deleted`, `email_verified`, `onboarding_completed`) **fails open** when the claim is simply *absent* (e.g., a token minted before a claim was introduced) — only an *explicit* `true`/`false` triggers the corresponding gate. This was a deliberate choice to avoid mass session bounces on a deploy that introduces a new claim, and the action/query layer (e.g., a server-side onboarding check before any mutation) is the documented second line of defense for exactly this edge case. Preserve the same "fail open on absence, strict on explicit value" semantics if mobile re-derives this from the same JWT claims.

## 7. Cross-feature / cross-flow dependency map

```
auth ──────────────→ pools            (account deletion transfers/deletes owned leagues)
profile ───────────→ notifications    (onboarding's notification step subscribes + sets all 5 prefs true)
profile (getOnboardedUserId) is a load-bearing dependency of nearly every mutating flow:
   pools (create/rename/visibility/invite-toggle/directed-invite), predictions (save/reset)

predictions ───────→ profile          (must be onboarded to predict)
predictions ───────→ competition      (reads match/team/fixture data)
predictions ───────→ scoring-rankings (reads resolved points for display)

pools ─────────────→ profile          (must be onboarded to create/manage)
pools ─────────────→ notifications    (directed invite → POOL_INVITE event — the only place this event is queued)
pools ─────────────→ scoring-rankings (membership changes invalidate the leaderboard cache)

competition ───────→ notifications    (every match update during sync emits MATCH_STARTED/FINISHED/GOAL_SCORED events)
competition ───────→ scoring-rankings (every sync run ends with a sweep that scores finished-unscored matches)

scoring-rankings ──→ notifications    (scoring a match emits GLOBAL_RANK_IMPROVED events for users whose rank rose)
scoring-rankings ──→ scoring          (imports the shared pure algorithm — never redefines it)

admin ─────────────→ competition      (manual sync trigger uses the same orchestration as the scheduler; broadcasts the "refetch" signal)
admin ─────────────→ scoring-rankings (forcing/reverting a result calls the scoring engine directly and synchronously)
admin ─────────────→ scoring          (validates admin-entered penalty scores against the derived winner)

education ─────────→ scoring          (the educational calculator imports the same constants/function as real scoring — must never own its own copy)
predictions ───────→ education        (the real prediction-vs-result UI reuses education's score-breakdown explainer component)
```

**Reading this for Inception decomposition**: `profile` (specifically, "is this user fully onboarded") and `auth` (specifically, "is this session valid/confirmed/not-deleted") are foundational — almost every other unit depends on them being correct before it can be built/tested meaningfully. `scoring` is a true leaf (zero inward dependencies) and is the safest, highest-value first slice to port as a standalone shared package. `notifications` is purely a consumer of events emitted by `pools`, `competition`, and `scoring-rankings` — it has no flows of its own that originate user-facing actions other than preference/subscription management.

## 8. Notable quirks worth knowing about before "faithfully" porting

- `remember_me` cookie is set on sign-in but nothing in the source app currently reads it back to actually extend a session — likely an unfinished feature, not a rule to replicate literally.
- `isFrozen()` / `getCompetitionLockTime()` (a "is the tournament locked for membership changes" concept) still exists in the codebase but is **deliberately disconnected** from any actual gate since the membership-freeze rule was removed — don't resurrect the freeze behavior based on finding this function.
- The notification recipient-selection for match events is broader than it conceptually should be (see §5.8) — a known gap, not a spec.
- Country "ISO 3-letter code" in this product means the **FIFA trigram** (footballing convention, e.g. `GER`, `NED`), not actual ISO 3166-1 alpha-3 — don't conflate the two when sourcing team data.

## 9. Related memory files

- [project-inventory.md](project-inventory.md) — full file/route/model/action catalog this overview was distilled from.
- [migration-analysis.md](migration-analysis.md) — what of the above is portable as-is to React Native vs. needs a different mechanism, and the open architecture questions to resolve before/at Inception.
