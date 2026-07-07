# Bolt 12 — Model

## 0. Scope reconciliation (no `units/unit-*` story files exist for EDU-1..4)

Same recurring gap already hit and handled the same way in Bolts 5/6/7/10
(see those bolts' `model.md`s): `memory-bank/intents/liga-mundial-mobile-migration/units/`
has no `unit-09-education/EDU-*.md` files in this repo. Per the standing
precedent, scope was reconciled directly against:

1. `memory-bank/project/domain-overview.md` (the cross-feature dependency
   map, §7 in that file) and `memory-bank/project/migration-analysis.md §4`/
   `project-inventory.md` (feature-inventory table, route table, Server
   Actions inventory, services inventory — all cited inline below).
2. **`betmeet-clone`'s real source** (sibling repo,
   `/Users/ricardo/Documents/dynamicdevs/proyectos/kinela/betmeet-clone`) —
   read directly, not just the docs: `src/features/education/` (8
   components + `cue-store.ts`), `src/lib/rules-content.ts`,
   `content-collections.ts` + `content/rules/{es,en}/*.mdx` (5 rule
   documents), `src/app/(app)/rules/page.tsx`,
   `src/features/profile/components/rules-step.tsx` (the onboarding hook),
   `src/i18n/dictionaries/en.ts` (`rules`/`calculator`/`breakdown`/
   `onboarding.rulesStep*` keys).
3. **Bolt 0's own docs and current code** (`memory-bank/bolts/bolt-0-platform-scaffolding/model.md`/`design.md`,
   `src/remotes/education/EducationRemoteEntry.tsx`,
   `rspack.config.education-remote.mjs`) — confirmed the `education` remote
   that exists today is **purely Bolt 0's Module-Federation-wiring demo
   shell**, not real content. `EducationRemoteEntry.tsx`'s own doc comment:
   *"Bolt 0 scaffolds this remote as a near-empty shell to prove the
   host→remote wiring works end-to-end; the real content (EDU-1..EDU-4)
   lands in Bolt 11 [renumbered to 12]"*. It is not registered anywhere on
   the host's navigation today (`grep`-confirmed: no `Education` route
   exists in `src/host/`, no tab/entry references it) — this bolt is where
   that registration happens for the first time too (a Design-stage
   concern, noted here only as a confirmed starting fact).

### Mapping EDU-1..4 to betmeet-clone's real feature set

