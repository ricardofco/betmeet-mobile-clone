# Bolt 13 — Design

> Builds on `model.md` (checkpoint-approved 2026-07-06). The one blocking
> item, §9 item 1 (ADMIN-3's missing sync-orchestration mechanism), was
> resolved at that checkpoint: **ADMIN-3 is narrowed to a manual trigger for
> the already-existing `sweepFinishedUnscoredMatches()` (Bolt 10, ADR-050)**,
> labeled honestly in the UI as a re-check/rescoring action, never "sync."
> This stage resolves model.md §9's six remaining open items (2-7), designs
> ADMIN-2's consequently-redesigned shape, and produces the
> component/data-flow/capability/state/theming design for ADMIN-1..5.

## 0. §9 item 1 — recorded as resolved, not re-opened

`model.md §9` item 1 and its ADMIN-2 consequence are now **CONFIRMED, final**:
ADMIN-3 ships as `admin.triggerScoringSweep`, a thin, honestly-labeled wrapper
around `sweepFinishedUnscoredMatches()` — no football-data.org client, no
scheduler, no `provider_sync_runs` writer is built by this bolt. §1 below
designs ADMIN-2's own consequent redesign in full.

## 1. ADMIN-2/3 — merged, narrowed, and redesigned around the real mechanism

### 1.1 What actually exists to show

Read directly (not assumed): `backend/src/services/scoring/score-sweeper.ts`
already returns `Promise<number>` (the count of stale matches it found and
scored), not `void` — the additive change model.md §9 item 1 anticipated
("may need a small additive change to return sweep results") **turns out to
already be in place** from Bolt 10's own implementation. No signature change
is needed to `sweepFinishedUnscoredMatches()` itself.

What is genuinely missing is **any record of *when* it last ran** —
`score-sweeper.ts` is purely a stateless, on-demand function; nothing
persists a "last run" timestamp anywhere, and `rankings.getGlobalRanking`/
`getPoolLeaderboard`/`predictions.getMyPredictions` already call it silently
on every read (ADR-050) with no caller ever recording the outcome.

### 1.2 Decision — one merged "Rescoring sweep" screen, in-memory last-run tracking, no new persistence

**ADMIN-2 and ADMIN-3 stop being two separate stories with two separate
screens.** They are mechanically the same thing (a read of, and a manual
trigger for, the one existing sweep function) — modeling them as a
dashboard-plus-separate-trigger the way betmeet-clone's real
`provider_sync_runs`-backed dashboard does would manufacture a distinction
this backend cannot actually back up. One screen, `sweep-status-screen.tsx`,
shows:

- **Last-run-at** + **matches scored in that run** — sourced from a new,
  tiny, in-process (not DB-persisted) tracker:

  ```
  backend/src/services/scoring/sweep-status.ts   (new, ~15 lines)

  let lastRunAt: Date | null = null;
  let lastSweptCount: number | null = null;

  export function recordSweepRun(count: number, at: Date = new Date()): void {
    lastRunAt = at;
    lastSweptCount = count;
  }
  export function getSweepStatus(): { lastRunAt: Date | null; lastSweptCount: number | null } {
    return { lastRunAt, lastSweptCount };
  }
  ```

  `score-sweeper.ts`'s `sweepFinishedUnscoredMatches()` gains one additive
  line — `recordSweepRun(staleMatches.length)` right before its existing
  `return staleMatches.length` — a genuinely small, non-behavior-changing
  addition, not a rewrite. This means the tracked "last run" reflects the
  **true** last invocation of the backstop **regardless of what triggered
  it** — an admin's explicit tap, or any user opening Rankings/Predictions a
  moment earlier. This is deliberately **more honest** than tracking
  admin-triggered runs only: it answers "when did this app's rescoring
  backstop last actually run," which is the real question ADMIN-2 exists to
  answer, without pretending an admin-only audit trail exists when it
  doesn't.
- A **"Re-check for unscored finished matches"** button —
  `admin.triggerScoringSweep`, calling the same
  `sweepFinishedUnscoredMatches()` directly, then returning the fresh count
  + timestamp.

**Explicitly NOT built**: any per-run history list/table (betmeet-clone's
"25 most recent runs," BR-7.10), any per-scope breakdown
(`TEAMS|FIXTURES|LIVE_STATUS|...` — this backend has no scopes, there being
no provider sync), and no write to `provider_sync_runs` (it stays exactly as
Bolt 13's own model.md §3/§8 found it: schema-provisioned, zero consumers,
unchanged by this bolt). `provider_sync_runs` is **not** repurposed to store
this tracker either — a one-row proxy table for an in-memory fact would
misrepresent the table's real (unused) purpose and invite a future reader to
assume it holds genuine provider-sync history it never will.

**Copy, honest per the checkpoint's instruction**: screen title
`admin.sweep.title` = "Rescoring sweep" (not "Sync"); a description line
explicitly states what this does and, as importantly, what it does **not**
do — e.g. *"Checks for finished matches that haven't been scored yet and
scores them. This app has no connection to any external results feed — this
does not fetch new match data."* This framing is deliberately blunt, per the
checkpoint's explicit instruction not to misrepresent the feature as a sync.

**Flagged for checkpoint (not a blocker, but a real architectural choice
worth a nod)**: the tracker is **process-memory-only** — it resets to
"never" on every backend restart, and would not be consistent across
multiple backend instances if this service were ever horizontally scaled.
Given this is a single local Express process with no such scaling on the
horizon (`tech-stack.md`), and the alternative (a new DB column/table just to
persist one timestamp + one count) is disproportionate scope growth for a
narrowed, honestly-low-stakes read, this is judged the right-sized choice —
but it is a genuine trade-off, not a non-decision, so it's named here rather
than silently assumed.

## 2. ADMIN-1 — authorization gate: mobile-side plumbing (model.md §9 item 2)

### 2.1 Decision — gate inside the screens themselves; `auth-guard.ts`/`ScreenClass` untouched

Per model.md §2's own reasoning (re-confirmed, not re-litigated): extending
`ScreenClass`/`evaluateGuard()` would require smuggling a DB-derived,
non-JWT fact (`verificationStatus`) into the Zustand `AuthClaims`-shaped
session store that `evaluateGuard()` is a **pure function** over — no async
DB call happens inside that function today, and adding one would be a
structural change to a six-rule gate this repo has treated as stable and
verified-by-decision-table since Bolt 1, disproportionate for hiding one
Settings row. **Decision: option (b)** — gate purely inside the Admin
surface itself, `auth-guard.ts`/`screen-registry.ts`'s existing `['protected']`
tag scheme is reused unchanged (same tag as `Home`/`Predictions`/`Pools`/
`Rankings`/`Education` — reachability still requires being authenticated,
email-verified, MFA-clear, and onboarded; nothing admin-specific is encoded
in the tag).

### 2.2 The two enforcement points (defense-in-depth, mobile side)

1. **Settings-row visibility** (`account-settings-screen.tsx`) — a new row,
   rendered **only** when a dedicated `useAdminAccessQuery()` hook resolves
   `isAdmin: true`; while loading, the row is simply not rendered (no flash
   of a wrong state, same "don't show, don't guess" discipline
   `pool-detail-screen.tsx`'s existing conditional-button pattern already
   uses for membership-gated buttons, Bolt 7 design.md §7.2). This is a UX
   nicety only — model.md §2/§7's "advisory client" framing applies fully:
   hiding the row from ~all users is real product polish, not a security
   boundary.
2. **`AdminHomeScreen`'s own mount-time re-check** (inside the `admin`
   remote, §5 below) — calls the **same** capability again, independently,
   not reusing whatever cached result the host's Settings screen already
   had. Renders `LoadingState` while pending, an explicit access-denied
   `ErrorState` if `false`, and the real dashboard only if `true`. This is
   the mobile-side instantiation of BR-7.1/7.13's "double defense" — one
   layer hides the entry point, a second, independent layer re-confirms
   right before rendering anything sensitive, mirroring this repo's
   established "advisory client, authoritative server" discipline
   (ADR-023/038) one level down (advisory **client-side gate**, re-checked
   **twice** client-side, with the real authority living entirely
   server-side regardless, per §7 below).

