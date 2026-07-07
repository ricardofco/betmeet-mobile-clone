# ADR-055 — Rule content ships as a typed `RuleContentBlock[]` data shape + a small custom RN renderer; no MDX/markdown-parsing library added

## Status
Accepted (2026-07-06). Probe-first, but the probe's actual outcome was "no
library is needed at all."

## Context

`migration-analysis.md` (line 34/52) flags EDU-1's rendering pipeline as a
**Medium**-risk, Design-stage concern: "the *content* is portable as data;
only the rendering pipeline changes" — no MDX toolchain exists in React
Native the way `@content-collections/mdx` does on the web
(`content-collections.ts` + `content/rules/{es,en}/*.mdx`). Model stage
deliberately left the rendering mechanism unresolved (`model.md §2`/`§10`
item 1), flagging three real options for Design to choose among: a
pre-compiled JSON AST, `react-native-markdown-display` against raw markdown,
or plain structured RN components per rule document.

Design stage's actual content audit (`design.md §2.1`), not an assumption:
all five real rule documents
(`content/rules/en/{scoring,penalties,match-locks,ties,pools}.mdx`, the
`es/` set mirrors the same shape) were read directly and total 12-22 lines
each, using **only**: one `## ` heading (redundant with the document's own
`title` frontmatter, not re-rendered separately), plain paragraphs, bold
spans (`**text**`), unordered bullet lists, and exactly one literal
"**Example**: ..." callout paragraph (`scoring.mdx`). **No tables, images,
links, code blocks, or nested lists appear anywhere in the real content.**

This project's own probe-first discipline for new dependencies
(`coding-standards.md`, reinforced by ADR-045's Tamagui/Rspack
bundler-resolution probe and ADR-046's `react-native-reanimated`/
`react-native-worklets` native-compile probe) applies to any new package,
not only native-module ones — a markdown-rendering library
(`react-native-markdown-display`) or an MDX-AST compiler would be a **new
dependency** requiring the same "actually build with it before committing"
discipline. Given §2.1's real, bounded content-complexity ceiling, either
option would solve a problem this content doesn't have.

## Decision

Content is authored directly as **typed data** — no markdown syntax is
parsed at runtime at all, and no new rendering-library dependency is added:

```
src/domain/education/rule-content.ts   (framework-free)

export type RuleContentBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'example'; label: string; text: string };  // scoring.mdx's one callout

export interface RuleDocument {
  slug: string;   // 'scoring' | 'penalties' | 'match-locks' | 'ties' | 'pools'
  order: number;  // 1..5, display sort key — mirrors betmeet-clone's field 1:1
  sections: RuleContentBlock[];
}

export function getFullRules(locale: AppLocale): RuleDocument[];
```

`title` is deliberately **not** stored in this data — it comes from the i18n
catalog (`rules.documents.<slug>.title`) since every other bolt's
user-facing string lives in `en.ts`/`es.ts`, and a document title is chrome
text, not content-body prose. `audience` is dropped entirely (mobile only
ever needs `'full'`, `model.md §6`).

`src/remotes/education/components/rule-content-renderer.tsx` (presentational,
Tamagui, ~30 lines): maps each `RuleContentBlock` to `BodyText` (paragraph), a
bulleted `YStack` of `BodyText` rows (list, plain `•` glyph prefix — no new
icon dependency), or a `Card`-nested `BodyText` pair (the one `example`
block) — zero branching beyond a `switch` on `block.type`.

This mirrors `betmeet-clone`'s own `getFullRules(locale)` name/signature
(`src/lib/rules-content.ts`) — the same "reimplemented fresh, same shape,
different mechanism" precedent as `resolve-points.ts`/
`pool-leaderboard-aggregation.ts` (Bolt 10) — but the **body** field is a
typed block array instead of compiled MDX, since no consumer here needs
markdown syntax, only paragraph/bullet/one-callout layout.

**Why `src/domain/education/`, not `src/remotes/education/`, for the data**:
framework-free, testable in isolation (`getFullRules('es').length === 5`
needs no RN render) — mirrors `src/domain/rankings/`'s "pure data/logic,
filesystem-shared, UI reads it" split (Bolt 10 `design.md §2`). No second
bundle consumes this data today, so it stays under `domain/` rather than
being promoted to a cross-boundary `shared/` tier (ADR-024's "promote on
second consumer" discipline, reapplied) — `education` is currently its only
reader.

## Consequences

- No new npm dependency (`react-native-markdown-display` or otherwise) is
  added by this bolt for rule-content rendering — zero probe-and-fail risk
  from a new package, zero new MF-shared-singleton question for the
  `education` remote's rendering pipeline specifically.
- The five real rule documents' prose/bullets/one callout must be
  transcribed by hand into `RuleContentBlock[]` literals (per locale, per
  slug) at Implement stage — a one-time authoring cost, not an ongoing
  parsing cost. Any future edit to rule-document copy is a data edit in
  `rule-content.ts`, not a markdown-source edit requiring a build-time
  compile step.
- **Explicit boundary for future reviewers**: this decision is scoped to
  today's actual content shape. If a future rule document needs a table, an
  image, a nested list, or a hyperlink — content shapes §2.1 confirmed do
  **not** exist in the real 5 documents today — this ADR's `RuleContentBlock`
  union should be extended additively (a new block-type variant) or, if the
  complexity grows enough (e.g., genuinely nested/recursive structure), this
  whole decision should be revisited rather than the union being stretched
  indefinitely to accommodate shapes it wasn't designed for.
- This is recorded as a genuine "probe-first, but the actual probe outcome
  was 'no library needed at all'" decision, following the same discipline
  ADR-045/046 established for native-module probes, just applied here to a
  content-rendering-mechanism choice — the probe was the direct content
  audit (`design.md §2.1`) rather than an install-and-build attempt, since
  the audit itself was sufficient to rule out needing the dependency at all.
