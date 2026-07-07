# Bolt 12 — Design

> Builds on `model.md` (checkpoint-approved 2026-07-06, with one recorded
> decision: §8/§10 item 3's `ScoreBreakdownPanel`-vs-education's-explainer
> discrepancy is **resolved as independent twins**, not a shared
> cross-boundary component — same spirit as ADR-051's backend `computeScore`
> twin, now recorded as final in §7 below, not re-opened). This stage
> resolves model.md §10's five remaining open questions and designs the
> component/data-flow/state/navigation/theming shape for EDU-1..4.

## 1. Module Federation placement — real re-examination (model.md §10 item 5)

### 1.1 The question

`requirements.md §7.4`/`system-context.md §4` default `education` to **Remote**
("static, low-frequency content — ideal for deferred download"). Bolts 7/9/10
each did a real re-examination of an inherited placement default rather than
rubber-stamping it (ADR-032/036/037/042/048) — this bolt does the same check
against EDU-1..4's actual, now-fully-modeled scope, not a repeat of
Inception's one-line rationale.

### 1.2 Evidence gathered

1. **Cross-feature dependency map** (`domain-overview.md §7`): the only two
   edges touching `education` are `education ───→ scoring` (imports the
   shared pure algorithm, never redefines it — already structurally
   satisfied, `src/shared/scoring/` is filesystem-shared, zero MF cost,
   ADR-015) and `predictions ───→ education` (component reuse — resolved as
   **independent twins** at the checkpoint, §7 below). Neither edge is a
   render-blocking **outbound** pull the way `competition`'s ADR-017 needed
   (predictions' primary screen depending on competition's data) — both
   edges here point at a leaf dependency (`scoring`) or are non-binding
   (the twin decision means `predictions` doesn't import anything from
   `education` at all in this codebase, unlike betmeet-clone's single-owner
   shape). Nothing forces host co-location.
2. **Genuinely non-mutating, confirmed twice** — model.md §7 already proved
   zero backend capability is needed (no `education.*` group, no
   `BackendApiClient` call anywhere in EDU-1..4). This means **no
   `@tanstack/react-query` MF-shared-singleton question even arises** for
   this remote (unlike `pools`, ADR-034) — one fewer correctness-critical
   singleton to prove right on this bundle.
3. **No native-module dependency** — confirmed below (§9): the rendering
   pipeline decision (§2) and the calculator's plain numeric `TextInput`s
   need zero new native modules. `AsyncStorage` (EDU-4) is the one
   pre-existing native-backed dependency this bolt newly asks a *remote* to
   consume — flagged explicitly in §9, not silently assumed safe.
