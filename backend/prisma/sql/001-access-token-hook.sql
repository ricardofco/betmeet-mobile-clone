-- ADR-027 (memory-bank/bolts/bolt-backend-phase1/) — Custom Access Token Hook,
-- ported as SQL (not code) from betmeet-clone's
-- prisma/migrations/20260617120000_auth_access_token_hook and
-- 20260619140000_auth_token_hook_account_deleted, adapted to this project's own
-- `profiles` table (same column names, independently authored schema).
--
-- Injects three custom JWT claims at token mint (sign-in/refresh), read directly
-- by mobile's src/platform/supabase/supabase-adapter.ts:165-167 via getClaims()
-- (local/asymmetric verification, no round-trip):
--   - onboarding_completed: from profiles.onboarding_completed
--   - email_verified:       from auth.users.email_confirmed_at IS NOT NULL
--   - account_deleted:      from profiles.deleted_at IS NOT NULL
--
-- Run this AFTER `npx prisma db push` has created the `profiles` table (against
-- DIRECT_URL, e.g. via `psql $DIRECT_URL -f prisma/sql/001-access-token-hook.sql`
-- or pasted into the Supabase SQL Editor).
--
-- Then you MUST also enable the hook manually: Supabase Dashboard →
-- Authentication → Hooks → "Customize Access Token (JWT) Claims" → select
-- `public.custom_access_token_hook`. This step is not expressible in SQL.
--
-- IDEMPOTENT: safe to re-run.

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb;
  v_onboarding_completed boolean;
  v_email_verified boolean;
  v_account_deleted boolean;
BEGIN
  SELECT
    COALESCE(p.onboarding_completed, false),
    (u.email_confirmed_at IS NOT NULL),
    (p.deleted_at IS NOT NULL)
  INTO v_onboarding_completed, v_email_verified, v_account_deleted
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.id = (event->>'user_id')::uuid;

  claims := event->'claims';
  claims := jsonb_set(claims, '{onboarding_completed}', to_jsonb(COALESCE(v_onboarding_completed, false)));
  claims := jsonb_set(claims, '{email_verified}', to_jsonb(COALESCE(v_email_verified, false)));
  claims := jsonb_set(claims, '{account_deleted}', to_jsonb(COALESCE(v_account_deleted, false)));

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Only the Auth admin role may run the hook.
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) FROM authenticated, anon, public;

-- The hook reads public.profiles; grant the Auth admin role read access.
GRANT SELECT ON TABLE public.profiles TO supabase_auth_admin;

-- profiles has RLS enabled by default on Supabase-managed Postgres; add the
-- read policy the hook's role needs regardless.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_admin_read_profiles_for_token_hook" ON public.profiles;
CREATE POLICY "auth_admin_read_profiles_for_token_hook"
  ON public.profiles FOR SELECT
  TO supabase_auth_admin
  USING (true);
