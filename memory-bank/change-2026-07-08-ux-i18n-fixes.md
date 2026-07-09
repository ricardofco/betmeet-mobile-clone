# Change 2026-07-08 — UX/i18n fixes (post `/change` evaluation)

A `/change` evaluation was run on 4 items the user found during their own
manual Layer 2 (device) testing pass. All 4 were approved with specific
decisions; this record covers the fix-forward Implement pass that followed
(a separate Test pass follows this record).

## Item 1 — i18n completion (Class A: hardcoded English strings)

**Classification**: genuine Implement-stage misses across many bolts (0-8),
not a new requirement — every prior bolt's own retrofit was explicitly
scoped/documented as partial (`en.ts`'s own header comment, Bolt 9's
`implement-and-test.md §6`).

**What was found**: a fresh, full sweep of `src/host/` and `src/remotes/`
(not just the change-evaluation's named offenders) found hardcoded English
in ~40 files across auth (all 8 screens + the merged `VerifyEmailScreen` +
`UnconfirmedEmailPanel`), Settings (change-email/change-password/
delete-account/totp-enrollment), Profile (avatar picker, nickname form, all
5 onboarding step screens, the wizard's completion-error copy), Predictions
(penalty-winner selector, pool-override picker, the match card + its
score-breakdown panel + fixture-list toggle), and the `pools` remote
(settings/create/discover/join-by-token/predictions screens, invite-token
panel, directed-invite form, member row, score stepper, grid cell,
transfer-ownership panel) — plus `AuthGatedNavigator`'s own native-stack
header `title`s (`Sign in`/`Create account`/etc., and the onboarding stack's
`Nickname`/`Avatar`/`Rules`/`Notifications`/`Security` titles), which no
prior i18n retrofit had touched at all.

**What was changed**: every one of the above now calls `useTranslation()`
and reads from new/extended `en.ts`/`es.ts` namespaces (`auth.*`,
`profile.*`, extended `settings.*`/`predictions.*`/`pools.*`) — see
`src/platform/i18n/locales/{en,es}.ts` diffs for the full key list. No
screen's *layout* was touched beyond swapping literal strings for `t()`
calls (Tamagui/StyleSheet choices per-screen were left exactly as Bolt 9
established them — FlashList row components stayed `StyleSheet`, chrome
stayed whatever it already was).

`src/domain/education/rule-content.ts` was explicitly NOT touched by this
item — that's item 2 below.

**Judgment calls**:
- `settings.rows.signOut` is shared verbatim between `MfaChallengeScreen`'s
  existing escape-hatch sign-out link and the new deliberate sign-out row
  (item 3) — per the task's own instruction to keep them consistent.
- A few incidental hardcoded strings not explicitly named in the task brief
  were also fixed as part of the "full sweep" instruction: the "or" divider
  in `SignInScreen` (new `common.or` key) and `AuthGatedNavigator`'s
  previously entirely-unaddressed header titles.

## Item 2 — Rules Center Spanish translation (reopens ADR-055)

**Classification**: the change-evaluation suspected `getFullRules('es')`
might be an English alias — investigated directly, per the task's own
explicit instruction not to assume.

**Finding: no bug existed.** `src/domain/education/rule-content.ts`'s
`ES_RULES` was already real, hand-authored Spanish content (not a copy of
`EN_RULES`), diffed word-for-word against the authoritative source
(`betmeet-clone/content/rules/es/{scoring,penalties,match-locks,ties,pools}.mdx`)
and found to match exactly (minus the markdown bold spans/heading ADR-055
already decided not to re-render). **No code or content change was made.**
`memory-bank/bolts/bolt-12-education/adr-055-rule-content-typed-blocks-no-markdown-library.md`
gained an "Update (2026-07-08)" section documenting this investigation and
its negative result, rather than silently dropping the change-evaluation's
(incorrect) suspicion.

## Item 3 — Sign-out capability (Omitted Requirement)

**Classification**: a genuine Omitted Requirement — `SupabaseAdapter.signOut()`
already existed and was called from 3 non-user-initiated places
(post-account-deletion cleanup in `delete-account-screen.tsx`, the MFA
challenge screen's escape hatch, and `AuthGatedNavigator`'s forced-eject
path), but no normal authenticated user ever had a deliberate way to sign
out. Present in `betmeet-clone`'s real `sign-out.ts`/`user-menu.tsx`, never
captured in any mobile intent/unit brief for this repo (same standing gap
as the missing `units/` directory noted in Bolts 5/6/7/10/12/13 — reconciled
directly rather than inventing a formal story file this repo doesn't use).

**What was changed**: a new "Sign out" row added to
`account-settings-screen.tsx` (alongside password/email/2FA/delete-account,
the natural home), calling `getSupabaseAdapter().signOut()` after a
lightweight `Alert.alert` confirm. No explicit post-sign-out navigation —
mirrors `delete-account-screen.tsx`'s own existing `handleDelete` exactly:
`AuthGatedNavigator` reacts to the now-null session automatically via the
existing `onSessionChange` pipeline (ADR-001/ADR-002).

**Judgment call**: confirmation uses a plain native `Alert.alert`
(Cancel/Sign out), not a Bolt-8-style typed confirm-phrase screen — this
repo's one existing "are you sure" pattern
(`DELETE_ACCOUNT_CONFIRM_PHRASE`) is reserved for a genuinely irreversible,
high-blast-radius mutation. Signing out has no data consequence (the user
can sign back in immediately), so a lightweight confirm is proportionate;
no new dependency/modal component was added.

## Item 4 — My Pools screen (header dedup + action-button redesign)

**Header dedup**: confirmed real — a nested-navigator double-header, not a
duplicated JSX heading. The host's `PoolsStackNavigator`
(`main-tab-navigator.tsx`) already renders a header (title "Ligas"/"Leagues"
+ the `renderHeaderMenuButton` hamburger) around the entire `pools` remote;
the remote's own `MyPools` root screen (`PoolsRemoteEntry.tsx`) rendered a
second header ("Mis ligas"/"My Pools") stacked underneath it. Fixed by
suppressing only `MyPools`'s own header (`headerShown: false`) — the outer
"Ligas" header + hamburger (unaffected, no wiring changes needed) becomes
the single header shown there. Every other pools-remote screen
(`DiscoverPools`/`CreatePool`/etc.) is explicitly unaffected — not reported
broken, left exactly as before.

**Action-button redesign**: the 3 stacked full-width green `PrimaryButton`s
(Create/Discover/Join by code) were replaced with a row of 3 equal-weight,
icon-labeled `ActionCard`s — a new, generic Tamagui primitive
(`src/shared/design/primitives.tsx`) reused from `lucide-react-native`
(`CirclePlus`/`Compass`/`KeyRound`, already an installed dependency since
Bolt 9, zero new MF-singleton risk). `PoolListItem`/`discover-pools-screen.tsx`
were explicitly left untouched — the reported complaint was scoped to the
3 top action buttons only, confirmed by reading the component tree before
touching anything.

## Verification

- `yarn tsc --noEmit`: clean.
- `yarn lint`: clean (0 errors, 0 warnings).
- Full mobile test suite: 701 tests / 108 suites, all green — 19 suites
  that broke when their component under test first adopted `useTranslation()`
  (raw i18n keys rendered instead of English text, since these tests
  predate any i18n usage in their component) were fixed by switching their
  `render(...)` calls to this repo's existing `renderWithQueryClient` test
  helper (`src/host/profile/test-utils/...` / `src/remotes/pools/test-utils/...`,
  already the established pattern for i18n-aware component tests elsewhere
  in this repo) rather than writing new tests — no new test *cases* were
  added, per this pass's Implement-only scope.
- Component tests for the 4 items themselves are explicitly deferred to the
  following Test-stage pass, per the task brief.

## Test stage (Layer 1, automated only — Layer 2 remains the user's own manual pass)

**Final counts**: `yarn tsc --noEmit` clean, `yarn lint` clean (0 errors/0
warnings), **707 tests across 109 suites** (up from 701/108 — +6 new: 3
sign-out tests + 1 header-dedup navigator-options test + 1 en/es key-parity
regression guard + 1 explicit "exactly 3 action cards" test added during this
pass; the remaining ~19 pre-existing suites that switched to
`renderWithQueryClient` for i18n-provider context were already counted in the
701 baseline, not new cases).

**Item 1 (sign-out)** — `account-settings-screen.test.tsx` already carried a
`describe('sign out (Omitted Requirement #3)')` block from a prior pass:
confirm-alert-shown-without-signing-out, destructive-button-confirms-and-calls
`getSupabaseAdapter().signOut()`, cancel-does-not-sign-out. `Alert.alert` is
spied directly via `jest.spyOn` (no prior `Alert.alert`-testing convention
existed elsewhere in this repo to reuse) and its `buttons` callbacks driven
manually. Confirmed passing for the right reason — asserts the real
`getSupabaseAdapter()` mock's `signOut` call count/non-call, not an alert
UI-presence check alone.

**Item 2 (`ActionCard`/`my-pools-screen`)** — the screen's own pre-existing
`my-pools-screen.test.tsx` (unmodified by Implement) already asserted, per
this repo's query-by-role-over-testID convention, that each action is
independently reachable via `getByRole('button', { name })` and navigates
correctly — this kept passing unmodified straight through the `PrimaryButton`
→ `ActionCard` swap, since `ActionCard`'s `accessible: true` +
`accessibilityRole="button"` computes the same queryable role/name shape a
`PrimaryButton` did. One new test was added this pass to close the one gap
that convention doesn't cover on its own: `getAllByRole('button')` returns
exactly 3, guarding against a stray/missing 4th action a future edit could
silently introduce (role+name queries alone can't distinguish "3 correct
actions" from "3 correct actions plus an unrelated 4th"). `PoolListItem` and
its own test suite are confirmed **completely untouched** by this change
(`git diff`/`git status` show zero changes to either file) — still passing
as part of the full 707-test run.

**Item 3 (`PoolsRemoteEntry.tsx` header dedup)** — a navigator-options test
already existed from a prior pass in `PoolsRemoteEntry.test.tsx`, asserting
`MyPools`'s `<Screen>` element carries `headerShown: false` in its `options`
while every sibling screen (`DiscoverPools`/`CreatePool`/`JoinByToken`/
`PoolDetail`/`PoolSettings`/`PoolPredictions`/`PoolLeaderboard`) does not —
via directly invoking `PoolsRemoteEntry()` inline to capture its built
`<PoolsStack.Navigator>` element tree and reading each `<Screen>`'s `options`
prop, since native-stack only ever mounts the initially-focused screen as
real output (a `toJSON()`-based assertion could not have distinguished
"header shown" from "header hidden" for the unmounted siblings, and
`react-native-screens`' own header chrome isn't a queryable rendered node in
the first place). This is the right level to test this at — confirmed, not a
fragile/pointless test.

**Item 4 (i18n key-parity regression guard)** — no such guard existed before
this change; `src/platform/i18n/locales/__tests__/locale-parity.test.ts` was
added (from a prior pass, confirmed here), asserting `en.ts`/`es.ts` expose
the identical set of leaf key paths. Deliberately structural only (proves key
*shape* parity, not translation *correctness* — that's item 2 of the
Implement pass's own explicit distinction). Proportionate given this sweep
touched ~40 files' worth of new keys in one pass, exactly the scenario a
missing-key-in-one-locale bug (this whole change's root cause) would recur in
unnoticed.

**Item 5 (spot-check the ~19 suites switched to `renderWithQueryClient`)** —
4 suites spot-checked directly via `git diff`: `sign-in-screen.test.tsx`,
`prediction-match-card.test.tsx`, `nickname-form.test.tsx`,
`change-password-screen.test.tsx`. All 4 show the same minimal, mechanical
diff shape — only the `render(...)` call site changed to
`renderWithQueryClient(...)` plus the corresponding import swap; every
pre-existing assertion (`getByLabelText('Current password')`,
`getByText('Available')`, literal English button/heading text, etc.) is
untouched verbatim. Confirmed these are genuinely passing because the
component now renders real translated English text inside a working
`I18nextProvider`, not because an assertion was loosened to match a raw i18n
key or a regex.

**Explicitly judged not further coverable at Layer 1**: none beyond what's
already noted per-item above — no gap was found that Layer 1 could
meaningfully close but didn't.

## Follow-up round (same day) — user found 4 more issues on real-device Layer 2 testing

After the pass above, the user's own manual device pass surfaced 4 further
items, all fixed directly (no new `/change` evaluation needed — each is a
narrow, well-scoped fix, not a product decision):

1. **`RemoteBoundary`'s error fallback** (`src/host/remote-boundary.tsx`) —
   "This section couldn't load."/"Tap to retry" was hardcoded English,
   missed by the earlier sweep because it's Bolt-0 scaffolding, not an
   audited "screen." A class component (error boundaries can't be hooks) —
   fixed by having the wrapping `RemoteBoundary` function component resolve
   `t('common.remoteBoundaryError')`/`t('common.remoteBoundaryRetry')` and
   pass them down as props.
2. **Match status / prediction lock-reason labels** — `describeMatchStatus()`
   (`src/domain/competition/match-status.ts`) and `describeLockReason()`
   (`src/domain/predictions/prediction-eligibility.ts`) returned hardcoded
   English literals directly from framework-free domain functions (by an
   established, documented "single source of labels" pattern) — the exact
   root cause of "Scheduled"/"Not available yet" showing in Predictions.
   Fixed by changing both to return an i18n key suffix instead of a literal
   string (`labelKey`/the reason's key), with call sites
   (`prediction-match-card.tsx`, `match-card.tsx`) doing the actual
   `t(...)` call — domain stays framework-free, only the *shape* of what it
   returns changed. Also found and fixed the same class of miss in
   `LiveIndicator` (hardcoded "Live"/"LIVE"), used by both `MatchCard` and
   `PredictionMatchCard`.
3. **`pools` remote crash — Hermes parser rejects `lucide-react-native`'s
   `infinity.js`** (`Can't create duplicate variable that shadows a global
   property: 'Infinity'`). Root cause: this same change's item-4 redesign
   (My Pools' `ActionCard` icons) was the first time the `pools` remote ever
   bundled `lucide-react-native` — but `rspack.config.pools-remote.mjs`
   never got the `exclude: /node_modules[\\/]lucide-react-native/` babel-
   swc-loader rule ADR-047 already added to the HOST's config for this exact
   bug. Fixed by adding the identical exclude rule to the pools-remote
   config (mirroring ADR-047, not a new workaround). Verified for real via a
   static `react-native bundle` build (the user's own dev servers were
   already running on the ports this session needed, so a fresh dev-server
   probe wasn't possible — a static bundle build is the same underlying
   compile path and caught the original error just as reliably).
4. **Home screen redesign** — removed `home.subtitle`'s leftover Bolt-0 debug
   copy ("Host bundle is running."/"El paquete host está funcionando."),
   never replaced with real product copy across 3 bolts. Restyled the Rules
   Center entry from a plain `PrimaryButton` in an unstyled `Card` into a
   single tappable feature row (icon + title + description + chevron),
   reusing the `ActionCard`/icon-first visual language My Pools' redesign
   established. Added a new `PressableCard` primitive (`Card` + `pressStyle`
   baked into the `styled()` definition, not an inline JSX prop — avoids
   `react-native/no-inline-styles`) to `src/shared/design/primitives.tsx`,
   reusable beyond this one screen. **Did not** reopen ADR-052/053 — the
   on-demand-load architecture is unchanged, per the user's own earlier
   confirmed decision; only the visual treatment of the existing entry point
   changed.

All 4 verified: `yarn tsc --noEmit`/`yarn lint` clean, **707 tests/109
suites green** (2 pre-existing suites — `match-card.test.tsx`,
`live-indicator.test.tsx` — updated to wrap renders in `I18nextProvider`,
same mechanical fix as the first round's ~19 suites). `pools`-remote build
independently re-verified via a static bundle compile (zero errors, only
the same benign Tamagui warnings every other bundle already has).

No manual Layer 2 paths are newly needed beyond re-confirming: My Pools
still loads without crashing (the Hermes fix), Predictions/pool match cards
show translated status labels, the remote-boundary retry UI's copy is now
in Spanish, and Home's new feature-row design.
