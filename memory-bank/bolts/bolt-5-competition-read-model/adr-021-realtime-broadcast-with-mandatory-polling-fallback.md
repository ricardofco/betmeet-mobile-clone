# ADR-021 — Realtime Broadcast subscription with a non-optional polling fallback, and unconditional re-evaluation on foreground

## Context

COMPETITION-2's source rule (`domain-overview.md §5.9`/`§6`) is explicit about *why* the live-update mechanism is signal-only: "the backend emits a signal-only 'something changed, refetch' broadcast (no result payload) because the hosting model can't hold a long-lived per-client connection." This is a backend hosting constraint mobile must honor, not a mobile-side design choice to revisit.

`unit-04-competition/unit-brief.md`'s Risks section states this plainly: "Realtime-broadcast-and-refetch requires a working Supabase Realtime subscription from the RN client... verify this works reliably on both iOS and Android background/foreground transitions before relying on it as the sole live-update mechanism; **the polling fallback should not be treated as optional**." COMPETITION-2's AC #3/#4 echo this: a failed subscription must fall back to polling "at a reasonable interval," and "backgrounding and foregrounding the app re-establishes the subscription/polling correctly (no permanently-stale state after a backgrounding cycle)."

Two implementation shapes were considered for the fallback trigger:

1. **Error-only fallback**: only start polling when the Supabase SDK explicitly reports a subscription error.
2. **Any-non-established-state fallback**: start polling whenever the channel is not in a confirmed `subscribed` state, regardless of *why* — explicit SDK error, network unavailability, or the app simply being backgrounded (where RN's JS runtime may be suspended and a previously-open socket cannot be trusted to still be live).

Option 1 is the narrower, more common pattern but conflicts with the unit-brief's explicit instruction not to treat the fallback as merely an error handler. A backgrounded app's Realtime channel can go silently stale (no explicit error event fires) before the OS suspends the JS runtime — relying solely on an explicit SDK error would miss this case and leave live data stale with no observable failure to react to.

A related question: on `background → active` (foreground) transitions, should the hook attempt to resume whatever `LiveSubscriptionState` it had before backgrounding, or recompute from scratch? Resuming the prior state risks exactly the "permanently-stale state after a backgrounding cycle" COMPETITION-2's AC explicitly warns against — a channel that silently died while backgrounded would be trusted as still `subscribed` with no mechanism to notice otherwise.

## Decision

1. **`SupabaseAdapter.subscribeToLiveResults(onSignal)`** (design.md §4) wraps a Supabase Realtime Broadcast channel subscription (event name confirmed against the backend contract at Implement time) behind the existing single encapsulation seam (`requirements.md §7.2`) — no caller touches the Supabase SDK directly.
2. **The polling fallback is unconditional or mandatory whenever the channel is not in a confirmed `subscribed` state** — not gated behind an explicit SDK error callback alone. `LiveSubscriptionState`'s four values (model.md §3: `inactive | subscribed | polling-fallback | reconnecting`) have no terminal "permanently failed, stop trying" state; every non-`inactive`, non-`subscribed` state resolves to `polling-fallback` rather than silently doing nothing.
3. **On `background → active` (AppState) transitions, the hook unconditionally re-runs its full decision sequence from `evaluateLiveUpdateRelevance()` (design.md §3.3 step 5)** — it never assumes a pre-backgrounding subscription handle is still valid. This satisfies COMPETITION-2 AC #4 by construction: there is no code path where "resume the old state" is even an option.
4. The polling interval is a **fixed, reasonable constant** (not story-mandated to an exact number; finalized at Implement, e.g. ~30s), applied uniformly — the same interval whether the trigger was an explicit error, a background/foreground cycle, or any other non-`subscribed` condition.

## Consequences

- `use-live-competition-subscription.ts`'s internal state machine has one fewer state than an error-only design would need (no separate "give up" terminal state to design around), simplifying the hook's logic at the cost of slightly more aggressive default-to-polling behavior in ambiguous cases — judged an acceptable tradeoff given the explicit unit-brief instruction that the fallback "should not be treated as optional."
- This is the primary justification for flagging COMPETITION-2 for a deliberate **Layer 2 (device-level)** test pass rather than treating Layer 1 (mocked Supabase client, fake timers) as sufficient — AppState transition behavior and real Realtime-channel suspension-on-background behavior cannot be fully proven by a Jest-mocked Supabase client; this is recorded again at the Test stage, not just here.
- The polling interval value, once chosen at Implement, is a single named constant (not duplicated across call sites) so a later tuning pass (e.g. after Layer 2 verification reveals a better interval) is a one-line change.
- No change to `rspack.config.mjs`/`rspack.config.education-remote.mjs` — this ADR is about runtime behavior, not bundling/federation.
