# ADR-053 — `education`'s first host navigation entry point is a Home-screen button pushing a real route, NOT a 5th bottom tab

## Status
Accepted (2026-07-06).

## Context

Two prior documents disagree on the shape `education`'s navigation entry
point should take, and this bolt is the first to have to resolve the
disagreement against real, modeled scope rather than an anticipation
(`design.md §6.1`):

- `bolt-plan.md`'s Bolt 12 entry does **not** say "ships as a new tab" the
  way its Bolt 10 (Rankings) entry explicitly does — it only lists Bolt 9
  (nav/i18n/design shell) as a dependency.
- `system-context.md §7`'s Bolt-9 addendum **does** anticipate a 5th tab,
  written at Bolt 9's own Design stage before EDU-1..4 had been modeled in
  any depth: *"Rankings/Education join as tabs when Bolts 10/12 ship."* Per
  `bolt-plan.md`'s own framing ("Bolt IDs are provisional... Construction
  may renumber/re-decide"), this is a documented anticipation, not a binding
  decision — but it is a real, written expectation a future reviewer could
  reasonably expect this bolt to fulfill, so overturning it needs its own
  explicit record rather than a silent deviation.

`design.md §6.2`'s real re-examination, run once EDU-1..4's actual shape was
known (not a rubber-stamp of either document):

1. **Frequency mismatch with the tab row's existing members.** Every current
   tab (`Home`/`Predictions`/`Pools`/`Rankings`, the last added by Bolt 10 per
   ADR-048) is a primary, repeatedly-revisited surface — checked every
   matchday or league-management need. `education` is the explicit opposite
   by its own Inception rationale (`requirements.md §7.4`: "static,
   low-frequency content") and its own bolt-plan risk note ("low-frequency...
   by design"). A persistent 5th tab devoted to content a user opens once or
   twice ever is real, measurable tab-bar crowding for the 4 screens people
   actually use daily — a cost `system-context.md §7`'s anticipation didn't
   have EDU-1..4's confirmed low-frequency shape in hand to weigh when it was
   written.
2. **An existing, already-built seam does the job with zero new navigation
   concepts.** `HomeScreen` already has a real, exercised entry point for
   `education/App` today — Bolt 0's "load education remote" button
   (`src/host/navigation/screens/home-screen.tsx`), which lazy-imports
   `education/App` and wraps it in `RemoteBoundary` inline on Home. This is
   not a placeholder to discard; it is the literal mechanism this bolt needs,
   relocated from an inline toggle-render to a real pushed screen. Reusing it
   is less disruptive than adding a tab: zero `MainTabParamList`/
   `main-tab-navigator.tsx` changes, zero new tab icon.
3. **Bolt 0's still-open Layer 2 item stays exercisable, unchanged in
   substance.** `progress.md`'s open item — kill the `education` remote's
   dev server mid-session, confirm `RemoteBoundary`'s retry UI — currently
   depends on this exact Home button. Moving the `RemoteBoundary`+`lazy` call
   from an inline `showRemote` toggle into a dedicated pushed screen
   preserves the identical fallback behavior (same components, same retry
   callback), so this manual test path is not regressed or orphaned by the
   decision.
4. **No functional requirement forces a tab.** Nothing in
   `domain-overview.md` or the EDU-1..4 stories needs education reachable
   from more than one place, or reachable "at a glance" the way a tab
   implies. A single, discoverable entry point is sufficient.

## Decision

`education`'s first real host navigation entry point is a **Home-screen
button that pushes a new `Education` route onto `HomeStack`**, not a 5th
`MainTabParamList` tab. This is **a deliberate, evidence-based deviation from
`system-context.md §7`'s documented tab anticipation** — the same class of
"real investigation overturns a prior anticipation" record as ADR-048 for
`scoring-rankings`'s MF placement, just applied to a navigation-shape
question instead of an MF-bundle-placement one.

```
src/host/auth/navigation/auth-stack-params.ts
  HomeStackParamList  gains  Education: undefined

src/host/auth/navigation/screen-registry.ts
  Education: ['protected']   // same tag as Home/Predictions/Pools/Rankings

src/host/navigation/screens/education-screen.tsx   (NEW, thin host wrapper)
  — the exact lazy-import + RemoteBoundary + retry logic HomeScreen's
    `showRemote` toggle currently owns, moved here unchanged in substance.

src/host/navigation/main-tab-navigator.tsx
  HomeStackNavigator gains one more <HomeStack.Screen name="Education" .../>
  — no Tab.Navigator change, no new tabBarIcon, MainTabParamList untouched.

src/host/navigation/screens/home-screen.tsx
  `handleLoadRemote`'s `setShowRemote(true)` becomes
  `navigation.navigate('Education')`; the inline `showRemote`/`RemoteBoundary`
  JSX block is deleted from HomeScreen (moved to education-screen.tsx).
```

This is the first host screen this project pushes to **without** it being a
tab-root since Bolt 9's retrofit (every existing `AppStack`-era push became a
tab root in Bolt 9) — structurally unremarkable (native-stack push is the
oldest, most basic React Navigation primitive here, ADR-003), just worth
naming as a small "shape first" for a future bolt that might want the same
non-tab pattern.

## Consequences

- `MainTabParamList`/`main-tab-navigator.tsx`'s `Tab.Navigator` is
  **untouched** — no new tab icon, no `screen-registry.ts` churn beyond the
  one `Education` entry nested under `HomeStack`.
- `home.loadEducationRemote`'s i18n key is renamed to `home.openRulesCenter`
  (the old English string, "Load education remote," was always Bolt 0's own
  internal/demo framing, never real product copy) — an Implement-stage
  catalog rename, not a behavior change.
- **Flagged explicitly for a future reviewer**: `system-context.md §7`'s
  tab-anticipation line is now superseded for `education`, the same way
  ADR-017 superseded `system-context.md`'s topology diagram for
  `competition` and ADR-048 superseded it for `scoring-rankings` — the
  anticipation text is not edited retroactively; this ADR is the record of
  the updated reasoning.
- **Precedent for Bolt 13 (Admin)**: `requirements.md §7.4` also tags Admin
  "Remote (low priority)" and, like `education`, gives it no tab-shaped
  bolt-plan instruction — worth Bolt 13 re-running this same frequency/
  crowding check rather than assuming a tab is the default answer for every
  future remote's entry point.
- If a future bolt or product decision makes `education` a high-frequency
  surface (e.g., a recurring "daily rules tip" feature), this decision
  should be re-examined, not assumed permanent — same discipline this ADR
  itself just applied to `system-context.md §7`'s original anticipation.
