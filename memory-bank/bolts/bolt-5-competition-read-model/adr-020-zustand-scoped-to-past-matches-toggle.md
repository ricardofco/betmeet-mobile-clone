# ADR-020 — `competition-store.ts` (Zustand) is scoped to only the past-matches toggle

## Context

The project's Zustand usage so far is deliberately narrow and per-concern: `auth-session-store.ts` holds derived auth claims/status (Bolt 1, ADR-002), `locale-store.ts` holds the persisted locale preference (Bolt 3, ADR-013) — each store owns exactly one cross-component-tree-shared concern, never a feature-wide grab-bag. COMPETITION-1's "past matches" toggle (show/hide the `past` half of `FixtureView`) is genuinely UI state that several components within the fixture screen need to read/write (the toggle control itself, and `fixture-list.tsx`'s render branch) — a legitimate Zustand candidate by the existing pattern.

The Design stage also considered putting `LiveSubscriptionState` (`inactive | subscribed | polling-fallback | reconnecting`, model.md §3) into this same store, since it is also "competition feature state." Investigation found:

- `LiveSubscriptionState` has exactly **one** owner and **one** consumer: `use-live-competition-subscription.ts` itself. No other component or hook in this bolt's design reads it directly — the hook's only externally-observable side effect is calling `queryClient.invalidateQueries(FIXTURE_QUERY_KEY)`, which is already visible to every consumer through the normal TanStack Query subscription mechanism.
- Promoting single-owner, single-consumer state to a shared Zustand store would not enable anything the state can't already do as local `useState`/`useRef` inside the hook — it would only add an extra layer of indirection and a store that, unlike `auth-session-store`/`locale-store`, has no second reader.

## Decision

`src/shared/competition/competition-store.ts` holds **only**:

```ts
type CompetitionUiState = {
  showPastMatches: boolean;
  togglePastMatches: () => void;
};
```

`LiveSubscriptionState` is **not** added to this store, nor to any Zustand store. It stays internal to `use-live-competition-subscription.ts`, managed with `useState`/`useRef` local to that hook.

## Consequences

- `competition-store.ts` stays a small, single-purpose store, consistent with `locale-store.ts`'s precedent — easy to reason about, easy to test in isolation (`competition-store.test.ts` only needs to assert the toggle flips and persists across re-renders within a session; no persistence to `AsyncStorage` is needed here, unlike locale, since the past-matches toggle is not a cross-session preference per any story's AC).
- If a future bolt introduces a second consumer that genuinely needs to read `LiveSubscriptionState` from outside `use-live-competition-subscription.ts` (e.g. a debug/diagnostics screen, or a visible "reconnecting..." banner mounted by a sibling component), that is the trigger to revisit this decision and promote the state to a store at that time — a new ADR, not a silent change.
- Keeps the project's existing "one store per genuinely cross-tree-shared concern" discipline intact rather than letting "it's the same feature" become the criterion for what goes in a store.
