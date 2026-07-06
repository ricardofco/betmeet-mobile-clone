# Bolt Plan — Liga Mundial Mobile Migration

> **Intent:** `liga-mundial-mobile-migration` · Checkpoint 3 artifact (presented alongside `system-context.md` and the 10 unit briefs/stories for combined review). Sequencing reflects the dependency map in `domain-overview.md §7` and the unit dependency notes in each `units/{unit-id}/unit-brief.md`. Bolt IDs are provisional — Construction may renumber when it actually opens `memory-bank/bolts/{bolt-id}/`.

## How to read this plan

Each bolt lists its stories, what it depends on having already shipped, and a risk flag (`Low`/`Medium`/`High`) carried from `migration-analysis.md §4` and each unit brief's own risk notes. Bolts are sequenced for dependency correctness, not for calendar time — actual time-boxing happens in Construction once a team/velocity exists. Two bolts marked **parallelizable** can be built alongside the bolt before them by a separate workstream without blocking.

## Bolt 0 — Platform scaffolding

**Not story-based** (infrastructure, precedes any unit). Deliverables: Module Federation host/remote scaffold (`/repack-init`), the Supabase encapsulation adapter skeleton (`system-context.md §2`), the Backend-API client skeleton, secure-storage wiring baseline. This bolt produces the ADRs that resolve requirements.md §8's deferred items (state management, navigation library, exact `scoring` packaging mechanism) — those decisions are **inputs to every later bolt**, so this one must close first.

- **Risk: Medium.** Gets the architecture's foundational choices locked in; a wrong call here is expensive to unwind later, but the work itself is well-understood (it's largely running existing plugin tooling, not novel design).

## Bolt 1 — Auth core

**Stories:** AUTH-1 (email/password), AUTH-7 (navigation guard), AUTH-8 (secure session persistence).
**Depends on:** Bolt 0.
**Why this grouping:** the minimum viable authenticated shell — nothing else in the app can be meaningfully built or tested without a working guard and a way to sign in.

- **Risk: High.** AUTH-7 is "the single most domain-critical story in the whole migration" per its own story file — get the claim-table verification right here before any other bolt builds on top of it.

## Bolt 2 — Auth secondary flows

**Stories:** AUTH-2 (Google OAuth + deep link), AUTH-3 (TOTP MFA), AUTH-4 (forgot/reset password), AUTH-5 (change password/email).
**Depends on:** Bolt 1.

- **Risk: Medium-High.** Deep-link plumbing (AUTH-2, AUTH-4) and the TOTP-only-with-a-passkey-shaped-seam constraint (AUTH-3) are both genuinely new designs, not ports — budget real time, don't estimate by web-app parity alone.

## Bolt 3 — Profile & onboarding

**Stories:** PROFILE-1 through PROFILE-5.
**Depends on:** Bolt 1 (needs a session to have a profile).

- **Risk: Medium.** The nickname-cooldown-with-grace logic (PROFILE-1) has several edge cases worth explicit unit tests; avatar upload (PROFILE-2) is this bolt's only native-module touchpoint (`react-native-image-picker`).

## Bolt 4 — Scoring package *(parallelizable with Bolts 1–3)*

**Stories:** SCORING-1, SCORING-2.
**Depends on:** Bolt 0 only (a true leaf unit — no other unit dependency).

- **Risk: Low.** Recommended as a literal first-week parallel workstream per `migration-analysis.md §4`'s explicit framing of `scoring` as the lowest-risk, highest-value early slice — a separate contributor could start this the same day as Bolt 1 without conflict.

## Bolt 5 — Competition read model

