# ADR-057 — `admin` remote placement (Inception default) re-examined and reconfirmed — the first genuinely freestanding remote

## Status
Accepted (2026-07-06).

## Context

`requirements.md §7.4`/`system-context.md §4` default `admin` to a Module
Federation **remote** ("desktop-dashboard-shaped, infrequent, admin-only
audience"). Bolts 5, 7, 9, 10, and 12 each did a real re-examination of an
inherited MF-placement default rather than rubber-stamping it — Bolt 5
**changed** it for `competition` (ADR-017, a render-blocking outbound
dependency), Bolt 7→8 **reconfirmed** it for `pools` (ADR-032→ADR-036), Bolt
10 **changed** it for `scoring-rankings` (ADR-048, split across
host/`pools`/domain/backend), and Bolt 12 **reconfirmed** it for `education`
(ADR-052). This bolt runs the same check against ADMIN-1..5's now-fully-modeled
scope (`design.md §4`).

`design.md §4.2`'s investigation trail:

1. **Cross-feature dependency map** (`model.md §9` item 3, confirmed there):
   only **outbound** edges exist — `admin ──→ competition`,
   `admin ──→ scoring-rankings` (rescoring trigger target), `admin ──→
   scoring` (shared pure algorithm import, never redefined). **Zero** inbound
   edges — no other feature ever reaches into `admin`, the same
   directionality class that let `education`/`pools` reconfirm as remotes
   without a render-blocking pull forcing host co-location.
2. **Unlike every other bolt's placement question, `admin` has no existing
   screen anywhere that already owns it.** Rankings-1 had an obvious home (a
   4th tab); Rankings-2 had `pool-detail-screen.tsx` to extend; Education had
   Bolt 0's literal pre-existing demo mechanism to relocate. Admin is the
   first bolt with a genuinely freestanding surface and zero precedent
   pulling it toward the host or an existing remote.
3. **Multi-screen, form-heavy shape** — closer to `pools` (6 screens,
   ADR-032/034) than to `predictions`/`rankings-1` (one screen each).
   ADMIN-1..5 need four real screens (`AdminHomeScreen`, `SweepStatusScreen`,
   `ForceResultScreen`, `RevertOverrideScreen`), each with its own local form
   state and, for the two mutating screens, a real match-picker sub-flow —
   the same "own internal stack navigator" shape that justified `pools` as a
   remote.
4. **A genuinely rare-audience surface**, unlike every other remote/host
   screen shipped so far. Every existing tab and even `Education`
   (low-frequency, but every user eventually opens it) is reached by the
   general user population. Admin is reached by, in practice, zero users for
   the overwhelming majority of app installs — the Settings row is hidden
   from everyone but the one seeded `ADMIN` account (`design.md §11`).
   Deferring this bundle's download until that specific person taps that
   specific row is a real, quantifiable win in a way it wasn't for Rankings
   (every user hits Rankings routinely) — the first bolt where "keep the
   host bundle lean" has a genuine, non-boilerplate payoff.
5. **No new native module** — plain Tamagui forms + numeric `TextInput`s +
   `FlashList` for the match picker (already-linked). No blocker either way.
6. **MF-singleton risk is fully proven already, zero new categories.**
   `admin` is the second remote (after `pools`) to need `@tanstack/react-query`
   as an MF-shared singleton and the second (after `pools`) to need
   `@shopify/flash-list`; it needs the same `tamagui`/`i18next`+`react-i18next`/
   `react-dom` shim trio every remote since Bolt 9 has already proven safe.
   No new singleton category is introduced at all — unlike `education`'s
   still-being-verified `AsyncStorage` risk (ADR-056).

## Decision

**`admin` ships as this repo's THIRD real Module Federation remote**
(`src/remotes/admin/`), unchanged from Inception's placement. This is a
genuine re-examination whose conclusion happens to match Inception's default
(same class of outcome as `education`'s ADR-052 reconfirm), but for reasons
specific to Admin's own now-modeled shape (points 2-4 above are new findings,
not restatements of Inception's one-line rationale) — not a rubber stamp.
`src/remotes/admin/index.js` exposes `./App`, mirroring `education`'s/
`pools`' `exposes` shape exactly. `AdminRemoteEntry.tsx` owns its own
`NativeStackNavigator` (`AdminHome`/`SweepStatus`/`ForceResult`/
`RevertOverride`) — the host has zero compile-time knowledge of this internal
screen graph, the same shape `pools` established (ADR-032).

## Consequences

- No new dev-tooling category needed to reach parity with `pools`/`education`:
  `rspack.config.admin-remote.mjs` (new, modeled on
  `rspack.config.pools-remote.mjs`), port `8084` (next free after
  education/pools' `8082`/`8083`), `"start:admin"` script added to
  `package.json`.
- This is the **first remote in the whole plan to introduce zero net-new MF
  risk** — a real, quantifiable advantage over every prior remote's first
  retrofit (contrast `education`'s still-being-verified `AsyncStorage`
  question, ADR-056), worth naming explicitly since it lowers this
  already-high-blast-radius bolt's implementation risk on at least this one
  axis.
- Host's `admin-screen.tsx` (new, `src/host/navigation/screens/`) is a direct
  structural copy of `education-screen.tsx` (ADR-053): `lazy(() =>
  import('admin/App'))` + `RemoteBoundary` + retry — the exact,
  already-twice-proven mechanism, no new pattern invented.
- This is the fifth time this repo has explicitly re-examined an inherited
  MF-placement default at a bolt's Design stage (after ADR-017, ADR-036,
  ADR-048, ADR-052) — reconfirming, per ADR-036/ADR-052's own closing notes,
  that this is a routine, expected checkpoint for this project's placement
  decisions, not a one-off.
- **Flagged at the Design checkpoint as worth a second look given this bolt's
  overall blast radius** (it being the first genuinely freestanding remote,
  a different evidence shape than any prior placement check) — the
  investigation itself found no reason to deviate; this ADR is the record of
  that deliberate, non-rubber-stamped conclusion, reconfirmed final per the
  human checkpoint (2026-07-06).
- If a future bolt gives `admin` a render-blocking dependency from any other
  feature (none exists today), or if the freestanding/rare-audience
  assumption stops holding, this placement should be re-examined again — not
  assumed permanent, same discipline this ADR itself just applied to the
  Inception default.