Both call sites hit the same new `admin.checkAccess` capability (§3) — one
physical capability, two callers, the same "one implementation, several
callers" discipline this repo already applies to pure functions
(ADR-015/017) and now applies to a capability contract instead.

## 3. How mobile learns "am I an admin" (model.md §9 item 4)

### 3.1 Decision — a dedicated `admin.checkAccess` capability, NOT an addition to `profile.getProfile`

Weighed both options named in the task brief; chose the dedicated capability
for three concrete reasons, not just "keeps things separate":

1. **Contract hygiene.** `profile.getProfile`'s response
   (`nickname`/`avatar`/`locale`/`cooldown`) is a hot, frequently-fetched,
   stable contract every authenticated user's Settings screen already reads.
   Adding an admin-specific field there grows that payload for the ~100% of
   users for whom it's always `false`, entangling an unrelated,
   security-relevant concern with an unrelated feature's data shape — the
   same "don't conflate concerns" instinct model.md §2 already applied to
   keep admin status out of `AuthClaims`.
2. **Caching correctness.** `profile.getProfile` is a snapshot users expect
   to be reasonably long-cache-lived (nickname/avatar rarely change
   mid-session). A security-relevant boolean piggybacked onto it would
   inherit that same caching policy, risking a stale `isAdmin` read exactly
   where freshness matters most. `admin.checkAccess` gets its own explicit,
   short/no-cache TanStack Query policy (`staleTime: 0`), independent of
   `profile.getProfile`'s existing, unrelated cache tuning — an **additive**
   new capability, zero changes to `profile-api.ts`'s existing contract.