**Stories:** COMPETITION-1, COMPETITION-2, COMPETITION-3.
**Depends on:** Bolt 1 (session-gated screens), Bolt 4 (no hard dependency, but COMPETITION's match data feeds directly into predictions which does depend on scoring context).

- **Risk: Low-Medium.** The Realtime-subscription reliability across app foreground/background transitions (COMPETITION-2) is the one piece worth a deliberate device-level test pass, not just unit tests.

## Bolt 6 — Predictions core

**Stories:** PREDICTIONS-1, PREDICTIONS-2, PREDICTIONS-5.
**Depends on:** Bolt 3 (onboarding gate), Bolt 4 (scoring, for PREDICTIONS-5's breakdown display), Bolt 5 (match/team data).

- **Risk: Medium.** This is the highest-traffic screen in the app (host-bundle placement, requirements.md §7.4) — the kickoff-lock correctness (PREDICTIONS-1) and bundle-size discipline both deserve explicit review before sign-off, not just functional correctness.

## Bolt 7 — Pools core

**Stories:** POOLS-1, POOLS-2, POOLS-4, POOLS-5.
**Depends on:** Bolt 3 (onboarding gate).

- **Risk: Low-Medium.** Mostly straightforward CRUD; the one subtlety is that no "tournament freeze" gate should be (re)introduced on any membership action — call this out explicitly in review.

## Bolt 8 — Pools advanced, predictions↔pools integration, and account-deletion completion

**Stories:** POOLS-3 (directed invites), POOLS-6 (predictions grid + anti-bias masking), POOLS-7 (ownership transfer), PREDICTIONS-3 (pool override + dual-save), PREDICTIONS-4 (reset override), **AUTH-6 (account deletion)**.
**Depends on:** Bolt 6, Bolt 7.
**Why AUTH-6 is here, not in Bolt 2:** AUTH-6's acceptance criteria require POOLS-7's ownership-transfer capability to exist first (it surfaces inline during deletion) — sequencing AUTH-6 here, after pools exists, avoids building a stub-then-rework path. This is a deliberate cross-unit bolt, not a unit-aligned one.

- **Risk: Medium-High.** The anti-bias masking (POOLS-6) must be verified at the API-response level, not just the UI (per its own story's explicit acceptance criterion) — a masking bug here is a real privacy regression, not a cosmetic one. The dual-save atomicity (PREDICTIONS-3) and the full account-deletion-with-ownership-transfer path (AUTH-6) are both "all-or-nothing or it's a data-integrity bug" flows — test the failure paths, not just the happy path.

## Bolt 9 — Navigation, i18n & Design Retrofit

**Not story-based** (cross-cutting UX/architecture retrofit, inserted 2026-07-03 mid-Construction per an approved change request — see `memory-bank/audit.md` and `../../progress.md`). **Depends on:** Bolt 8 (must not destabilize the just-closed Pools-advanced/account-deletion work; retrofits everything shipped in Bolts 0–8).

**Trigger:** user-reported UX gap during Bolt 8 Layer 2 — "everything lives on Home," missing iOS back buttons on `Pools`/`Settings`, no visual design system, no multi-language support. Evaluated as a change request (not a new unit) since it retrofits existing screens rather than adding a new business capability.

Deliverables:
- **Navigation shell** — extend the already-adopted React Navigation 7 (ADR-003, `@react-navigation/native`/`native-stack`) with `@react-navigation/bottom-tabs` + `@react-navigation/drawer`. Bottom tabs for the primary modules (`Home`/`Predictions`/`Pools`, each retaining its own native-stack for in-module push navigation so a back button is always available), a hamburger/drawer entry (not a tab) for `Settings` and its sub-screens. Federation boundaries (host vs. `pools`/`education` remotes) are unaffected — only the top-level container changes; `Pools` tab still mounts the `pools` remote's own internal navigator (ADR-032/034). Formal shape ADR to be recorded at this bolt's own ADR stage (Model → Design → ADR), not pre-decided here.
- **Back-button fix** — audit every `headerShown: false` route in `root-navigator.tsx` (confirmed gap: `Pools` and `Settings`, see audit.md) and every remote-owned stack; restore native default back header (or an explicit custom header with a back affordance) wherever a screen is reachable by pushing forward.
- **i18n** — `i18next` + `react-i18next` + `react-native-localize`. Device-locale detection, `es`/`en` supported, default `es` when undetected/unsupported. String-extraction pass across Bolts 5–8's screens (all currently hardcoded). Must reconcile with ADR-012 (profile-stored locale preference) — see **ADR-041**, which records this bolt's resolution of that relationship as an open question if not resolved beforehand.
- **Design system** — Tamagui adopted for shared/reusable component work; plain `StyleSheet` remains acceptable for simple/one-off cases (not a wholesale rewrite mandate). Establishes tokens (spacing/color/typography) to replace the current default-RN-starter look.
- **MF shared-singleton audit** — per the standing instruction in `activeContext.md`/`progress.md` (the `react-native-svg` Bolt-8 incident), every new package added here (`@react-navigation/bottom-tabs`, `@react-navigation/drawer`, `i18next`, `react-i18next`, `react-native-localize`, `tamagui`) must be added to `rspack.config.mjs`'s **and** every remote config's (`education`, `pools`) MF `shared` singleton list before Layer 2, not discovered on-device.

- **Risk: Medium-High.** Touches every existing screen's navigation registration (`screen-registry.ts`, `AuthGatedNavigator`'s guard-branch rendering, ADR-001) and every existing remote's shared-dependency list — regression risk across all of Bolts 0–8, not a greenfield addition. Budget a full regression pass (existing Jest suite + a real device Layer 2 pass), not just new-feature tests.

## Bolt 10 — Scoring & rankings

**Stories:** RANKINGS-1, RANKINGS-2, RANKINGS-3, RANKINGS-4.
**Depends on:** Bolt 6 (predictions exist to be scored), Bolt 8 (pool membership/joinedAt for pool leaderboards), Bolt 9 (new screens register into the tab/drawer shell, not a Home-hub button).

- **Risk: Medium.** The dense-ranking display (RANKINGS-1/2) and the "no penalty bonus during live projection" rule (RANKINGS-3) are both easy to get subtly wrong without an explicit tied-entries test case — write that test before marking this bolt done, not after a bug report.

## Bolt 11 — Notifications

**Stories:** NOTIF-1, NOTIF-2, NOTIF-3, NOTIF-4.
**Depends on:** Bolt 3 (onboarding wizard hosts NOTIF-1/NOTIF-4's entry point), Bolt 1 (session to tie a token to), Bolt 9 (tab/drawer shell).

- **Risk: High.** The platform-push setup itself (FCM/APNs project configuration, certificates/keys, real-device testing) is the riskiest *infrastructure* item in the whole plan — flag this bolt's start date as dependent on FCM/APNs project setup being complete, not just on the dependent bolts above being done. Recommend confirming the push-SDK choice (Expo Notifications vs. direct SDKs, requirements.md §8) before this bolt opens, since it's not resolvable mid-bolt without rework.

## Bolt 12 — Education

**Stories:** EDU-1, EDU-2, EDU-3, EDU-4.
**Depends on:** Bolt 4 (scoring), Bolt 3 (onboarding wizard hosts EDU-3), Bolt 9 (tab/drawer shell).

- **Risk: Low.** Can slip later in the schedule without blocking anything else — it's a remote, low-frequency, non-mutating unit by design.

## Bolt 13 — Admin

**Stories:** ADMIN-1 through ADMIN-5.
**Depends on:** Bolt 5 (match data), Bolt 10 (rescoring trigger target).

- **Risk: Low-Medium, lowest scheduling priority.** Included in full per the explicit "plan everything" decision (requirements.md §4), but nothing else in the app depends on it — safe to schedule last, or to descope from a first release without touching any other bolt's plan, if that becomes a later business decision (not assumed here).

## Sequencing summary (dependency-respecting order)

```
Bolt 0 ──┬─→ Bolt 1 ─→ Bolt 2
         │       │
         │       └─→ Bolt 3 ──┬─→ Bolt 6 ──┬─→ Bolt 8 ─→ Bolt 9 ─┬─→ Bolt 10 ─→ Bolt 13
         │                    │            │                    ├─→ Bolt 11
         └─→ Bolt 4 ──┬───────┘            │                    └─→ Bolt 12
                       └─→ Bolt 12         │
         Bolt 1 ─→ Bolt 5 ─────────────────┘
         Bolt 3 ─→ Bolt 7 ─────────────────┘
         Bolt 1, Bolt 3 ─→ Bolt 11
```

Bolt 4 can start in parallel with Bolt 1 from day one. Bolt 12 can start any time after Bolt 4 and Bolt 3 (and after Bolt 9's shell exists, for its tab/drawer registration). Bolt 11's start should be gated on push-infrastructure setup, not just on its dependent bolts. **Bolt 9 (Navigation/i18n/Design retrofit) was inserted 2026-07-03, after Bolt 8 closed** — it now gates every later bolt (10–13) because each registers its screens into the new tab/drawer shell rather than a Home-hub button.

## Risk register (rollup)

| Risk level | Bolts | Common thread |
|---|---|---|
| **High** | 1, 11 | Foundational correctness (guard) and platform infra (native push setup) — both have real cost-to-fix-later if rushed |
| **Medium-High** | 2, 8, 9 | Genuinely new designs (deep links, MFA seam), cross-cutting data-integrity flows (masking, dual-save, account deletion), and a whole-app navigation/i18n/design retrofit touching every existing screen |
| **Medium** | 0, 3, 6, 10, 13 | Well-understood work with specific edge cases worth deliberate test coverage |
| **Low-Medium** | 5, 7 | Mostly straightforward, one notable subtlety each |
| **Low** | 4, 12 | Pure logic / static content, no native modules, no backend mutation |

## Related artifacts

- `requirements.md`, `system-context.md` (this intent).
- `units/unit-01-auth/` through `units/unit-10-admin/` (unit briefs + stories this plan sequences).
- `../../progress.md` (updated alongside this plan, per the Inception agent's Step 7).
