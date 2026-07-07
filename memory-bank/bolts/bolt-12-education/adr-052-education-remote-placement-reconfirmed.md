# ADR-052 — `education` remote placement (Inception default) re-examined and reconfirmed

## Status
Accepted (2026-07-06).

## Context

`requirements.md §7.4`/`system-context.md §4` default `education` to a Module
Federation **remote** ("static, low-frequency content — ideal for deferred
download"). Bolts 5, 7, 9, and 10 each did a real re-examination of an
inherited MF-placement default rather than rubber-stamping it — Bolt 5
**changed** it for `competition` (ADR-017, a render-blocking outbound
dependency forced filesystem-shared status), Bolt 7→8 **reconfirmed** it for
`pools` (ADR-032→ADR-036), and Bolt 10 **changed** it for
`scoring-rankings` (ADR-048, split across host/`pools`/domain/backend). This
bolt is the first time `education` itself gets real content (EDU-1..4) to
examine against — Bolt 0's existing `education` remote is a pure
Module-Federation-wiring demo shell, not evidence either way
(`model.md §0` item 3).

`design.md §1.2`'s investigation trail, run fresh against EDU-1..4's actual
modeled scope rather than repeating Inception's one-line rationale:

1. **Cross-feature dependency map** (`domain-overview.md §7`): the only two
   edges touching `education` are `education ───→ scoring` (a filesystem-
   shared pure-function import, zero MF cost, ADR-015) and
   `predictions ───→ education` (component reuse in `betmeet-clone`) —
   resolved at this bolt's Model-stage checkpoint as **independent twins**
   (`model.md §7`/`§10` item 3, `design.md §7`), meaning in this codebase
   `predictions` imports nothing from `education` at all. Neither edge is a
   render-blocking **outbound** pull the way `competition`'s ADR-017 needed
   (`predictions`' primary screen depending on `competition`'s data) — the
   pattern `pools`' own ADR-036 re-examination found for itself. Nothing
   forces host co-location.
2. **Genuinely non-mutating, confirmed twice over** (`model.md §7`,
   `design.md §1.2` point 2): zero `education.*` backend-capability group,
   zero `BackendApiClient` call anywhere in EDU-1..4. This means zero
   `@tanstack/react-query` MF-shared-singleton question arises for this
   remote at all — one fewer correctness-critical singleton to prove right,
   unlike `pools` (ADR-034).
3. **No native-module dependency from the rendering pipeline or the
   calculator** — confirmed in `design.md §2`/`§4`: the rule-content renderer
   and the scoring calculator's numeric `TextInput`s need zero new native
   modules. The one pre-existing native-backed dependency this bolt newly
   asks a *remote* (not just the host) to consume is `AsyncStorage` (EDU-4)
   — flagged separately and explicitly, not folded silently into this
   reconfirmation (see ADR-056).
4. **Content size favors deferred download, not host inclusion**: the five
   rule documents total roughly 100 lines of prose across two locales
   (`design.md §1.2` point 4, confirmed by reading
   `content/rules/{en,es}/*.mdx` directly) — exactly the "static,
   low-frequency content" shape `requirements.md §7.4`'s own rationale
   names, a still-true reason to defer this download rather than grow the
   host's always-loaded bundle.
5. **No multi-screen internal flow** — unlike `pools` (6 screens, its own
   internal stack navigator, ADR-032/034), EDU-1/EDU-2's real content is
   exactly what `betmeet-clone` renders on one page
   (`src/app/(app)/rules/page.tsx`). `education/App`'s exposed module stays
   a single scrollable screen, not an internal navigator — simpler than
   `pools`, consistent with this bolt's own "Low risk" bolt-plan framing.

## Decision

**`education` remains a Module Federation remote**, unchanged from
Inception's placement and Bolt 0's scaffold. This is a **reconfirm**, the
same class of decision as ADR-036 for `pools` — the investigation found no
new reason to overturn it, plus one additional reason (zero backend
capability, so zero React-Query MF-singleton risk) to keep it simple — not a
change like ADR-017 (`competition`) or ADR-048 (`scoring-rankings`).
`EducationRemoteEntry.tsx` stops being a demo shell and becomes the real
Rules Center screen; its `exposes` map (`'./App'`) is unchanged.

## Consequences

- No new rspack config file, no new dev-server port, no new `ScriptManager`
  entry — this bolt reuses the existing `rspack.config.education-remote.mjs`
  (port 8082, per Bolt 0), adding to its `shared` config rather than
  replacing it (§10 below / ADR-056).
- **This is the first time the `education` remote gets real screens using
  Tamagui/i18next** — `tech-stack.md`'s own standing note ("`education`
  remote config is explicitly unchanged by Bolt 9... re-audit if a future
  bolt gives it real screens") is exercised for the first time here. The
  required MF `shared` additions (`tamagui`, `i18next`/`react-i18next`, the
  `react-dom` alias, `@react-native-async-storage/async-storage`) mirror
  exactly what `pools` already proved safe (ADR-043/045), deliberately not
  introducing anything `pools` hasn't already validated — except
  `AsyncStorage`, the one genuinely new entry (ADR-056).
- If a future bolt's scope for `education` grows into a multi-screen flow
  (unlike today's single scrollable screen), or a real render-blocking
  dependency from a host screen onto `education`'s content is found, this
  placement should be re-examined again — not assumed permanent, same
  discipline this ADR itself just applied to the Inception default.
- This is the fourth time this repo has explicitly re-examined an inherited
  MF-placement default at a bolt's Design stage (after ADR-017, ADR-036,
  ADR-048) — reconfirming, per ADR-036's own closing note, that this is a
  routine, expected checkpoint for this project's placement decisions, not
  a one-off.
