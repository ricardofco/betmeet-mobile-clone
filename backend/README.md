# betmeet-backend (Phase 1)

Standalone Node/Express backend for `BetmeetMobile` — lives inside this repo, independent from `betmeet-clone` (ADR-026, `memory-bank/bolts/bolt-backend-phase1/`). Not bundled by Re.Pack; run it as a separate process alongside the RN app.

Phase 1 scope only (ADR-028): the Access Token Hook, `Profile`/`Competition`/`Team`/`Match`/`Prediction` data, and exactly the capabilities mobile already calls (`auth.resendConfirmation`, `profile.*`, `competition.getFixture`/`getKnockoutPhaseIds`, `predictions.getMyPredictions`/`save`). No football-data.org sync, no admin overrides, no push notifications yet — see the ADRs for the later phases.

## One-time setup

1. **Create your own Supabase project** (separate from `betmeet-clone`'s) if you haven't already — this repo's mobile `.env` already points `SUPABASE_URL`/`SUPABASE_ANON_KEY` at it.
2. `cp .env.example .env` and fill in:
   - `DATABASE_URL`/`DIRECT_URL` — Supabase dashboard → Settings → Database → Connection string (pooled for `DATABASE_URL`, direct for `DIRECT_URL`).
   - `SUPABASE_URL`/`SUPABASE_ANON_KEY` — same values as the mobile app's `.env` (one project, two clients).
   - `SUPABASE_SERVICE_ROLE_KEY` — Settings → API → `service_role` secret. Never expose this to mobile.
3. In the Supabase dashboard, **Storage** → create a bucket named `avatars` (or set `AVATAR_STORAGE_BUCKET` to match an existing one), public read.
4. `npm install`
5. `npx prisma db push` — creates all Phase 1 tables from `prisma/schema.prisma` (no hand-written migration needed for the base schema).
6. Run the two SQL files against your database, **in order** — either `psql "$DIRECT_URL" -f prisma/sql/00X-....sql` or paste each into the Supabase SQL Editor:
   - `prisma/sql/001-access-token-hook.sql` — the ported Custom Access Token Hook (ADR-027). **Required** for mobile's Bolt 1 navigation guard to work at all against this project.
   - `prisma/sql/002-prediction-lock-guard.sql` — the kickoff-lock DB trigger + score-range CHECK, ported as a backstop.
7. **Enable the Auth Hook manually** (not expressible in SQL): Supabase Dashboard → Authentication → Hooks → "Customize Access Token (JWT) Claims" → select `public.custom_access_token_hook`.
8. `npm run seed:competition` — seeds a small World Cup 2026 dataset (6 teams, 5 matches covering: an imminent kickoff for lock testing, a normal upcoming match, a finished match with a score, an upcoming knockout match, and a finished knockout match with a penalty shootout) so there's something real to predict against.

## Running

```
npm run dev
```

Listens on `PORT` (default `4000`). Health check: `GET /health`.

Mobile's `.env` already has `BACKEND_API_BASE_URL=http://localhost:4000` for iOS Simulator. **Android Emulator** can't reach the host's `localhost` — use `http://10.0.2.2:4000` instead. A **physical device** needs a tunnel (ngrok, Cloudflare Tunnel) or the same LAN IP; see the mobile repo's `activeContext.md` for the full scenario table.

After changing mobile's `.env`, `pod install` is required (react-native-config bakes values at native build time) — same known blocker already tracked in `activeContext.md` (Ruby/bundler toolchain).

## What's NOT here yet (see ADR-028 for the phased plan)

- No `pools.*` capabilities — Bolt 7 hasn't started on the mobile side, so nothing calls them yet. The `Pool`/`PoolMembership`/`PoolDirectedInvite` tables exist in the schema already so Bolt 7 doesn't need a migration of its own.
- No admin overrides (Phase 2).
- No football-data.org sync, no official `PredictionScore` computation, no scheduler (Phase 3) — match data is only as fresh as the last manual seed/edit. Mobile's own client-side `computeScore()`/`buildScoreBreakdown()` (Bolt 4/6) works fine against this seeded data since it only needs `Match`'s final score fields.
- No push notification dispatch (Phase 4) — `NotificationPreference` rows are written by `profile.completeOnboarding` but nothing sends anything yet.
- No RLS policies beyond what the two ported SQL files add — this backend's own auth middleware (JWT verification + per-handler ownership checks) is the enforcement layer for Phase 1, since mobile never reads these tables directly (only through this API). Revisit if that assumption changes.