3. **Matches the ubiquitous language.** ADMIN-1 (model.md §2) is its own
   named domain concept — "the authorization gate" — not a side-fact of
   Profile. Giving it its own capability under `admin.*` keeps that 1:1,
   the same way `rankings.*`/`pools.*` each own their own capability group
   rather than bolting fields onto `profile.*` or `competition.*`.

```
GET-shaped (no body): admin.checkAccess → { isAdmin: boolean }
```

Never returns an `{ ok: false }` failure shape — any authenticated user may
call it; the interesting information **is** the boolean, not a rejection.

## 4. `admin` Module Federation placement — real re-examination (model.md §9 item 3)

### 4.1 The question

`requirements.md §7.4`/`system-context.md §4` default `admin` to **Remote**
("desktop-dashboard-shaped, infrequent, admin-only audience"). Bolts 7/9/10/12
each did a real re-examination rather than rubber-stamping an inherited
default (ADR-032→036, ADR-017 change, ADR-048 change, ADR-052 reconfirm).
This bolt does the same check against ADMIN-1..5's now-fully-modeled scope.

### 4.2 Evidence gathered

1. **Cross-feature dependency map** (model.md §9 item 3, confirmed there):
   only **outbound** edges exist — `admin ──→ competition`,
   `admin ──→ scoring-rankings` (rescoring trigger target), `admin ──→
   scoring` (shared pure algorithm import, never redefined). **Zero**
   inbound edges — no other feature ever reaches into `admin`. Same
   directionality class that let `education`/`pools` reconfirm as remotes
   without a render-blocking outbound pull forcing host co-location
   (contrast `competition`'s ADR-017, forced by a real inbound
   `predictions → competition` render dependency).
2. **Unlike every other bolt's placement question, `admin` has *no existing
   screen anywhere that already owns it*.** Rankings-1 had an obvious home
   (a 4th tab, matching `predictions`' single-screen shape); Rankings-2 had
   an obvious existing screen to extend (`pool-detail-screen.tsx`);
   Education had Bolt 0's literal pre-existing demo mechanism to relocate.
   Admin is the first bolt with a genuinely freestanding surface and zero
   precedent pulling it toward the host or an existing remote.
3. **Multi-screen, form-heavy shape — closer to `pools` (6 screens,
   ADR-032/034) than to `predictions`/`rankings-1` (one screen each).**
   ADMIN-1..5 need four real screens (`AdminHomeScreen`, `SweepStatusScreen`,
   `ForceResultScreen`, `RevertOverrideScreen`), each with its own local form
   state and, for the two mutating screens, a real match-picker sub-flow —
   the same "own internal stack navigator" shape Bolt 7's evidence trail used
   to justify `pools` as a remote, not the single-screen shape that argued
   `predictions`/`rankings-1` onto the host.
4. **A genuinely rare-audience surface, unlike every other remote/host
   screen shipped so far.** Every existing tab (`Home`/`Predictions`/`Pools`/
   `Rankings`) and even `Education` (low-frequency, but every user
   eventually opens it) is reached by the general user population. Admin is
   reached by, in practice, zero users for the overwhelming majority of app
   installs — the Settings row is hidden from everyone but the one seeded
   `ADMIN` account (§8). Deferring this bundle's download until that
   specific person taps that specific row is a **real, quantifiable** win
   here in a way it wasn't for Rankings (every user hits Rankings routinely,
   so lazy-loading it would have saved zero bytes for the common case) —
   this is the first bolt where "keep the host bundle lean" (this project's
   own stated Re.Pack discipline) has a genuine, non-boilerplate payoff.
5. **No new native module** — plain Tamagui forms + numeric `TextInput`s +
   `FlashList` for the match picker (already-linked). No blocker either way
   from this angle, same finding every prior remote/host placement check has
   made.
6. **MF-singleton risk is fully proven already, zero new categories.**
   `admin` will be the **second** remote (after `pools`) to need
   `@tanstack/react-query` as an MF-shared singleton (real mutations exist
   here, unlike `education`), and it needs the same `tamagui`/
   `i18next`+`react-i18next`/`react-dom` shim trio every remote since Bolt 9
   has already proven safe (§9 below). **No new singleton category is
   introduced** — unlike `education`'s still-being-verified `AsyncStorage`
   risk (ADR-056), `admin` introduces zero net-new MF risk classes, only
   reuses already-validated ones.

### 4.3 Decision — RECONFIRMS the Inception default, with fresh reasoning