`betmeet-clone`'s Education feature (`project-inventory.md` line 76: *"Public
landing sections + in-app Rules Center + interactive scoring calculator
(presentational only)"*) has four genuinely distinct, separately-triggered
pieces of user-facing behavior once the **public-landing-only** parts are
excluded (see §6 — mobile has no public unauthenticated surface, so
`ScoringTeaser`/`FeatureGrid` don't have a mobile equivalent to migrate).
Mapped 1:1 onto EDU-1..4, matching the bolt-plan's own two named anchors
("a remote, low-frequency, non-mutating unit" and "Bolt 3 hosts EDU-3"):

| Story | betmeet-clone feature | Evidence |
|---|---|---|
| **EDU-1** | Rules Center — full, in-app content catalog (5 rule documents: scoring, penalties, match-locks, ties, pools), rendered as a collapsible accordion + static worked examples | `content/rules/{es,en}/*.mdx`, `rules-accordion.tsx`, `rules-header.tsx`, `score-breakdown-demo.tsx`, `app/(app)/rules/page.tsx` |
| **EDU-2** | Interactive scoring calculator — live "try it yourself" tool, with a static-table fallback if it errors | `scoring-calculator.tsx`, `calculator-error-boundary.tsx`, `scoring-table.tsx` |
| **EDU-3** | Onboarding's skippable "learn how to play" step — reached from Bolt 3's wizard | `src/features/profile/components/rules-step.tsx`; mobile hook point already scaffolded as a placeholder: `src/host/profile/screens/onboarding-rules-screen.tsx` |
| **EDU-4** | Dismissible educational callouts — per-device, fail-open persistence | `src/features/education/services/cue-store.ts`, `dismissible-callout.tsx` |

**[BEST GUESS — the 4-way split and story-number assignment; the underlying
scope ("these four behaviors exist and are what Education means in this
product") is CONFIRMED against real code.]** This grouping is the natural
one: it matches four separately-mountable pieces (a content browser, an
interactive tool, an onboarding-flow hook, a cross-cutting UI affordance),
mirrors the bolt-plan's own EDU-3-is-onboarding anchor exactly, and leaves
no real `src/features/education/` behavior unaccounted for once the
public-landing exclusion (§6) is applied.

## 1. Ubiquitous language

| Term | Meaning |
|---|---|
| **Rules Center** | The full, in-app catalog of rule documents (EDU-1) — reached from within the app, not the public web. |
| **Rule document** | One piece of content: `slug`, `title`, `order`, `body` (rendered prose), scoped to a locale. betmeet-clone additionally tags each with `audience: 'teaser' \| 'full'`; mobile only ever needs `'full'` (see §6). |
| **Worked example** | A static, pre-computed `ScoreBreakdown` shown next to the Rules Center content, produced by feeding a few fixed `ScoringExample`s through the *same* `computeScore()` Bolt 4 already owns — never its own copy (ADR-016). |
| **Scoring calculator** | The interactive tool (EDU-2): user edits a prediction + an actual result (+ optional penalty shootout for a tied knockout), sees the live `ScoreBreakdown` recompute on every keystroke. |
| **Calculator fallback** | If the interactive calculator throws, it degrades to the static scoring table (`ScoringTable`-equivalent) rather than crashing the screen — an explicit per-feature error boundary, not a bolt-wide one. |
| **Onboarding rules step** | EDU-3: a skippable step inside Bolt 3's wizard that shows a compact scoring summary + a link into the full Rules Center. Never blocks wizard completion; persists no "has the user seen this" state beyond the wizard's own step-completion bookkeeping. |
| **Educational cue** | EDU-4: a small, dismissible callout keyed by a stable `cueId` string, shown by default, hidden once the user dismisses it **on that device**. Fail-open: if local persistence is unavailable or throws, the cue is always shown (never silently hidden, never blocks render). |

## 2. EDU-1 — Rules Center (content catalog)

**[CONFIRMED — `content-collections.ts:8-18`, `content/rules/{en,es}/*.mdx`
(5 files: `scoring.mdx` order 1, `penalties.mdx` order 2, `match-locks.mdx`
order 3, `ties.mdx` order 4, `pools.mdx` order 5), `src/lib/rules-content.ts`,
`src/features/education/components/rules-accordion.tsx`,
`src/app/(app)/rules/page.tsx`]**

- **Content shape** — every rule document has: `slug` (string, stable
  identity), `title` (string), `order` (number, display sort key),
  `audience` (`'teaser' | 'full'`), a `locale`-scoped `body` (compiled
  prose/markup). `getFullRules(locale)` filters `audience === 'full'` and
  sorts by `order` ascending (`rules-content.ts:6-11`).
- **Five real rule documents exist today** (title, order, per
  `content/rules/en/*.mdx` frontmatter — the `es/` set mirrors the same 5
  slugs/orders with Spanish titles/bodies):
  1. `scoring` (order 1) — how points are awarded (exact/result/partial
     stacking, penalty bonus).
  2. `penalties` (order 2) — penalty-shootout predictions in knockout
     stages.
  3. `match-locks` (order 3) — "until when can I predict?" (kickoff-lock
     rule, already ported in Bolt 6's `getPredictionEligibility`).
  4. `ties` (order 4) — "what happens if we tie on points?" (dense-ranking
     rule, already ported in Bolt 10's `assignDensePositions`).
  5. `pools` (order 5) — leagues and members.
- **Rendering: presentational, no rendering pipeline decided here.**
  `migration-analysis.md` line 34/52 already flags this precisely as a
  **Medium**-risk, Design-stage rendering concern: "the *content* is
  portable as data; only the rendering pipeline changes" (no MDX toolchain
  exists in React Native the way `@content-collections/mdx` does on the
  web). Model stage's contribution is only the **data shape** each rule
  document must carry once ported (`slug`/`title`/`order`/`body`/`locale`)
  — whatever rendering mechanism Design picks (pre-compiled JSON AST,
  `react-native-markdown-display` against raw markdown, or plain
  structured RN components per rule) must be able to consume that same
  shape without changing any other part of this bolt. Not resolved here —
  **flagged as an open question for Design** (§7).
- **Worked examples** (`score-breakdown-demo.tsx`) are a fixed, small set
  of hardcoded `ScoringExample` inputs (3 in the web app: a plain 2-1/2-1
  exact match, a 2-0/3-1 partial-goals match, a tied 1-1 knockout with a
  matched penalty winner) fed through `computeScore()` and rendered via the
  breakdown explainer. **These examples are literal constants, not derived
  from any live match data** — safe to port as-is, same three cases or a
  mobile-appropriate equivalent set (Design/Implement-stage detail, not a
  Model-stage rule).
- **i18n**: every string (`rules.centerTitle`/`centerSubtitle`/
  `makePredictions`/`demoTitle`, per-section titles/bodies) already exists
  bilingually (`es`/`en`) in betmeet-clone's dictionaries — Bolt 9's i18n
  infrastructure (`i18next`/`react-i18next`, `en.ts`/`es.ts` catalogs) is
  the obvious target, adding an `education`/`rules` namespace the same way
  every prior bolt added its own catalog keys.

## 3. EDU-2 — Interactive scoring calculator

**[CONFIRMED — `scoring-calculator.tsx` (full file read),
`calculator-error-boundary.tsx`, `scoring-table.tsx`,
`score-breakdown-explainer.tsx`]**

- **Reuses `computeScore()`/`derivePenaltyWinner()` directly — never
  redefines the algorithm.** `scoring-calculator.tsx`'s own doc comment is
  explicit: *"Pure client-side preview that reuses computeScore — never
  defines its own rules (BR-2.7)."* This is the exact invariant
  `domain-overview.md` line 200 states as a cross-feature dependency edge
  (`education ───→ scoring`) and ADR-016 (Bolt 4) already established a
  code-review gate for. **This bolt is a new, third real consumer of
  `src/shared/scoring/`** (after host-predictions and the `pools`-remote/
  backend-rankings pair) — the gate applies identically, no exception.
- **Inputs (all local, ephemeral UI state — no persistence)**:
  `predictedHome`/`predictedAway`/`actualHome`/`actualAway` (goals, clamped
  ≥ 0), `isKnockout` (boolean toggle). When `isKnockout && actualHome ===
  actualAway`, a penalty-shootout sub-form appears
  (`predictedPenaltyHome`/`Away`, `actualPenaltyHome`/`Away`) — **the
  penalty *winner* is never entered directly; it's derived** via
  `derivePenaltyWinner(home, away)` from each shootout's own score, and a
  tied shootout is flagged as invalid (`role="alert"`) rather than silently
  picking a winner. This exactly mirrors Bolt 4's own `derivePenaltyWinner`
  contract (already ported, no new domain logic needed).
- **Live recompute**: on every input change, a `ScoringExample` is
  assembled (`{ predictedHome, predictedAway, actualHome, actualAway,
  isKnockout, predictedPenaltyWinner, actualPenaltyWinner }`, with the two
  penalty-winner fields only populated when `showPenalty` is true) and
  passed through `computeScore()`; the resulting `ScoreBreakdown` renders
  via the same explainer shape Bolt 6's `ScoreBreakdownPanel` already
  renders for real predictions (see §7's flagged discrepancy on component
  reuse).
- **Error-boundary fallback (NFR "Design Pattern 3" in the source app)**:
  if the calculator throws for any reason, it degrades to the static
  `ScoringTable` (a plain list of rule→points rows, sourced from the same
  i18n catalog, zero interactivity) rather than crashing the Rules Center
  screen. React Native has no built-in error-boundary primitive
  equivalent gap — RN's `class`-based `componentDidCatch`/
  `getDerivedStateFromError` work identically to React DOM's, so this is a
  straightforward, faithful port (Implement-stage detail).
- **Non-mutating, confirmed**: no `backendApiClient` capability is called
  anywhere in this flow — pure client-side computation only (matches
  `project-inventory.md` line 136: *"education: none — fully
  presentational"* under the Server Actions inventory).

## 4. EDU-3 — Onboarding rules step

**[CONFIRMED — `src/features/profile/components/rules-step.tsx` (full file
read, betmeet-clone), `src/domain/profile/onboarding-wizard-state.ts`,
`src/host/profile/screens/onboarding-rules-screen.tsx`,
`src/host/profile/navigation/onboarding-stack-params.ts` (all mobile,
already built in Bolt 3)]**

- **The mobile hook point already exists as an explicit placeholder**,
  built deliberately in Bolt 3 to "reserve the seam, don't build the
  feature early" (its own doc comment): `OnboardingStackParamList` already
  has an `OnboardingRules` route; `onboarding-rules-screen.tsx` already
  wires `wizard.markDone('rules')`/`wizard.markSkipped('rules')` and
  advances to `OnboardingNotifications` either way. **This bolt's EDU-3
  work is exactly and only**: replace the placeholder body ("Rules content
  is coming soon (unit-09-education)...") with the real content betmeet-
  clone's `RulesStep` renders — it does **not** touch the wizard's
  navigation/step-sequencing/skip machinery at all, which Bolt 3 already
  built correctly and which this bolt must not regress.
- **Real content, per `rules-step.tsx`**: a static `ScoringTable`
  (identical component/data to EDU-2's fallback — one more argument for a
  single shared "static scoring table" component, not a duplicate, per
  §7's ADR-016-style discipline) + a text link into the full Rules Center
  (`/rules` on web; the mobile equivalent is a navigation action into
  wherever EDU-1's Rules Center screen lives once this bolt registers it)
  + the existing Continue/Skip buttons (already built by Bolt 3, unchanged).
- **Confirmed non-blocking, no persisted "seen" flag** — `rules-step.tsx`'s
  own doc comment: *"Skippable: both actions advance to the passkey step;
  it never blocks completion (BR-2.21, BR-2.23) and persists no 'rules
  seen' state (BR-2.22)."* This matches `domain-overview.md §4.4`'s
  generalized rule already cited verbatim in
  `onboarding-wizard-state.ts:10` (mobile-side), and matches the wizard's
  own `markSkipped`/`markDone` bookkeeping being purely in-memory/
  session-scoped wizard state, not a new persisted profile field. **No new
  domain type needed for EDU-3** — it consumes Bolt 3's existing
  `OnboardingStepId`/wizard-state machinery as-is.
- **Cross-bolt placement question this raises, flagged for Design (§7)**:
  the real Rules Center content (EDU-1) is designated `Remote` per
  `system-context.md`/`requirements.md §7.4`, while the onboarding wizard
  (Bolt 3, `OnboardingRulesScreen`) is **host**-placed. If EDU-3's "link
  into the full Rules Center" must navigate into a federated remote screen
  from a host-only onboarding flow, that's a real host→remote navigation
  edge — not modeled here, a Design-stage placement/navigation decision.

## 5. EDU-4 — Dismissible educational cues

**[CONFIRMED — `src/features/education/services/cue-store.ts` (full file,
23 lines), `dismissible-callout.tsx` (full file, betmeet-clone)]**

- **Contract**: `shouldShowCallout(cueId: string): boolean` and
  `dismissCallout(cueId: string): void`, backed by a single key-prefix
  convention (`cue:dismissed:${cueId}`) over `localStorage`.
- **Fail-open is the entire point, explicit in the source doc comment**:
  *"if localStorage is unavailable (SSR, incognito, blocked), callouts are
  shown and writes are silent no-ops — education never breaks the render
  (BR-2.16, BR-2.18)."* Both functions wrap every storage access in
  `try/catch`, defaulting to "show it"/"silently drop the write" on any
  error — never throwing, never blocking a screen's render.
- **Scope is per-device, not per-account** — no `backendApiClient` call, no
  `Profile` field. This is exactly the same shape as the web app's
  per-browser `localStorage` key: the mobile port is a 1:1 substitution of
  the storage primitive only (`AsyncStorage` or an equivalent local KV
  store — Design-stage choice, likely reusing whatever Bolt 3's locale
  preference already uses,
  `@react-native-async-storage/async-storage`/ADR-013, rather than adding
  a second local-storage dependency), with the exact same
  `shouldShowCallout`/`dismissCallout` contract and the exact same
  fail-open try/catch discipline preserved (`migration-analysis.md` line
  36 already names this pairing and flags it **High** risk *if the
  fail-open pattern is dropped*, not if it's faithfully kept — i.e., the
  risk is in a careless port, not in the concept itself).
- **`cueId` values are the caller's concern, not this store's** — betmeet-
  clone doesn't enumerate a fixed cue registry anywhere; whichever EDU-1/
  EDU-2 screens want a dismissible callout just pick a stable string key.
  No new domain entity beyond the `shouldShowCallout`/`dismissCallout`
  function pair itself (framework-agnostic once the storage primitive is
  swapped) — this ports as a small `src/domain/education/cue-store.ts` (the
  synchronous decision logic, framework-free) + a thin
  `platform`/`shared`-tier wrapper around `AsyncStorage`'s actual (async)
  API, a Design-stage detail given `AsyncStorage` is promise-based unlike
  synchronous `localStorage` (flagged §7).

## 6. Explicit non-goal: the public landing teaser

**[CONFIRMED — `src/features/education/components/scoring-teaser.tsx`,
`feature-grid.tsx`, `project-inventory.md` line 94]**

`ScoringTeaser` (compact scoring summary + worked examples, shown on the
**public, unauthenticated** landing page) and `FeatureGrid` (marketing
feature cards, also public-landing-only) are **not modeled as part of
EDU-1..4** and are **not in scope for this bolt**. Reasoning, confirmed
against real evidence, not assumed:

- This mobile app has no public, unauthenticated landing surface at all —
  every screen this repo has built so far (Bolts 1-10) sits behind
  `AuthGatedNavigator`'s guard (ADR-001). An app-store listing/marketing
  site is the mobile-native equivalent of a public landing page, and is
  explicitly out of this migration's scope (`requirements.md`'s intent is
  the in-app product, not marketing surfaces).
- `project-inventory.md` line 94 independently confirms this asymmetry
  even exists on the *web* side in a notable way: `/rules` (the full Rules
  Center) requires auth *"deliberately not public, despite being
  informational."* If even the full in-app Rules Center is gated, there is
  no principled reason to port the public teaser variant — it has no
  natural home in a gated mobile app.

If a future bolt or business decision adds a public-facing mobile
surface (e.g., a web landing page companion, or an unauthenticated
app-preview mode), `ScoringTeaser`/`FeatureGrid` would be revisited then —
not assumed needed now.

## 7. Cross-cutting confirmation: is Education genuinely non-mutating?

**Confirmed, not assumed** — `bolt-plan.md`'s Bolt 12 entry calls this "a
remote, low-frequency, non-mutating unit by design." Checked directly:

- `project-inventory.md` line 136 (Server Actions inventory): *"education:
  none — fully presentational."*
- `project-inventory.md` line 150 (Services inventory): *"education:
  `cue-store.ts` (fail-open localStorage wrapper) — the rest of the feature
  is presentational components, no services layer."*
- No `education.*` capability group appears anywhere in
  `system-context.md`'s backend-capability table (§3, all other units —
  auth/profile/pools/predictions/competition/scoring/rankings/
  notifications/admin — each have one; education has none).
- Real code confirms it too: nothing in `src/features/education/` imports
  a Server Action, a Prisma client, or performs a `fetch`. The only "write"
  anywhere in the feature is EDU-4's `localStorage.setItem` — a **local,
  per-device UI-state write**, not a backend mutation.

**Conclusion: yes, genuinely read-only from the backend's perspective.**
This bolt needs **zero** new `BackendApiClient` capability group (no new
`education-api.ts`), unlike every other bolt so far — the lowest-risk,
simplest-integration bolt in the entire plan, confirming its own risk
rating rather than just repeating it.

## 8. Flagged discrepancy: `predictions ──→ education` component reuse

**Confirmed tension, not silently resolved — flagged for Design.**
`domain-overview.md` line 201 states a real cross-feature dependency edge:
*"predictions ───────→ education (the real prediction-vs-result UI reuses
education's score-breakdown explainer component)"* — i.e., in
`betmeet-clone`, `predictions`' own UI imports
`ScoreBreakdownExplainer` **from** the `education` feature; there is only
one physical component, owned by `education`, consumed by `predictions`.

In this mobile repo, that ordering is **inverted by construction**: Bolt 6
(Predictions, host-placed) shipped its own
`src/host/predictions/components/score-breakdown-panel.tsx` months before
Education had any real content at all (this bolt is the first time
Education gets real content). `ScoreBreakdownPanel` is presentational,
reads a `ScoreBreakdown` and renders matched-case/points/penalty-bonus —
functionally equivalent to betmeet-clone's `ScoreBreakdownExplainer`, but
it is a **second, independently-written implementation**, not an import of
a shared component, and it already has its own tests (Bolt 6) and its own
consumer (`PredictionsFixtureList`, extended again in Bolt 10 for the
Scored/Pending badge).

This is not an ADR-016-style "duplicate scoring *math*" violation — both
components call the same `computeScore()`/consume the same
`ScoreBreakdown` shape, so the numbers can never drift. It **is** a
duplicate-*presentation-component* situation, structurally different from
betmeet-clone's single-owner shape, and — critically — the two modules
sit on **opposite sides of a Module Federation boundary** (host vs.
remote), so betmeet-clone's literal "one component, two importers" shape
may not even be achievable the same way here (a host component importing
from a not-yet-loaded remote bundle, or vice versa, is a materially
different problem than two same-bundle imports). **Left as an open
question for Design, not resolved here** — options include: (a) leave both
as intentionally-separate twins (same spirit as ADR-051's backend
`computeScore` port, just applied to a presentation component instead of a
pure function), (b) extract a shared, filesystem-shared
`src/shared/scoring/` (or a new `src/shared/education/`) presentational
component both host-predictions and the education remote import, requiring
a design-stage MF-placement re-examination of whether education's
worked-examples/calculator UI can even reuse a host-owned component across
the boundary. Recorded here so Design doesn't have to rediscover it.

## 9. Data already available vs. new

| Data / capability | Status |
|---|---|
| `computeScore()` / `derivePenaltyWinner()` / `ScoringRuleSet` (Bolt 4) | Exists, reused as-is (`src/shared/scoring/`). This bolt is a new consumer, not a new owner. |
| `OnboardingStepId`/wizard skip-or-done bookkeeping (Bolt 3) | Exists (`src/domain/profile/onboarding-wizard-state.ts`). EDU-3 reuses it unchanged. |
| `OnboardingRulesScreen` placeholder + `OnboardingRules` route (Bolt 3) | Exists (`src/host/profile/screens/onboarding-rules-screen.tsx`, `onboarding-stack-params.ts`). This bolt fills its body with real content; navigation/skip logic untouched. |
| `education` remote scaffold (Bolt 0) | Exists but is a pure demo shell (`EducationRemoteEntry.tsx`, `rspack.config.education-remote.mjs`) — no real screens, no route registered on the host yet. This bolt's Design stage decides the real screen(s)/navigation shape. |
| Rule content (5 documents × 2 locales) | Exists as data in `betmeet-clone`'s `content/rules/{es,en}/*.mdx` — portable as structured data (per `migration-analysis.md`), but **no MDX rendering pipeline exists on React Native**. Design stage must choose a rendering mechanism (§2). |
| `@react-native-async-storage/async-storage` (Bolt 3, ADR-013) | Exists, already an installed dependency (used for locale persistence) — the natural fit for EDU-4's per-device cue storage rather than adding a second local-KV dependency. Async API vs. web's synchronous `localStorage` is a Design/Implement-stage adaptation, not a new domain rule. |
| `ScoreBreakdownPanel` (Bolt 6, host/predictions) | Exists, independently-built, functionally equivalent to betmeet-clone's `ScoreBreakdownExplainer` — see §8's flagged discrepancy. |
| `education.*` backend capability group | **Does not need to exist** — confirmed genuinely non-mutating (§7). |
| `RulesCenterScreen`/`ScoringCalculatorScreen`/cue-store port | **Does not exist yet** — this bolt's entire net-new surface. |

## 10. Open questions for Design (not resolved here)

1. **Rule-content rendering pipeline** (§2) — pre-compiled JSON AST vs.
   `react-native-markdown-display` vs. plain structured RN components per
   rule document. All three preserve the same `RuleDocument` data shape;
   this is purely a rendering-mechanism choice.
2. **EDU-3's "link into the full Rules Center" navigation edge** (§4) — a
   host-placed onboarding screen needs to reach a remote-placed Rules
   Center screen; needs a real host→remote navigation design (this repo
   has host→remote route-mounting precedent from `pools`/`education`'s own
   scaffold, but not yet a host-screen-pushes-into-remote-screen pattern
   mid-flow from *inside* a different stack).
3. **The `predictions ──→ education` component-reuse discrepancy** (§8) —
   keep `ScoreBreakdownPanel`/education's equivalent as intentional twins,
   or extract a shared cross-boundary presentational component.
4. **EDU-4's storage primitive** (§5) — reuse `AsyncStorage` (async API) vs.
   any faster in-memory-plus-persist option; same fail-open contract either
   way.
5. **`education` remote's placement re-confirmation** — `requirements.md
   §7.4`/`system-context.md` already default `education` to **Remote**
   ("static, low-frequency content — ideal for deferred download"), and
   `system-context.md §7`'s Bolt-9 addendum explicitly anticipates
   `Education` joining the bottom-tab row *("Rankings/Education join as
   tabs when Bolts 10/12 ship")*. Given Bolts 7/9/10 each did a real
   re-examination of an inherited MF-placement default rather than
   rubber-stamping it (ADR-032/036/037/042/048), Design stage should do the
   same brief check here too — even though nothing in this Model stage
   surfaced a reason to overturn "Remote" (no render-blocking dependency
   from any host screen onto Education's content was found; the one real
   cross-boundary edge found, §8, is the reverse direction and doesn't
   force host placement).

None of the above blocks Design from starting — they are decisions Design
needs to make, not missing facts that block modeling further.

## Checkpoint

Pausing here for human approval before Design (component/data-flow design,
the real host-vs-remote navigation wiring for the Rules Center/calculator/
onboarding link, and resolution of the 5 open questions above).
