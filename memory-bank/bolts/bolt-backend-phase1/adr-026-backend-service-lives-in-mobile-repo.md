# ADR-026: The backend service lives inside `betmeet-mobile-clone`, not `betmeet-clone`

## Status
Accepted (2026-07-01). Supersedes the hosting ambiguity left open by `requirements.md §7.1` ("Out of this intent's authority: where that API physically lives... Units specify the contract, not the hosting").

## Context
`requirements.md §7.1` decided mobile consumes privileged business logic (nickname assignment, pool rules, prediction validation, scoring, notifications, admin overrides) via an API contract ("Option A"), but explicitly left open whether that API's *hosting* is inside `betmeet-clone` (new Route Handlers) or a separate service. Bolts 1-6 already built the client side of this contract (`BackendApiClient`, `profile-api.ts`, `predictions-api.ts`, `competition-api.ts`) against a stubbed `BACKEND_API_BASE_URL`, and Layer 2 (device/simulator) testing has been blocked ever since — there is no real backend to call.

A full audit of `betmeet-clone` (`/Users/ricardo/Documents/dynamicdevs/betmeet-clone`) confirmed: it is a Next.js 16 + Prisma 7 app already running its own privileged logic (46 Server Action files across auth/profile/pools/predictions/admin/notifications), its own `pg_cron`-triggered sync/scoring/notification-dispatch jobs, and its own Supabase project. Modifying that repo to add mobile-facing Route Handlers was explicitly ruled out by the user: `betmeet-clone` must stay independent, web-only.

## Decision
The backend mobile depends on is built **from scratch inside `betmeet-mobile-clone`**, in a new top-level `backend/` directory — a standalone Node/Express service, not bundled by Re.Pack, not part of the RN app's build. It connects to **the user's own, separate Supabase project** (already the one referenced by `SUPABASE_URL` in this repo's `.env`), not `betmeet-clone`'s.

No code is imported from `betmeet-clone` (`requirements.md §7.3` still holds). Business logic (nickname rules, pool capacity, prediction validation, scoring) is reimplemented from the same rules documented in `domain-overview.md §5`, cross-checked against `betmeet-clone`'s actual behavior where ambiguous (same reconciliation pattern as Bolt 3's ADR-011), never by importing its TypeScript.

## Consequences
- Mobile and web are now on **fully separate databases** — no shared pools/users/rankings between the two clients. This is an explicit, accepted tradeoff (user's choice), not an oversight.
- The `BackendApiClient` seam built in Bolts 1-6 (`POST ${baseUrl}/${capability}`, Bearer JWT) needs **zero changes** on the mobile side — this backend is built to match that existing contract exactly, not the other way around.
- Anything that lives at the Postgres level in `betmeet-clone` (RLS, triggers, the Custom Access Token Hook) must be **independently re-created** on the new Supabase project — see ADR-027.
- Sync/scoring/cron/notification-dispatch, which in `betmeet-clone` run via `pg_cron`+`pg_net` calling Next.js Route Handlers, must be re-hosted for this backend — see ADR-029.
- See ADR-028 for the phased build order (this ADR only decides *where*, not *how much, in what order*).