**`admin` ships as this repo's THIRD real Module Federation remote**
(`src/remotes/admin/`), unchanged from Inception's placement. This is a
genuine re-examination whose conclusion happens to match Inception's default
(same class of outcome as `education`'s ADR-052 reconfirm), but for reasons
specific to Admin's own now-modeled shape (points 2-4 above are new findings,
not restatements of Inception's one-line rationale) — not a rubber stamp.
`src/remotes/admin/index.js` exposes `./App`, mirroring `education`'s/
`pools`' `exposes` shape exactly.

## 5. Component/screen structure

### 5.1 ADMIN-1 — access gate (no dedicated screen; two enforcement points, §2)

### 5.2 Remote layout

```
src/remotes/admin/
  AdminRemoteEntry.tsx              exposed `./App` — own NativeStackNavigator
                                    (AdminHome / SweepStatus / ForceResult /
                                    RevertOverride), same "remote owns its
                                    internal screen graph, host has zero
                                    compile-time knowledge of it" shape as
                                    `pools` (ADR-032).
  screens/
    admin-home-screen.tsx           ADMIN-1's own mount-time re-check (§2.2
                                    point 2); on `isAdmin:false` renders an
                                    access-denied ErrorState with no further
                                    navigation; on `true`, three Card-style
                                    nav buttons: Rescoring sweep / Force match
                                    result / Revert override.
    sweep-status-screen.tsx         ADMIN-2/3 merged (§1) — last-run-at +
                                    matches-scored readout, "Re-check for
                                    unscored finished matches" button.
    force-result-screen.tsx         ADMIN-4 — match picker (admin.listMatches,
                                    filtered to `bothTeamsResolved`) +
                                    ForceResultForm.
    revert-override-screen.tsx      ADMIN-5 — match picker (admin.listMatches,
                                    filtered to `manualOverride: true`) +
                                    RevertConfirmForm (§7's extra-confirmation
                                    UX).
  components/
    admin-match-list.tsx            shared FlashList-based match picker (§9 —
                                    reuses the same `@shopify/flash-list` MF
                                    singleton `pools`/`rankings` already
                                    proved), mirrors betmeet-clone's own
                                    `admin-match-list.tsx` (FIFA-code
                                    labeling, model.md §0.1) without importing
                                    it (ADR-030-style "reimplemented fresh"
                                    convention, applied mobile-side too since
                                    this is genuinely new UI, not a backend
                                    business rule).
    force-result-form.tsx           score/penalty-score TextInputs, penalty-
                                    winner display (derived, never entered —
                                    reuses `@/shared/scoring`'s
                                    `derivePenaltyWinner()` for live preview,
                                    same pattern as EDU-2's calculator), a
                                    mandatory multiline `reason` TextInput
                                    (1-500 chars).
    revert-confirm-form.tsx         shows the match's current forced result +
                                    reason + who/when overrode it, an explicit
                                    "this cannot be undone, no feed will
                                    repopulate this match" warning line (§8),
                                    and a type-to-confirm TextInput (§7)
                                    gating the Confirm button.
  hooks/
    use-admin-access-query.ts       admin.checkAccess, staleTime: 0
    use-sweep-status-query.ts       admin.getScoringSweepStatus
    use-trigger-sweep-mutation.ts   admin.triggerScoringSweep, invalidates
                                    the sweep-status query key on success
    use-admin-match-list-query.ts   admin.listMatches
    use-force-result-mutation.ts    admin.forceMatchResult
    use-revert-override-mutation.ts admin.revertMatchOverride
```

### 5.3 Domain layer — `src/domain/admin/` (framework-free, advisory-only)

Mirrors `src/domain/predictions/prediction-entry-validation.ts`'s existing
shape (Bolt 6) — mobile-side pre-checks that make the form feel responsive,
**never** the actual gate (§7 restates this explicitly, since this is the
highest-blast-radius bolt in the plan):

```
src/domain/admin/
  force-result-validation.ts   validateForceResultScoreBounds(home, away):
                                boolean — 0-50 (NOT predictions' 0-20 bound;
                                admin-forced results are a different, wider
                                input space than a user's plausible-score
                                guess, model.md §5). Penalty-winner-iff-tied-
                                knockout is NOT re-implemented here — it's the
                                exact same rule predictions already encodes,
                                reused as a value import where practical
                                (client-side preview only; the backend re-
                                derives independently regardless, §6).
  admin-match-filters.ts       matchesEligibleForForceResult(rows) — bothTeamsResolved
                                matchesWithActiveOverride(rows) — manualOverride === true
                                Pure array filters over AdminMatchRow (§6),
                                feeding the two screens' match pickers.
```

## 6. Backend capability contracts (`admin.*`, mirroring `rankings-api.ts`/`pools-api.ts` conventions)

Same `POST ${baseUrl}/${capability}` / Bearer-JWT /
`{ok:true,...}|{ok:false,error:...}` contract every prior group uses.

| Capability | Body | Response | Admin-gated? |
|---|---|---|---|
| `admin.checkAccess` | — | `{ isAdmin: boolean }` | No (any authenticated user may ask) |
| `admin.getScoringSweepStatus` | — | `{ ok: true; lastRunAt: string \| null; lastSweptCount: number \| null } \| { ok: false; error: 'FORBIDDEN' }` | Yes |
| `admin.triggerScoringSweep` | — | `{ ok: true; sweptCount: number; ranAt: string } \| { ok: false; error: 'FORBIDDEN' }` | Yes |
| `admin.listMatches` | — | `{ ok: true; matches: AdminMatchRow[] } \| { ok: false; error: 'FORBIDDEN' }` | Yes |
| `admin.forceMatchResult` | `{ matchId, homeScore, awayScore, homePenaltyScore?, awayPenaltyScore?, penaltyWinnerTeamId?, reason }` | `{ ok: true } \| { ok: false; error: 'FORBIDDEN' \| 'NOT_FOUND' \| 'TEAMS_NOT_RESOLVED' \| 'VALIDATION_FAILED' \| 'PENALTY_WINNER_MISMATCH' }` | Yes |
| `admin.revertMatchOverride` | `{ matchId }` | `{ ok: true } \| { ok: false; error: 'FORBIDDEN' \| 'NOT_FOUND' \| 'NOT_OVERRIDDEN' }` | Yes |

```ts
type AdminMatchRow = {
  id: string;
  fifaHome: string | null; fifaAway: string | null;   // display labels only
  homeTeamId: string | null; awayTeamId: string | null;
  bothTeamsResolved: boolean;
  isKnockout: boolean;
  kickoffAt: string | null;
  status: MatchStatus;
  homeScore: number | null; awayScore: number | null;
  homePenaltyScore: number | null; awayPenaltyScore: number | null;
  winnerTeamId: string | null;
  manualOverride: boolean;
  manualOverrideReason: string | null;
  overriddenByNickname: string | null;   // resolved server-side, mirrors nicknameOf() in handlers.ts
  overriddenAt: string | null;
};
```

### 6.1 Why `admin.listMatches` is its own capability, never an extension of `competition.getFixture`

`getFixture` is a **public**, unauthenticated-content-shaped read every
authenticated user's Predictions/Rankings screens already call. Adding
`manualOverride`/`overriddenByNickname`/`manualOverrideReason` fields there
would leak another admin's identity + free-text override justification to
every regular user's fixture fetch unless carefully filtered client-side —
exactly the class of risk ADR-038 (anti-bias masking) already taught this
repo to avoid: **masking/access-control decisions must be computed
server-side, never bolted onto an already-public capability and filtered
client-side.** `admin.listMatches` stays a fully separate, admin-gated
capability for this reason, at the cost of a small amount of duplicated
match-fetching logic with `getFixture` — a deliberate, not accidental,
duplication.

### 6.2 Backend service additions

```
backend/src/services/admin/require-admin.ts
  requireAdmin(userId): Promise<boolean>   fresh prisma.profile.findUnique
                                            every call, mirrors betmeet-
                                            clone's getAdminUserId() (model.md
                                            §2) — never cached across calls.

backend/src/services/admin/force-result-validation.ts
  validateForceResultScoreBounds(home, away): boolean   — 0-50, Number.isInteger
  (penalty-winner-iff-tied-knockout reuses the EXISTING
   validatePenaltyWinnerRule() from prediction-eligibility.ts as-is — same
   rule, same signature, genuinely reusable without modification, model.md §5)

backend/src/services/scoring/sweep-status.ts   (§1.2, new)
```

`admin.forceMatchResult`'s handler, in order: `requireAdmin` →
`NOT_FOUND` → `bothTeamsResolved` → `TEAMS_NOT_RESOLVED` →
`validateForceResultScoreBounds` → `VALIDATION_FAILED` →
`validatePenaltyWinnerRule` → `VALIDATION_FAILED` → **if penalty scores were
also supplied**, independently `derivePenaltyWinner(homePenaltyScore,
awayPenaltyScore)` (reused from `compute-score.ts`, already backend-side)
and reject on mismatch with the submitted `penaltyWinnerTeamId` →
`PENALTY_WINNER_MISMATCH` (BR-7.16, model.md §5) → resolve winner
(score comparison; tied-knockout falls back to the validated
`penaltyWinnerTeamId`; tied-non-knockout → `null`) → update the `Match` row
(scores, penalty scores forced `null` unless knockout, `winnerTeamId`,
`status: 'FINISHED'`, `manual_override: true` + the three audit fields) →
**synchronously call the existing `scoreMatch(matchId)`** (Bolt 10,
unchanged — its own doc comment already anticipated this exact caller,
model.md §0 point 6) → `{ ok: true }`.

`admin.revertMatchOverride`'s handler: `requireAdmin` → `NOT_FOUND` →
`NOT_OVERRIDDEN` (if `!match.manual_override`) → clear all score/penalty/
winner/audit fields, `status: 'SCHEDULED'` → **synchronously call
`scoreMatch(matchId)` again** (unchanged — its own existing
not-scoreable-anymore branch already deletes the match's `PredictionScore`
rows, `score-match.ts:45-48`, exactly as model.md §6 describes) →
`{ ok: true }`. No new backend logic is needed in `scoreMatch`/
`isMatchScoreable` at all — both are reused completely as-is.

## 7. ADMIN-5's extra-confirmation UX (model.md §9 item 7) — decision, flagged for explicit sign-off

**Decision: yes, add a client-side type-to-confirm step**, beyond the
existing mandatory `reason` field pattern ADMIN-4 already has (which ADMIN-5
does **not** get — betmeet-clone's own `revert-override.ts` has no reason
field, and this bolt doesn't invent one not present in source, per fidelity).
`revert-confirm-form.tsx` requires the admin to type the two teams' FIFA
codes (e.g. `"ARG-FRA"`, sourced from the picked match, no memorization
needed since it's shown right above the input) before the Confirm button
enables. This is **purely a mobile-UX friction device** — same reasoning
model.md §7 named (mobile's double-tap risk vs. a desktop confirm dialog) —
**not** server-validated (the server has no way to check a "did the admin
mean it" string meaningfully; that's a UI device, not a security control).
`admin.revertMatchOverride`'s body stays exactly `{ matchId }` (§6) — no
`confirmationText` field is sent to the backend at all.

**Flagged explicitly per the task brief's own instruction**: this is a
judgment call on the highest-blast-radius, least-reversible mutation in the
entire bolt plan (model.md §6/§7 — no snapshot of the prior result exists in
either app, and this mobile backend has no sync to ever repopulate a real
result afterward). The type-to-confirm mechanism is a reasonable, standard
mobile pattern, but **whether it's sufficient, or whether this action instead
deserves something closer to Bolt 8's account-deletion-style "confirm on a
separate screen with the consequence spelled out" treatment**, is a genuine
product-risk call, not a mechanical one — surfaced for explicit human
sign-off before ADR/Implement, not assumed correct by default.

## 8. ADMIN-4's reframed product copy (model.md §9 item 6)

**Decision: yes, the mobile UI states this plainly.** `force-result-screen.tsx`
carries a description line (not buried in help text) —
*"This app has no automatic results feed. Forcing a result here is currently
the only way a match becomes finished with scores."* — rather than silently
inheriting betmeet-clone's "occasional correction on top of a normally-
reliable feed" framing, which model.md §5 confirmed does not describe this
app's actual situation. The same honesty instinct as §1's sweep-screen copy.

## 9. Federation config (new remote, zero new singleton categories)

```
rspack.config.admin-remote.mjs   (new, modeled on rspack.config.pools-remote.mjs)
  entry: './src/remotes/admin/index.js'
  output: 'build/admin/[platform]', uniqueName: 'admin'
  alias: '@' → src/, 'react-dom' → src/shared/shims/react-dom-native.ts (ADR-045, reused unchanged)
  shared:
    tamagui (singleton) — 3rd remote to carry it (education, pools already do)
    i18next / react-i18next (singleton) — 3rd remote
    @tanstack/react-query (singleton) — 2nd remote (after pools); real
      mutations exist here, unlike education
    @shopify/flash-list (singleton) — 2nd remote (after pools) for the
      match-picker list
```

`package.json` gains `"start:admin": "react-native start --config
rspack.config.admin-remote.mjs --port 8084"` (next free port after
education/pools' 8082/8083). Host's `admin-screen.tsx` (new,
`src/host/navigation/screens/`) is a direct structural copy of
`education-screen.tsx` (§10): `lazy(() => import('admin/App'))` +
`RemoteBoundary` + retry — the exact, already-twice-proven mechanism, no new
pattern invented.

**No AsyncStorage, no new native module, no new MF-singleton *category* at
all** — every shared dependency this remote needs has already been proven
safe on a real device build at least once (`tamagui`/`i18next`/`react-dom`
shim: `pools`+`education`; `@tanstack/react-query`+`@shopify/flash-list`:
`pools`). This is the first remote in the whole plan to introduce **zero**
net-new MF risk — a real, quantifiable advantage over every prior remote's
first retrofit (contrast `education`'s still-being-verified `AsyncStorage`
question, ADR-056), worth naming explicitly since it lowers this already
high-blast-radius bolt's implementation risk on at least this one axis.

## 10. Host navigation registration

```
src/host/auth/navigation/auth-stack-params.ts
  SettingsStackParamList  gains  Admin: undefined

src/host/auth/navigation/screen-registry.ts
  Admin: ['protected']   // same tag as every other Settings row

src/host/navigation/screens/admin-screen.tsx   (NEW, thin host wrapper — see §9)

src/host/navigation/root-drawer-navigator.tsx
  SettingsStackNavigator gains one more <SettingsStack.Screen name="Admin" .../>
  (title: t('settings.rows.admin'))

src/host/settings/screens/account-settings-screen.tsx
  gains a new row, rendered ONLY when useAdminAccessQuery().data?.isAdmin
  is true (§2.2 point 1); onPress → navigation.navigate('Admin')
```

Deliberately **not** a Home-screen button (unlike `education`'s ADR-053) and
**not** a new tab (unlike `rankings`'s ADR-048) — Settings is the right
location precisely because, unlike Education, this entry point is meant to
be genuinely invisible to the ~100% of users who aren't the seeded `ADMIN`
account, and Settings/account-management is where this repo already puts
account-scoped, infrequently-used affordances (`DeleteAccount` sits in the
exact same list today).

## 11. A `seed-admin`-equivalent script for this backend (model.md §9 item 5)

```
backend/src/scripts/seed-admin.ts   (new, mirrors seed-competition.ts's shape
                                     — a standalone, manually-run script, not
                                     an HTTP endpoint, never reachable from
                                     the app itself, model.md §2's "never set
                                     by application code" invariant)

  Usage: `npx ts-node backend/src/scripts/seed-admin.ts <email>`
  1. Resolves <email> to a Supabase auth user id — reuses the SAME raw
     cross-schema `auth.users` lookup pattern already established by Bolt
     8's `resolveInviteTarget()`/directed-invite service (proven to work
     against this project's real DB role, activeContext.md), rather than
     inventing a second lookup mechanism.
  2. prisma.profile.upsert({ where: { id: userId }, create: { id: userId,
     avatarUrl: '', verificationStatus: 'ADMIN' }, update: {
     verificationStatus: 'ADMIN' } }) — idempotent, safe to re-run.
  3. Logs the resolved nickname (if any) + confirmation.
```

No demotion/revoke path is built (out of this bolt's modeled scope, model.md
doesn't ask for one) — promotion-only, matching betmeet-clone's own
`seed-admin.ts` shape exactly (model.md §0 point 3).

## 12. State boundaries

| State | Owner | Mechanism |
|---|---|---|
| "Am I an admin" (Settings-row visibility) | host `AccountSettingsScreen` | `useAdminAccessQuery()` — `['admin','checkAccess']`, `staleTime: 0` |
| "Am I an admin" (remote entry re-check) | `admin` remote, `AdminHomeScreen` | own independent call to the same capability, own query instance — not shared cache with the host's |
| Sweep status | `admin` remote | `['admin','sweepStatus']`, invalidated by the trigger mutation's `onSuccess` |
| Match list (picker) | `admin` remote, per screen | `['admin','matches']`, `select`-filtered per screen via `admin-match-filters.ts` (§5.3) — one fetch, two different pure-function views, same "derive at read time" precedent as `buildRankedView` (ADR-019) |
| Force-result form fields | `ForceResultForm`, local | `useState` per field, ephemeral |
| Revert type-to-confirm text | `RevertConfirmForm`, local | `useState`, ephemeral |
| Selected match (either picker) | screen-local | `useState<string \| null>`, not shared across screens |

No new Zustand store — nothing here is cross-cutting client state, same
conclusion every prior bolt since Bolt 7 has reached for its own new surface.

## 13. Theming

Every new component (`AdminHomeScreen`, `SweepStatusScreen`,
`ForceResultScreen`, `RevertOverrideScreen`, `ForceResultForm`,
`RevertConfirmForm`, `AdminMatchList`) is built **Tamagui-first from the
start**, composing `src/shared/design/primitives.tsx` (`Screen`/`Card`/`Row`/
`Heading`/`BodyText`/`MutedText`/`PrimaryButton`/`LoadingState`/`ErrorState`)
with zero new tokens — same primitives every Bolt-9-onward screen reuses.
`AdminMatchList`'s `FlashList` rows stay plain `StyleSheet` internally, same
documented list-perf exception `pools`/`rankings` rows already use. The
danger-toned "Revert" action reuses the existing `$danger` token
`AccountSettingsScreen`'s `DeleteAccount` row already established, rather
than inventing a new destructive-action color. Dark/light-correct on first
paint via the host's `<TamaguiProvider defaultTheme>` through the now-3x-proven
`tamagui` MF singleton (§9) — no retrofit needed, every screen here is net-new.

## 14. Testing approach preview

- **Domain** (`src/domain/admin/`): `validateForceResultScoreBounds` (0-50
  boundary cases, including the >20-but-≤50 case that must pass here but
  would fail predictions' own 0-20 bound — an explicit regression proving
  the two bounds are genuinely independent, not accidentally shared);
  `admin-match-filters.ts`'s two pure filters.
- **Backend**: `requireAdmin()` (true/false/no-profile-row cases);
  `force-result-validation.ts`'s bounds; the `PENALTY_WINNER_MISMATCH`
  cross-check (BR-7.16, the same regression-worthy case Bolt-model.md
  flagged); `forceMatchResult`'s full effect (Match row + synchronous
  `scoreMatch` rescore — reuses Bolt 10's own idempotency test fixtures);
  `revertMatchOverride`'s delete-branch (every `PredictionScore` for that
  match actually gone, not zeroed); `sweep-status.ts`'s tracker (starts
  `null`, updates after a call, independent of which caller triggered the
  underlying sweep) — real curl + DB verification against the live Supabase
  DB, this repo's established Bolt 7/8/10 precedent, given this is the
  highest-blast-radius bolt in the plan.
- **Component (RNTL)**: `AdminHomeScreen`'s access-denied vs. dashboard
  branches; `SweepStatusScreen`'s never-run vs. has-run states;
  `ForceResultForm`'s tied-knockout-requires-penalty-winner case (the same
  "explicit tied-entries test" discipline as Bolts 10/12); `RevertConfirmForm`'s
  confirm-button-disabled-until-exact-match-typed behavior.
- **Device/E2E**: deferred to the user's own manual pass per standing
  preference (`agent-device` not invoked). One path worth naming now: with
  the seed-admin script run against a real test account, confirm the
  Settings row is genuinely absent for a non-admin session and genuinely
  present + functional for the seeded admin session — the one Jest cannot
  meaningfully simulate end-to-end across two different real accounts.

## 15. Summary of decisions requiring ADRs (written next stage)

1. **`admin` ships as this repo's third MF remote** — a real re-examination
   reconfirming Inception's default for reasons specific to this bolt's
   modeled shape (§4), same class of record as ADR-052, not a rubber stamp.
2. **ADMIN-2/3 merge + narrow** — one "Rescoring sweep" screen wrapping the
   existing `sweepFinishedUnscoredMatches()`; in-memory, non-persisted
   last-run tracking; deliberately honest, non-"sync" copy (§1) — flagged
   for a checkpoint nod on the in-memory-only trade-off.
3. **ADMIN-1's mobile-side gate stays outside `auth-guard.ts`/`ScreenClass`**
   — two independent client-side checks against a new, dedicated
   `admin.checkAccess` capability; the real authority stays entirely
   server-side, unchanged (§2/§3).
4. **`admin.listMatches` is deliberately a separate capability from
   `competition.getFixture`**, never an extension of it — an ADR-038-style
   anti-leak decision (§6.1).
5. **ADMIN-4/5's backend validation** — force-result gets its own 0-50
   score-bounds check, genuinely independent of predictions' 0-20 bound;
   `validatePenaltyWinnerRule`/`derivePenaltyWinner`/`scoreMatch`/
   `isMatchScoreable` are all reused completely unchanged (§6.2).
6. **ADMIN-5's mobile-only type-to-confirm addition** beyond betmeet-clone's
   own shape (§7) — flagged for explicit human sign-off given this
   mutation's blast radius, not a routine record.
7. **`seed-admin.ts` script design** (§11) — mirrors `seed-competition.ts`'s
   shape, reuses Bolt 8's existing cross-schema email-lookup pattern rather
   than inventing a second one.

---

**Checkpoint:** Design stage complete. Three items are flagged for explicit
human attention before ADR stage, not routine records:

1. **§1.2** — the sweep-status tracker is intentionally in-process/
   non-persisted (resets on backend restart, not multi-instance-safe). Judged
   proportionate for this narrowed, honestly-low-stakes read; flagged as a
   genuine trade-off, not a non-decision.
2. **§7** — ADMIN-5's extra-confirmation mechanism (client-side
   type-the-FIFA-codes) is a judgment call on the single highest-blast-radius,
   least-reversible mutation in the entire bolt plan (no snapshot, no sync to
   ever repopulate real data afterward). Recommend explicit sign-off on
   whether this level of friction is sufficient before Implement builds it,
   rather than treating it as settled by this Design pass alone.
3. **§4** — the `admin` remote reconfirms Inception's placement, but this is
   the **first genuinely freestanding remote** in the plan (no existing
   screen anywhere pulls toward host or another remote), a different kind of
   evidence shape than any prior placement check; worth a second look given
   this bolt's overall blast radius, even though the investigation itself
   found no reason to deviate.

No item blocks proceeding to ADR stage on its own — all three are informed,
evidence-based calls, not missing facts — but per this bolt's own elevated
risk profile (model.md §7's mutation risk register), they're surfaced
explicitly rather than folded silently into the ADR write-ups.
