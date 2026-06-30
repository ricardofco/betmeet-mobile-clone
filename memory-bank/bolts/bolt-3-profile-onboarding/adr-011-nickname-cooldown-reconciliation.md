# ADR-011 — Nickname Cooldown Reconciliation: One Free Post-Onboarding Change, Not Two

**Date:** 2026-06-30
**Status:** Accepted
**Bolt:** 3 — Profile & Onboarding

---

## Context

This bolt's `model.md` (Model stage, §2.2 `NicknameChangeEligibility`) was originally written to encode **two** free post-onboarding nickname changes before the 30-day cooldown applies:

> count `0` → allowed (free grace change); count `1` → also allowed ("the second post-onboarding change"); only count `>= 2` rate-limited.

This was based on an ambiguous reading of two specs that disagreed with each other and, in one case, with itself:

- `units/unit-02-profile/unit-brief.md`'s "Source rules" line said, correctly and unambiguously: *"the 30-day change cooldown with the onboarding + **one-free-grace-change** exemption."*
- `units/unit-02-profile/stories/PROFILE-1-nickname.md`'s acceptance-criteria bullet, before correction, read: *"...a second post-onboarding change is allowed; a third attempt within 30 days of the second is rejected"* — language that, read in isolation, implies **two** free changes (the first AND the second), with only the **third** ever rate-limited.
- `memory-bank/project/domain-overview.md §5.2` independently states: *"the initial onboarding assignment AND one free post-onboarding change are both exempt; only the **third+** change is rate-limited"* — itself ambiguous, because "third+ change" can be parsed either as "the third nickname-setting event counting the onboarding one" (= one free post-onboarding change, matching the unit-brief) or "the third post-onboarding change" (= two free post-onboarding changes, matching the old AC wording). The Model stage resolved this ambiguity the wrong way.

Because the unit-brief and the (then-ambiguous) story AC could both be read as internally consistent but mutually exclusive on the count, and because `domain-overview.md` itself didn't disambiguate, the Model stage picked the **two-free-changes** reading and built `evaluateNicknameChangeEligibility`'s decision table around it.

### Resolution: ground-truth investigation against the real, running app

A direct investigation of `betmeet-clone` — the sibling Next.js/Supabase repo that is this migration's actual functional source of truth — resolved the ambiguity conclusively. Evidence, in order of authority:

1. **The real `setNickname` server action** (`betmeet-clone/src/features/profile/actions/set-nickname.ts`), the actual code that runs in production:

   ```ts
   const NICKNAME_CHANGE_COOLDOWN_DAYS = 30;
   // ...
   if (
     existing?.onboardingCompleted &&
     existing.nicknameChangeCount >= 2 &&
     existing.nicknameUpdatedAt
   ) {
     const elapsedDays = (Date.now() - existing.nicknameUpdatedAt.getTime()) / (1000 * 60 * 60 * 24);
     if (elapsedDays < NICKNAME_CHANGE_COOLDOWN_DAYS) {
       return { error: "rate_limited" as const };
     }
   }
   ```

   The gate fires once `nicknameChangeCount >= 2`. `nicknameChangeCount` is incremented on **every** permitted nickname write, **including the very first onboarding assignment** (`nextNicknameChangeCount = existing?.onboardingCompleted ? ... + 1 : 1` — the `else` branch, reached during onboarding, sets it to `1` on the very first assignment). So: assignment during onboarding → count becomes `1`. First post-onboarding change → count becomes `2`, but the gate check happens *before* this write, when count was still `1` (`< 2`) — so this change is **never blocked**. The *second* post-onboarding change attempt is the first one evaluated with count already at `2` — **this is the one that gets gated**. That is exactly **one** free post-onboarding change, not two.

2. **`betmeet-clone`'s own requirements doc**, `aidlc-docs/inception/requirements/requirements.md`, **FR-REFINE-17.3**: *"cooldown de nickname aplica después de consumir la oportunidad de gracia post-onboarding, no tras primera asignación"* ("nickname cooldown applies after consuming the post-onboarding grace opportunity, not after the first assignment") — explicitly singular: **one** grace opportunity.

3. **`betmeet-clone`'s own state log**, `aidlc-docs/aidlc-state.md`: *"después de la asignación de nickname en onboarding existe **una oportunidad de gracia** para cambiarlo sin esperar 30 días; el cooldown aplica a intentos posteriores"* ("after the onboarding nickname assignment there is **one grace opportunity** to change it without waiting 30 days; cooldown applies to subsequent attempts") and, even more directly: *"`setNickname` usa `nicknameChangeCount` para permitir nickname #2 sin cooldown y bloquear desde nickname #3 dentro de 30 días"* — nickname **#2** (the first post-onboarding change) is free; nickname **#3** (the second post-onboarding change) is the first one blocked within 30 days. "#1" is the onboarding assignment itself.