4. **Content size favors deferred download, not host inclusion** — the five
   rule documents (§2's `RuleDocument[]`) total roughly 100 lines of prose
   across two locales (confirmed by reading `content/rules/{en,es}/*.mdx`
   directly), plus one calculator component and one worked-examples strip.
   This is exactly the "static, low-frequency content" shape
   `requirements.md §7.4`'s own rationale names — a real, still-true reason
   to defer this download rather than grow the host's always-loaded bundle,
   distinct from (and independent of) the *navigation-entry-point* question
   §5 below resolves separately.
5. **No multi-screen internal flow** — unlike `pools` (6 screens, justifying
   its own internal stack navigator, ADR-032/034), EDU-1/EDU-2's real content
   is exactly what betmeet-clone renders on **one** page
   (`src/app/(app)/rules/page.tsx`: header + accordion + calculator +
   worked-examples, stacked vertically). `education/App`'s exposed module
   stays a **single scrollable screen**, not an internal navigator — simpler
   than `pools`, consistent with this bolt's own "Low risk" framing.

### 1.3 Decision — RECONFIRMS the Inception default (no change)

**`education` remains a Module Federation remote**, unchanged from
Inception's placement and Bolt 0's scaffold. Unlike Bolt 10's `scoring-rankings`
(which genuinely changed away from "Remote"), this is a **reconfirm**, same
class as Bolt 7→8's ADR-032→036 for `pools` — the investigation found no new
reason to overturn it, and one additional reason (zero backend capability, so
zero React-Query MF-singleton risk) to keep it simple. `EducationRemoteEntry.tsx`
stops being a demo shell and becomes the real Rules Center screen; its
`exposes` map (`'./App'`) is unchanged.

**Consequence, flagged for ADR/Implement**: this is the **first time** the
`education` remote gets real screens using Tamagui/i18next (tech-stack.md's
own note: *"`education` remote config is explicitly unchanged by Bolt 9...
re-audit if a future bolt gives it real screens"* — this is that bolt). §9
below designs the required MF `shared`-config additions.

## 2. Rule-content rendering pipeline (model.md §10 item 1)

### 2.1 What the real content actually needs

Read directly (not assumed): all five real rule documents
(`content/rules/en/{scoring,penalties,match-locks,ties,pools}.mdx`, `es/`
mirrors) total 12-22 lines each and use **only**: one `## ` heading (redundant
with the doc's own `title` frontmatter — not re-rendered), plain paragraphs,
bold spans (`**text**`), unordered bullet lists, and exactly one literal
"**Example**: ..." callout paragraph (`scoring.mdx`). **No tables, images,
links, code blocks, or nested lists anywhere in the real content.**

### 2.2 Decision — plain structured RN components over a hand-authored typed block array, NOT a markdown parser

Given §2.1's actual complexity ceiling, a markdown-rendering pipeline
(`react-native-markdown-display`) or an MDX-AST compiler would solve a problem
this content doesn't have — disproportionate for 5 short documents, and
`react-native-markdown-display` would be a **new dependency** to probe
(coding-standards.md's native-dep-probe discipline applies to any new
package, not just native-module ones, given this project's Tamagui/Rspack
probe history, ADR-045). Decision: content is authored directly as typed data
— no markdown syntax parsed at runtime at all.

```
src/domain/education/rule-content.ts   (framework-free)

export type RuleContentBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'example'; label: string; text: string };  // scoring.mdx's one callout

export interface RuleDocument {
  slug: string;       // 'scoring' | 'penalties' | 'match-locks' | 'ties' | 'pools'
  order: number;       // 1..5, display sort key — mirrors betmeet-clone's field 1:1
  sections: RuleContentBlock[];
}

// Keyed by AppLocale ('es'/'en', @/domain/profile/locale — Bolt 3's existing
// type, reused as-is, no new locale type). `title` is NOT stored here — it
// comes from the i18n catalog (`rules.documents.<slug>.title`, see §8) since
// every other bolt's user-facing string lives in en.ts/es.ts, and a document
// title is chrome text, not content-body prose.
export function getFullRules(locale: AppLocale): RuleDocument[];
```

This mirrors betmeet-clone's own `getFullRules(locale)` name/signature
(`src/lib/rules-content.ts`) — same "reimplemented fresh, same shape,
different mechanism" precedent as `resolve-points.ts`/
`pool-leaderboard-aggregation.ts` (Bolt 10) — but the **body** field is a
typed block array instead of compiled MDX, since no consumer here needs
markdown syntax, only a way to lay out paragraphs/bullets/one callout.
`audience` is dropped entirely (model.md §6 — mobile only ever needs
`'full'`, no teaser variant exists).

`src/remotes/education/components/rule-content-renderer.tsx` (presentational,
Tamagui): maps each `RuleContentBlock` to `BodyText` (paragraph), a bulleted
`YStack` of `BodyText` rows (list, plain `•` glyph prefix — no new icon
dependency), or a `Card`-nested `BodyText` pair (the one `example` block).
~30 lines, zero branching beyond a `switch` on `block.type`.

**Why `src/domain/education/`, not `src/remotes/education/`, for the data**:
framework-free, testable in isolation (a `getFullRules('es').length === 5`
assertion needs no RN render), same tier `rule-document.ts`'s ubiquitous-
language term belongs in per model.md §1 — mirrors `src/domain/rankings/`'s
"pure data/logic, filesystem-shared, UI reads it" split (Bolt 10 design.md §2).
No second bundle consumes this data today, so it stays under `domain/`
rather than being promoted to a cross-boundary `shared/` tier (ADR-024's
"promote on second consumer" discipline, reapplied) — `education` is
currently its only reader.

## 3. EDU-1 — Rules Center screen (remote)

```
src/remotes/education/
  EducationRemoteEntry.tsx         the exposed `./App` — the whole Rules
                                    Center in one ScrollView (§1.2 point 5):
                                    header, RulesAccordion, worked examples,
                                    CalculatorErrorBoundary(ScoringCalculator).
                                    Replaces Bolt 0's demo shell content
                                    entirely; the `exposes` key is unchanged.
  components/
    rules-accordion.tsx             5 collapsible sections, hand-rolled
                                    expand/collapse local state per item
                                    (`useState<Set<string>>` of open slugs) —
                                    no accordion library added (5 bounded
                                    items, same "plain, not a new dependency"
                                    call as ADR-014's avatar-grid). Renders a
                                    `Card` per section; header row is a
                                    `Pressable` (Tamagui `XStack`) with the
                                    section's i18n title + a plain text
                                    chevron glyph (`▾`/`▸` — no icon library
                                    needed, keeping this remote's dependency
                                    footprint identical to `pools`', see §9).
    rule-content-renderer.tsx       (§2.2)
    score-breakdown-explainer.tsx   education's OWN presentational component
                                    (§7 — independent twin of host's
                                    `ScoreBreakdownPanel`), richer than the
                                    host's (mirrors betmeet-clone's
                                    `ScoreBreakdownExplainer`: separate
                                    resultPoints/homeGoalPoints/
                                    awayGoalPoints rows when not EXACT).
    score-breakdown-demo.tsx        the 3 fixed worked examples (§4), each
                                    rendered via score-breakdown-explainer.tsx
    scoring-calculator.tsx          EDU-2 (§5)
    calculator-error-boundary.tsx   EDU-2 fallback (§5)
    scoring-table.tsx               EDU-2's fallback content — education's OWN
                                    twin (§7), reads `ScoringRuleSet` +
                                    education's `scoring.*` i18n keys
    dismissible-callout.tsx         EDU-4 (§6)
  hooks/
    use-dismissible-cue.ts          EDU-4 (§6)
```

**Worked examples (score-breakdown-demo.tsx)**: the same 3 literal constants
betmeet-clone hardcodes (`score-breakdown-demo.tsx`, read in full) — a plain
2-1/2-1 exact match, a 2-0/3-1 partial-goals match, a tied 1-1 knockout with a
matched penalty winner (`'home'`/`'home'`) — fed through `computeScore()`
(`@/shared/scoring`, the same single-source function every other bolt uses,
ADR-016's invariant unchanged). These are compile-time constants in
`score-breakdown-demo.tsx`, not fetched or configurable — ported as-is, no
Model-stage rule attached to their specific values (model.md §2).

**No FlashList anywhere in this bolt**: 5 accordion sections, ≤3 worked
examples, one calculator form — all bounded, small, non-virtualized lists,
same documented exception class as ADR-014 (avatar grid) and Bolt 9's small
`pool-list-item.tsx` retrofit. `vercel-react-native-skills`' "virtualize with
FlashList" rule targets large/unbounded arrays, which none of EDU-1..4 has.

## 4. EDU-2 — Interactive scoring calculator (remote)

`scoring-calculator.tsx` ports `betmeet-clone`'s component 1:1 in shape
(model.md §3, already fully specified there): local `useState` for
`predictedHome/Away`, `actualHome/Away`, `isKnockout`, and (only when
`showPenalty = isKnockout && actualHome === actualAway`) the 4 penalty-
shootout score fields — winners always derived via `derivePenaltyWinner()`
(`@/shared/scoring`), never entered directly; a tied shootout renders a
`role="alert"`-equivalent (RN `accessibilityRole="alert"` + a themed error
`BodyText`) instead of picking a winner. `GoalInput`-equivalent is a Tamagui-
wrapped numeric `TextInput` (`keyboardType="numeric"`, clamped ≥0 on change,
same `clampGoals` logic) — no native stepper component, no new dependency.
Live recompute via the same `useMemo` pattern feeding `computeScore()` on
every keystroke, rendered through `score-breakdown-explainer.tsx` (§3).

`calculator-error-boundary.tsx` is a straightforward RN port of the web's
class-based boundary (`getDerivedStateFromError`/`componentDidCatch` are
identical APIs in RN, model.md §3 already confirms this is a "faithful port,"
no gap) — on error, renders `scoring-table.tsx` (education's own twin, §7)
instead of the calculator, exactly matching betmeet-clone's "Design Pattern 3"
fallback.

Confirmed non-mutating (model.md §7 — reconfirmed here, not re-derived): no
`BackendApiClient` call anywhere in this component tree.

## 5. EDU-3 — Onboarding rules step (host)

Fills `OnboardingRulesScreen`'s existing placeholder body
(`src/host/profile/screens/onboarding-rules-screen.tsx`) — the wizard's own
`markDone('rules')`/`markSkipped('rules')`/advance-to-`OnboardingNotifications`
machinery (Bolt 3) is **untouched**, per model.md §4's explicit scope boundary.

```
src/host/profile/components/
  onboarding-scoring-summary.tsx   host's OWN twin of education's
                                   scoring-table.tsx (§7) — same
                                   `ScoringRuleSet` data, same `scoring.*`
                                   i18n keys, independently rendered inside
                                   the host bundle (no cross-boundary import)
```

Real content replacing the placeholder: title/description (already i18n'd —
`onboarding.rulesStepTitle`/`rulesStepDescription`, unused since Bolt 3
shipped the placeholder without them) + `OnboardingScoringSummary` (static,
same 5-row rule→points table as EDU-2's fallback) + the existing Continue/Skip
`PrimaryButton`s (Bolt 3, unchanged) — Tamagui-first (`Screen`/`Card`/
`Heading`/`BodyText`/`PrimaryButton` from `src/shared/design/primitives.tsx`,
replacing the current plain-RN `Button`/`StyleSheet` placeholder).

### 5.1 The "link into the full Rules Center" navigation edge — resolved, NOT a live deep link (model.md §10 item 2)

**Finding, not a guess**: `AuthGatedNavigator` renders exactly one top-level
screen-tree at a time based on the guard outcome (ADR-001 — "conditional
screen-tree rendering, not action interception"). While a user is inside the
`onboarding` guard branch, the **only** mounted tree is `OnboardingStack`
(5 wizard screens) — the `RootDrawer`/`MainTabs`/`HomeStack`/`Education` route
(§6 below) does not exist in that tree at all, by construction, until
onboarding completes and the guard re-evaluates to a different branch. There
is no React Navigation action that can "jump" into a screen belonging to a
different, currently-unmounted top-level tree — this isn't a missing feature
to build, it's what ADR-001's architecture structurally prevents, the same
way it already prevents (by design) navigating to `Predictions` mid-onboarding.

**Decision**: `rules-step-link`'s web equivalent (a `<Link href="/rules">`)
is **not ported as a real navigation action**. `OnboardingRulesScreen` shows
only the static summary + a plain, non-interactive `MutedText` line
("You can open the full Rules Center anytime from Home" — final copy is an
Implement-stage i18n detail) instead of a tappable link. This is the model.md
§4's own hinted option: *"onboarding shows a self-contained summary and the
full Rules Center is only reachable later"* — confirmed correct by ADR-001's
actual mechanics, not chosen by default. **No new navigation code, no
cross-tree escape hatch, nothing to build here beyond the informational text
line** — the smallest-possible resolution, consistent with this bolt's own
"Low risk" framing.

## 6. Where `education` gets its first host navigation entry point (model.md §10 item 5)

### 6.1 What the plan actually says vs. what system-context.md anticipated

Two documents disagree on shape, checked directly rather than picking one
blind:
- `bolt-plan.md`'s Bolt 12 entry does **not** say "new screens register into
  the tab/drawer shell" the way Bolt 10's entry explicitly does for Rankings
  — it only lists Bolt 9 as a dependency (tab/drawer shell must exist), not
  "ships as a tab."
- `system-context.md §7`'s Bolt-9 addendum **does** anticipate a 5th tab:
  *"Rankings/Education join as tabs when Bolts 10/12 ship."* This was written
  at Bolt 9's Design stage, before EDU-1..4 were modeled in any depth — an
  anticipation, not a binding decision (`bolt-plan.md`'s own framing: "Bolt
  IDs are provisional... Construction may renumber/re-decide").

### 6.2 Real re-examination (not a rubber-stamp of either document)

1. **Frequency mismatch with the tab row's existing members.** Every current
   tab (`Home`/`Predictions`/`Pools`/`Rankings`) is a primary, repeatedly-
   revisited surface — checked every matchday or league-management need.
   `education` is the opposite by its own Inception rationale (`requirements.md
   §7.4`: *"static, low-frequency content"*) and its own bolt-plan risk note
   (*"low-frequency... by design"*). A persistent 5th tab devoted to content a
   user opens once or twice ever is real, measurable tab-bar crowding for the
   4 screens people actually use every day — a cost `system-context.md`'s
   anticipation didn't have EDU-1..4's confirmed low-frequency shape in hand
   to weigh yet.
2. **An existing, already-built seam does the job with zero new navigation
   concepts.** `HomeScreen` already has a real, exercised entry point for
   `education/App` today — Bolt 0's "load education remote" button
   (`src/host/navigation/screens/home-screen.tsx`), which lazy-imports
   `education/App` and wraps it in `RemoteBoundary` **inline on Home**. This
   is not a placeholder to throw away; it is the literal mechanism this
   bolt needs, just relocated from an inline toggle-render to a real pushed
   screen. Reusing it is less disruptive than adding a tab: zero
   `MainTabParamList`/`main-tab-navigator.tsx` changes, zero new tab icon.
3. **Bolt 0's still-open Layer 2 item stays exercisable, unchanged in
   substance.** `progress.md`'s open item — "kill the remote's dev server
   mid-session, confirm `RemoteBoundary`'s retry UI" — currently depends on
   this exact Home button. Moving the `RemoteBoundary`+`lazy` call from an
   inline `showRemote` toggle into a dedicated pushed screen preserves the
   identical fallback behavior (same components, same retry callback), so
   that manual test path is not regressed or orphaned by this decision.
4. **No functional requirement forces a tab.** Nothing in `domain-overview.md`
   or the EDU-1..4 stories needs education reachable from more than one
   place, or reachable "at a glance" the way a tab implies. A single,
   discoverable entry point is sufficient.

### 6.3 Decision — Home screen button → a real pushed `Education` route, NOT a 5th tab

**A deliberate, evidence-based deviation from `system-context.md §7`'s
tab anticipation** — flagged explicitly for the ADR stage as its own record
(same class of "documented anticipation, real investigation changes it"
decision Bolt 10 made for `scoring-rankings`'s remote-vs-split placement,
just applied to a navigation-shape question instead of an MF-bundle one).

```
src/host/auth/navigation/auth-stack-params.ts
  HomeStackParamList  gains  Education: undefined

src/host/auth/navigation/screen-registry.ts
  Education: ['protected']   // same tag as Home/Predictions/Pools/Rankings

src/host/navigation/screens/education-screen.tsx   (NEW, thin host wrapper)
  — the exact lazy-import + RemoteBoundary + retry logic HomeScreen's
    `showRemote` toggle currently owns, moved here unchanged in substance:
    const EducationRemoteApp = lazy(() => import('education/App'));
    export function EducationScreen() {
      return <RemoteBoundary onRetry={...}><EducationRemoteApp /></RemoteBoundary>;
    }

src/host/navigation/main-tab-navigator.tsx
  HomeStackNavigator gains one more <HomeStack.Screen name="Education" .../>
  — no Tab.Navigator change, no new tabBarIcon, MainTabParamList untouched.

src/host/navigation/screens/home-screen.tsx
  `handleLoadRemote`'s `setShowRemote(true)` becomes
  `navigation.navigate('Education')`; the inline `showRemote`/`RemoteBoundary`
  JSX block is deleted from HomeScreen (moved to education-screen.tsx above).
  Button label: `home.openRulesCenter` (replaces `home.loadEducationRemote`,
  an Implement-stage i18n-catalog rename — the old key's English string
  ("Load education remote") was always Bolt 0's own internal/demo framing,
  never real product copy).
```

This is the **first host screen this project pushes to *without* it being a
tab-root** since Bolt 9's retrofit (every existing `AppStack`-era push became
a tab root in Bolt 9) — structurally unremarkable (native-stack push is the
oldest, most basic React Navigation primitive here, ADR-003), just worth
naming as a small "shape first" for a future bolt that might want the same
non-tab pattern (e.g., a future `admin` entry point, Bolt 13, also flagged
"Remote (low priority)" and equally not tab-shaped in `requirements.md §7.4`).

## 7. `predictions ──→ education` component-reuse — CONFIRMED, applied twice (model.md §8/§10 item 3)

**Recorded as resolved per the human checkpoint, not re-opened**:
`ScoreBreakdownPanel` (host, Bolt 6) and education's own
`score-breakdown-explainer.tsx` (§3) remain **independent twins** — both
consume the exact same `ScoreBreakdown` shape from the exact same
`computeScore()` (`@/shared/scoring`, ADR-015/016), so the *numbers* can never
drift; only the small presentational shells differ, same spirit as ADR-051's
backend `computeScore` twin. No shared cross-boundary
`src/shared/education/`-or-similar component tier is created.

**This bolt applies the identical reasoning a second time**, for a component
model.md didn't separately flag but which raises the exact same shape:
EDU-2's calculator-fallback `scoring-table.tsx` (remote) and EDU-3's
`onboarding-scoring-summary.tsx` (host) both render the same 5-row
rule→points list from the same `ScoringRuleSet` constants. Rather than
inventing a third resolution mechanism, this bolt keeps them as **independent
twins** too — same justification (data can't drift, boundary crossing isn't
worth it for a ~20-line presentational list), noted here so a future
reviewer sees one consistent policy applied twice, not two different calls
that happen to look similar.

## 8. i18n

New/extended namespaces in `src/platform/i18n/locales/{en,es}.ts`
(ADR-044's existing architecture, ADR-016-adjacent "same catalog, more keys"
precedent every prior bolt followed) — ported 1:1 from betmeet-clone's
`src/i18n/dictionaries/en.ts`/`es.ts` (`rules`/`calculator`/`breakdown`/
`onboarding.rulesStep*` keys, all already read and confirmed to exist
bilingually):

- `rules.*` — `centerTitle`/`centerSubtitle`/`demoTitle` + a new
  `documents.<slug>.title` map (5 entries) feeding `RulesAccordion`'s headers
  (§2 — titles live in i18n, bodies live in `rule-content.ts`'s typed blocks).
  `makePredictions` is dropped (no cross-tab CTA from the remote, §5.1's
  ADR-001 boundary applies equally here — a "go make predictions" button
  from `education` would need the same impossible cross-tree jump).
- `calculator.*`/`breakdown.*`/`scoring.*` — ported verbatim (already fully
  enumerated in model.md §3's file citations).
- `onboarding.rulesStepTitle`/`rulesStepDescription` — already present in the
  catalog (added by Bolt 9 in anticipation, unused until now); a new
  `onboarding.rulesStepReviewLater` key replaces `rulesStepLink`'s web
  wording (§5.1 — informational text, not a link label).
- `home.openRulesCenter` replaces `home.loadEducationRemote` (§6.3).
- A small `education.cues.*` namespace for EDU-4's callout copy (§9) — exact
  keys/count are an Implement-stage detail (model.md §5: "cueId values are
  the caller's concern").

## 9. EDU-4 — Dismissible educational cues (storage mechanism, model.md §10 item 4)

### 9.1 Decision — `AsyncStorage`, async contract, fail-open preserved exactly

Reuses `@react-native-async-storage/async-storage` (Bolt 3, ADR-013) rather
than adding a second local-KV dependency — same reasoning model.md §5 already
laid out, confirmed rather than second-guessed. Two-tier split, mirroring
`src/domain/profile/locale.ts` + `src/host/profile/locale-store.ts`'s
existing domain/platform split exactly:

```
src/domain/education/cue-store.ts        (framework-free, synchronous)
  storageKey(cueId: string): string       — `cue:dismissed:${cueId}`, pure

src/platform/education/cue-store.ts      (async, wraps AsyncStorage)
  async shouldShowCallout(cueId): Promise<boolean>
  async dismissCallout(cueId): void

  Both wrap every AsyncStorage call in try/catch, defaulting to
  `true`/no-op on any failure — the exact fail-open contract model.md §5
  names (BR-2.16/BR-2.18 equivalent), same try/catch shape as
  `locale-store.ts`'s own `hydrate()`/`setLocale()`.
```

**The one real difference from web, called out explicitly**: `localStorage`
is synchronous, so `DismissibleCallout` can read it during first render
(web's `useSyncExternalStore` trick). `AsyncStorage` is not — this bolt's
`use-dismissible-cue.ts` hook (`src/remotes/education/hooks/`) resolves via a
local `useState` + `useEffect(() => { shouldShowCallout(cueId).then(setVisible) })`,
defaulting to **`visible: true`** until the read resolves (fail-open applies
to the loading gap too — a callout never flashes hidden-then-shown, only
shown-then-possibly-hidden once the real value is known, which is the safer
direction for a "don't accidentally suppress information" cue). `dismiss()`
calls `dismissCallout(cueId)` then sets local state synchronously (optimistic,
no re-read needed).

### 9.2 New MF-config risk flagged, not silently assumed safe

**This is the first time any Module Federation *remote* (not just the host)
consumes `AsyncStorage`.** Per the `react-native-svg` lesson (Bolt 8 — a
native-backed module double-registering a Fabric component across bundles
crashed the `pools` remote's first real navigation, `activeContext.md`'s
"every MF shared-dependency list needs a deliberate audit" note) and per
`system-architecture.md`'s own rule ("a feature that requires native modules
cannot be a pure-JS remote... record the decision as an ADR"),
`@react-native-async-storage/async-storage`'s cross-bundle behavior is
**not yet proven** the way `react-native-svg`/`@tanstack/react-query` now
are for `pools`. Flagged here for the Implement stage: build the `education`
remote for real (as ADR-045/047 already established as this project's
"probe, don't assume" pattern) and confirm no double-registration/module-
resolution error occurs before this ships, adding
`'@react-native-async-storage/async-storage'` to both `rspack.config.mjs`'s
and `rspack.config.education-remote.mjs`'s MF `shared` config proactively
(the safer default given the precedent) rather than waiting to hit it
on-device first.

### 9.3 Illustrative cue placements (Implement-stage detail, shape only)

Two call sites, to prove the mechanism end-to-end (not an exhaustive list —
model.md §5 confirms `cueId` choice is the caller's concern):
`education.rulesAccordionIntro` (above `RulesAccordion`, introducing the
collapsible sections) and `education.calculatorIntro` (above
`ScoringCalculator`, "try it yourself" framing). Both use the plain Unicode
`✕` glyph for the dismiss affordance rather than a `lucide-react-native`
icon (see §10 — keeps this remote's dependency footprint identical to
`pools`', no new icon-library MF question to answer here).

## 10. Federation config additions (this remote's first real retrofit)

`rspack.config.education-remote.mjs`'s `sharedDeps()` currently lists only
`react`/`react-native`/`@react-navigation/native`/`native-stack`/
`react-native-safe-area-context`/`react-native-screens` (Bolt 0's demo-shell
minimum). This bolt is the first to give it real, themed, translated screens
— required additions, mirroring exactly what `pools` already proved safe
(ADR-043), deliberately **not** introducing anything `pools` hasn't already
validated:

- `tamagui` (`singleton: true`) — Tamagui-first screens (§3-§6), same
  shared-theme-context correctness requirement as `pools`.
- `i18next` + `react-i18next` (`singleton: true`) — same shared-translation-
  state requirement as `pools`.
- The same `'react-dom'` alias `rspack.config.mjs`/`rspack.config.pools-
  remote.mjs` already carry (Tamagui's Popper/floating internals'
  unconditional `import { flushSync } from 'react-dom'`, ADR-045) —
  `src/shared/shims/react-dom-native.ts`, no new shim needed, just wired into
  this third config.
- `@react-native-async-storage/async-storage` — **new, unproven** (§9.2),
  added defensively and verified via a real build before Implement closes.

**Deliberately NOT added**: `@shopify/flash-list` (§3 — no virtualized list
in this bolt), `@tanstack/react-query` (§1.2 point 2 — no backend capability
exists), `lucide-react-native`/`react-native-svg` (§3/§9.3 — plain-glyph
choices avoid this question entirely, reusing only the already-twice-proven
Tamagui+i18next+react-dom trio rather than opening a fourth).

## 11. State boundaries

| State | Owner | Mechanism |
|---|---|---|
| Rule document content | `education` remote | static import from `src/domain/education/rule-content.ts`, no fetch, no cache |
| Accordion open/closed sections | `RulesAccordion`, local | `useState<Set<string>>`, UI-only, not persisted |
| Calculator form fields | `ScoringCalculator`, local | `useState` per field, ephemeral, no persistence (model.md §3) |
| Cue dismissed state | `education` remote, per-cue | `useDismissibleCue(cueId)` hook wrapping `src/platform/education/cue-store.ts` (AsyncStorage), no Zustand store — single owner per cue, no cross-cutting client state (same reasoning as Bolt 7/10's "no new Zustand store" conclusions) |
| Onboarding step completion | host, unchanged | Bolt 3's existing wizard state (`markDone`/`markSkipped`) — EDU-3 reads nothing new here |

No new Zustand store, no new TanStack Query key — confirms model.md §7's
"genuinely non-mutating" finding at the Design stage too.

## 12. Theming

Every new screen/component in this bolt (`EducationRemoteEntry.tsx`,
`RulesAccordion`, `ScoringCalculator`, `ScoreBreakdownExplainer`,
`ScoringTable`, `DismissibleCallout`, `OnboardingRulesScreen`'s new body) is
built **Tamagui-first from the start**, composing
`src/shared/design/primitives.tsx` (`Screen`/`Card`/`Row`/`Heading`/
`BodyText`/`MutedText`/`PrimaryButton`/`LoadingState`/`ErrorState`) with zero
new tokens needed — same primitives every Bolt-9-onward screen already
reuses. Both bundles (host's `onboarding-scoring-summary.tsx`, the `education`
remote's own components) inherit the host's one `<TamaguiProvider
defaultTheme>` (dark/light-correct on first paint, no retrofit needed, since
every component here is net-new) via the MF-shared `tamagui` singleton (§10)
— the same mechanism already proven for `pools`' `my-pools-screen.tsx`.

The one narrow exception: `RulesAccordion`'s chevron and `DismissibleCallout`'s
dismiss affordance are plain text glyphs (`▾`/`▸`, `✕`), not themed icon
components — a deliberate, explicit choice (§9.3/§10) to avoid a fourth
MF-shared-singleton question in a bundle that has never carried
`react-native-svg`/`lucide-react-native` before, not an oversight.

## 13. Testing approach preview

- **Domain** (`src/domain/education/`): `getFullRules('es'|'en')` returns 5
  documents sorted by `order`; `rule-content.ts`'s block shapes; `cue-store.ts`'s
  `storageKey()` pure function.
- **Platform** (`src/platform/education/cue-store.ts`): `shouldShowCallout`/
  `dismissCallout` against a mocked `AsyncStorage` (same
  `moduleNameMapper`-based mock ADR-013 already established) — happy path +
  the fail-open path (mocked rejection → `shouldShowCallout` still resolves
  `true`, `dismissCallout` doesn't throw).
- **Component (RNTL)**: `RulesAccordion` expand/collapse; `ScoringCalculator`'s
  live recompute + the tied-penalty-shootout alert case (mirrors the exact
  regression class Bolt 10 flagged as "easy to get subtly wrong without an
  explicit tied-entries test," applied here to the calculator's own tied-
  shootout state); `CalculatorErrorBoundary`'s fallback-to-`ScoringTable`
  path (force a thrown error, assert the fallback renders); `DismissibleCallout`
  shown-by-default → dismissed-after-tap; `OnboardingRulesScreen`'s new body
  (Continue/Skip still advance the wizard unchanged — a regression check
  against Bolt 3's existing behavior, not new domain logic).
- **Device/E2E**: deferred to the user's own manual pass per standing
  preference (no `agent-device` invocation planned). One specific manual path
  worth naming now, not deferred silently: re-verify Bolt 0's still-open
  fallback-path test (kill the `education` dev server mid-session, confirm
  `RemoteBoundary`'s retry UI) against the **new** `EducationScreen`
  pushed-route shape (§6.3) — same mechanism, new call site, worth a fresh
  manual confirmation rather than assuming the relocation preserved it.

## 14. Summary of decisions requiring ADRs (written next stage)

1. **MF placement reconfirmed** (§1) — `education` stays a remote, same class
   of decision as ADR-036 (`pools` reconfirm), not ADR-048 (`scoring-rankings`
   change).
2. **Rendering pipeline** (§2) — typed `RuleContentBlock[]` data + a plain RN
   renderer, no markdown/MDX library added — a genuine "don't add a
   dependency the content doesn't need" decision, worth its own record given
   this project's probe-first history with new packages.
3. **Onboarding→Rules-Center is not a live deep link** (§5.1) — resolved by
   ADR-001's existing architecture, not a new mechanism; worth recording so a
   future reviewer doesn't mistake the informational text for an incomplete
   feature.
4. **Home-button push route, not a 5th tab** (§6) — a deliberate deviation
   from `system-context.md §7`'s own documented tab anticipation, same class
   of "real investigation overturns a prior anticipation" record as ADR-048.
5. **EDU-4 storage** (§9) — `AsyncStorage`, async-adapted, fail-open preserved;
   flags a new, unproven MF-shared-singleton question (§9.2) for Implement to
   resolve via a real build probe before shipping, not assume safe.
6. **Twin-component policy applied twice** (§7) — `ScoreBreakdownPanel`/
   education's explainer (checkpoint-resolved) and the newly-identical
   `ScoringTable`/`OnboardingScoringSummary` case — one ADR can cover both
   instances of the same policy.

---

**Checkpoint:** Design stage complete. Two decisions in this document are
genuine deviations from a previously-documented expectation, not
rubber-stamps — §6's Home-button-not-tab call (against `system-context.md
§7`'s tab anticipation) and §9.2's flag that `AsyncStorage`'s remote-side MF
behavior is unproven, not assumed. Both are evidence-based, not guesses, but
are surfaced explicitly here for human review before ADR stage, per this
bolt's own checkpoint discipline — not blockers, but worth an explicit nod
given one contradicts a document's stated anticipation and the other opens a
new native-module cross-bundle question this project has been burned by
before (`react-native-svg`, Bolt 8).
