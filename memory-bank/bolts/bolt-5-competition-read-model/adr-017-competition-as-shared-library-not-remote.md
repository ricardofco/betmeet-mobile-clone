# ADR-017 — `competition` ships as a shared library (`src/shared/competition/`), not a federated remote

## Context

`requirements.md §7.4` leaves `competition` deliberately unresolved at Inception: **"Remote or shared"** — the only feature group given a dual placement instead of one firm answer. `system-context.md §4`'s Module Federation topology diagram nonetheless draws `competition` as one of four boxes under "Module Federation v2 (on-demand remotes)," alongside `pools`, `scoring-rankings`, and `education`. `unit-04-competition/unit-brief.md` repeats the same "Remote or shared" framing without resolving it, deferring the call to Construction.

Design-stage investigation surfaced a hard dependency that Inception's per-feature placement table did not cross-reference explicitly:

- `requirements.md §7.4` places **`predictions` in the host bundle**, with an explicit note that this is "an explicit correction from the default suggestion" — done specifically because predictions is "the highest-frequency screen in the product — must not pay an on-demand download cost."
- `unit-05-predictions/unit-brief.md`'s own "Depends on" list names `unit-04-competition` directly: "match/team data, kickoff time, phase type." PREDICTIONS-1's story-level dependency list repeats this: "`unit-04-competition` (match/team/kickoff data)."
- `domain-overview.md §7`'s cross-feature dependency map lists `predictions ───────→ competition (reads match/team/fixture data)` as a direct, synchronous dependency — not an optional enhancement, but the data the prediction screen's primary content (the list of matches to predict on) is built from. Predictions cannot render without it.
- The bolt-plan sequencing already encodes this: Bolt 6 (Predictions) depends on Bolt 5 (Competition), confirming the product intends Bolt 6 to consume Bolt 5's output directly and soon.

Placing `competition`'s domain/query data layer behind a Module Federation remote-download boundary would mean the host's single highest-frequency screen (Predictions) either (a) blocks its first paint on an on-demand chunk download, reintroducing exactly the problem `requirements.md §7.4` pulled `predictions` itself out of the remote-by-default rule to avoid, or (b) requires `predictions` to eagerly preload the `competition` remote at host startup anyway — at which point the "remote" buys no deferred-load benefit and only adds Module Federation's runtime/version-negotiation overhead for no payoff.

This is the same category of re-evaluation Bolt 4 already performed for `scoring` (ADR-015): an Inception-time anticipation (`scoring` "shared" per ADR-005, listed for MF `shared` registration per ADR-002) was revisited once the concrete package's properties were known, and the original anticipation was superseded by a more precise answer specific to that package.

## Decision

`competition`'s domain logic, TanStack Query hooks, Zustand UI-state store, and presentational components ship as **`src/shared/competition/`** (plus `src/domain/competition/` for the framework-free logic layer) — a **filesystem-shared library**, structurally identical to how `src/shared/scoring/` was placed in Bolt 4 (ADR-015), **not** a federated Module Federation remote.

Concretely:

1. There is one physical directory tree (`src/domain/competition/` + `src/shared/competition/`) imported via the existing `@` alias, which already resolves to `src/` in every rspack config (host and any current/future remote) — no new alias, no new MF `shared`-config entry, no new `rspack.config.competition-remote.mjs`.
2. The host's Predictions screen (Bolt 6) imports `@/shared/competition` directly, with zero remote-chunk download in the critical render path — consistent with `requirements.md §7.4`'s explicit predictions-performance carve-out.
3. `system-context.md §4`'s topology diagram, which draws `competition` as a remote box, is **superseded for the data/domain/query layer** by this ADR — the same way ADR-015 superseded ADR-002's anticipation for `scoring`. The diagram is not edited retroactively (it was a reasonable Inception-time anticipation under the information available then); this ADR is the record of the updated reasoning.
4. The "Remote" half of Inception's "Remote or shared" framing is **not discarded outright** — it is narrowed to a future, lower-frequency **standalone fixture-browsing screen** (a dedicated "browse all matches" destination independent of predicting), should the product add one later. That hypothetical screen could mount `src/shared/competition/`'s existing components from inside a future remote without duplicating any domain logic — the same shared-singleton structure already proven by `scoring`. This bolt does not build that screen; no story in COMPETITION-1/2/3 requests a standalone browse-only route.

## Consequences

- `rspack.config.mjs` and `rspack.config.education-remote.mjs` are unchanged by this bolt (no new remote scaffolded, no new `shared` MF entries) — same no-config-churn outcome ADR-015 produced for `scoring`.
- Predictions (Bolt 6) gets render-blocking access to fixture/team data with no download-cost tradeoff, directly satisfying `requirements.md §7.4`'s rationale for host-placing predictions in the first place.
- If a future bolt adds a genuinely low-frequency, browse-only competition screen as a *separate* navigable destination from Predictions, that screen — and only that screen — is the legitimate candidate for a new federated remote; this is a new ADR at that time, not an automatic consequence of this one.
- This decision applies to the **data/domain/component layer**, not necessarily every future competition-adjacent UI (e.g. an admin-facing sync dashboard, `unit-10-admin`, remains independently placed as "Remote, low priority" per `requirements.md §7.4` and is unaffected by this ADR).
- Supersedes `system-context.md §4`'s topology diagram's depiction of `competition` as an on-demand remote, for the data/domain/query layer specifically. `unit-04-competition/unit-brief.md`'s "Remote or shared" framing is resolved as **shared** by this ADR.
