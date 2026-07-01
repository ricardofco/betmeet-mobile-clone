# ADR-029: Express + in-process scheduler, not Next.js + pg_cron/pg_net

## Status
Accepted (2026-07-01).

## Context
`betmeet-clone` runs sync/scoring/notification-dispatch via Supabase `pg_cron`+`pg_net` (SQL-level cron jobs, reading `app_base_url`/`sync_trigger_secret` from Supabase Vault, POSTing to Next.js Route Handlers). This works well for a serverless (Vercel) Next.js app that can't hold a long-lived process. The user chose a lightweight Node server (Express/Fastify) for the new backend, not Next.js.

## Decision
Use **Express** + TypeScript. When Phase 3 (sync/scoring/cron) is built, use an **in-process scheduler** (`node-cron` or equivalent) inside the same long-running Node process, rather than provisioning `pg_cron`/`pg_net`/Vault on the new Supabase project. A standalone Express process is expected to run persistently (unlike Vercel serverless functions), so an in-process timer is simpler and needs no Postgres-level cron infrastructure or secret-in-Vault indirection.

## Consequences
- The new backend's deployment target must be a persistent process (e.g. a long-running container/VM), not a serverless platform that spins functions down between requests — an in-process `node-cron` job silently stops firing if the process isn't kept alive. This constrains hosting choice for Phase 3 onward; flag it explicitly when Phase 3 starts, don't assume Vercel/serverless.
- No `SYNC_TRIGGER_SECRET`/Vault-secret pattern is needed on mobile's backend — cron jobs call their own in-process handlers directly, no HTTP hop, no header-based guard required for that internal path.