4. **`betmeet-clone`'s test suite** for this action (`set-nickname.test.ts`, 7/7 passing per the project's own audit log) exercises exactly this contract: a change immediately after onboarding succeeds with no cooldown check; a *second* post-onboarding change within 30 days is rejected with `rate_limited`.

All four sources agree, independently, with no ambiguity: **exactly one free post-onboarding nickname change**, then a 30-day cooldown from then on.

---

## Decision

1. **The rule is corrected to: one free post-onboarding nickname change, then a 30-day cooldown.** `model.md §2.2`'s `evaluateNicknameChangeEligibility` decision table is updated:

   | `onboardingCompleted` | `postOnboardingChangeCount` | Outcome |
   |---|---|---|
   | `false` | (any) | `allowed: true` — unlimited pre-onboarding |
   | `true` | `0` | `allowed: true` — the one free grace change |
   | `true` | `>= 1` | Cooldown-gated: `allowed: true` only if `now >= lastChangeAt + 30 days` |

   This is the bolt's zero-based equivalent of the real app's `nicknameChangeCount >= 2` gate (the mobile domain model's `postOnboardingChangeCount` excludes the onboarding assignment from its count, unlike the source's `nicknameChangeCount`, which includes it — a deliberate naming/shape choice for this bolt's domain layer, not a behavioral difference; see model.md §2.2's restated table for the explicit mapping).

2. **`PROFILE-1-nickname.md`'s acceptance criteria has been corrected** (prior to this ADR, by direct edit) from the ambiguous "a second post-onboarding change is allowed; a third attempt within 30 days of the second is rejected" to the unambiguous event-based phrasing: *"The initial nickname assignment during onboarding is never blocked by cooldown. The first nickname change after onboarding is complete (the one free post-onboarding 'grace' change) is also never blocked by cooldown. Any further change attempt is rejected with a clear 'try again in N days' message if it falls within 30 days of the last permitted change..."*

3. **`unit-brief.md`'s "Source rules" line required no change** — its "one-free-grace-change exemption" phrasing was correct from the start. The defect was isolated to the story-level AC wording; the unit brief is the artifact that should have been trusted, and was.

4. **`domain-overview.md §5.2` is left as-is** (out of this repo's authority to edit — it documents the *web app's* domain knowledge, owned by the `betmeet-clone`-investigation artifacts, not this migration's Construction stage). Its "third+ change is rate-limited" phrasing is retroactively understood, per the evidence above, to mean "the third nickname-setting event counting the onboarding assignment" — i.e. one free post-onboarding change — consistent with this ADR's resolution, not the misreading the Model stage originally took.

5. **Backend contract implication** (design.md §3.1): the mobile client's `profile.changeNickname` and `profile.getNicknameCooldownState` capabilities must implement equivalent gating server-side — **not** as a client-only check. This mirrors `setNickname`'s own posture: the real app enforces this rule entirely in the server action, with no DB-level (SQL trigger/RPC) enforcement. The mobile `evaluateNicknameChangeEligibility` (model.md §2.2) exists only as an **advisory** client-side projection of the same backend-reported state (so Settings can show an accurate countdown without an extra round trip) — the backend capability is the actual authority, exactly as PROFILE-1's AC states ("enforced server-side regardless of what the client believes").

---

## Consequences

- `model.md §2.2`'s decision table, ubiquitous-language entries ("Cooldown window"), and the top-of-file correction note now match the real app's behavior exactly — no remaining two-free-changes path anywhere in this bolt's artifacts.
- The Test stage (next) must assert the corrected table: `postOnboardingChangeCount: 1` is **gated** (not exempt) when within 30 days of `lastChangeAt` — this is the single most important test case in this bolt, since it's the exact case the original (wrong) model would have gotten backwards.
- This is a documentation/model-only correction at this stage — no application code had been written yet when the correction was made (Model stage was the last completed stage before this reconciliation), so there is no code migration needed, only the Design/Implement stages proceeding from the corrected model.
- Process note for future bolts: when a unit-brief and a story's AC disagree on a quantitative rule, prefer the unit-brief's phrasing as the presumptive default *and* flag the conflict explicitly for human resolution, rather than silently picking one reading during Model. This bolt's original Model-stage error happened precisely because the conflict was resolved internally instead of surfaced.
