# ADR-027: Port the Custom Access Token Hook as SQL, not code

## Status
Accepted (2026-07-01).

## Context
`src/platform/supabase/supabase-adapter.ts:165-167` already reads `email_verified`, `onboarding_completed`, and `account_deleted` as custom JWT claims (`getClaims()`, local/asymmetric verification — no network round-trip). Bolt 1's entire navigation guard (`AuthGatedNavigator`, ADR-001) is built on these claims existing.

In `betmeet-clone`, these claims are injected by a Postgres function (`public.custom_access_token_hook`, see `prisma/migrations/20260617120000_auth_access_token_hook` and `20260619140000_auth_token_hook_account_deleted`) registered as a Supabase Auth Hook. Per ADR-026, mobile now has its **own, separate Supabase project** — that function does not exist there.

## Decision
Port the two migrations as **SQL only** into `backend/prisma/migrations/`, applied to mobile's own Supabase project, with the same field semantics:
- `onboarding_completed` ← `profiles.onboarding_completed` (default `false`)
- `email_verified` ← `auth.users.email_confirmed_at IS NOT NULL`
- `account_deleted` ← `profiles.deleted_at IS NOT NULL`

This is copying a **database feature** (a Postgres function + grants + RLS policy for the `supabase_auth_admin` role), not application code — it doesn't violate `requirements.md §7.3`'s "no code dependency between repos," which governs mobile's TypeScript, not independently-provisioned Postgres infrastructure that both apps happen to need for the same reason (Supabase Auth requires it to expose non-standard claims).

The Auth Hook must still be **enabled manually** in the Supabase Dashboard (Authentication → Hooks → Customize Access Token (JWT) Claims) — this is not expressible in SQL, same caveat `betmeet-clone`'s original migration documents.

## Consequences
- Without this, `getClaims()` on mobile's new project returns none of the three custom claims, and Bolt 1's guard fails toward whatever `evaluateGuard`'s missing-claim branch resolves to (fails open by design, per `proxy.ts`'s equivalent comment in `betmeet-clone` — mobile's adapter mirrors that same fail-open reasoning) — meaning onboarding/email-verification/soft-delete gating silently do nothing until this hook is enabled.
- This must be applied and the Dashboard hook enabled **before** any Layer 2 testing of Bolts 1-3 (auth, onboarding).
