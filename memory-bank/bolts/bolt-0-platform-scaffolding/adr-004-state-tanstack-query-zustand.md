# ADR-004 — State management: TanStack Query (server state) + Zustand (client state)

## Context

`requirements.md §8` deferred the state-management library choice to Construction. The unit briefs already describe a clear shape for server-derived state: explicit cache-invalidation triggers (e.g. `unit-07-scoring-rankings`'s RANKINGS-4: membership change, match scored, admin override) and a single seam (`BackendApiClient`) all reads/writes go through. Separately, some state is purely local/client-side (auth session mirror, onboarding wizard step) with no server cache semantics.

## Decision

Two complementary libraries, not one:

- **TanStack Query (React Query)** for all server/backend-derived state — every `BackendApiClient` read/write is wrapped in a `useQuery`/`useMutation` hook; cache keys and invalidation triggers are defined per-unit as each unit's bolt lands (this ADR fixes the library, not the per-feature cache-key scheme).
- **Zustand** for local/global client state that has no server-cache semantics — starting with a small store mirroring the current `AuthSession`/`AuthClaims` (fed by `SupabaseAdapter.onSessionChange`), consumed by the navigation guard (AUTH-7) and any screen needing to know "am I authenticated / onboarded right now."

Both are declared as Module Federation shared singletons (ADR-002).

## Consequences

- Feature bolts must not introduce a competing data-fetching pattern (raw `useEffect` + `fetch`, a second cache library, etc.) for anything that is backend-API-derived — TanStack Query is the one path, enforced by code review per `coding-standards.md`'s skill-precedence rule ("project standards win").
- The Zustand auth-session store and `SupabaseAdapter`'s `onSessionChange` together form the live data path AUTH-7 depends on — getting this wiring right in Bolt 1 is now a fixed expectation set by this ADR, not an open design question at that point.
- Version-skew discipline (ADR-002) applies to both libraries identically.
