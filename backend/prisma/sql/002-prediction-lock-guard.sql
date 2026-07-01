-- Ported from betmeet-clone's prisma/migrations/20260611120000_rls_constraints_triggers
-- (the prediction_lock_guard portion only — the single most emphasized DB-level
-- invariant across the domain docs: "cannot be subverted by a buggy or malicious
-- client even before any mobile-side validation exists", migration-analysis.md §5).
--
-- A BEFORE UPDATE trigger fires regardless of which Postgres role performs the
-- UPDATE — including this backend's own privileged Prisma connection. It is a
-- backstop against backend bugs, not just a malicious client: if `predictions.save`
-- has a bug that lets it write to an already-locked row, this trigger still blocks it.
--
-- Run AFTER `npx prisma db push` has created the `predictions` table.
-- IDEMPOTENT: safe to re-run.

CREATE OR REPLACE FUNCTION prediction_lock_guard()
RETURNS trigger AS $$
BEGIN
  IF OLD.locked_at IS NOT NULL AND (
    NEW.home_score <> OLD.home_score OR
    NEW.away_score <> OLD.away_score OR
    NEW.penalty_winner_team_id IS DISTINCT FROM OLD.penalty_winner_team_id
  ) THEN
    RAISE EXCEPTION 'Cannot modify a locked prediction (match_id=%, user_id=%)',
      NEW.match_id, NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prediction_lock_guard ON public.predictions;
CREATE TRIGGER trg_prediction_lock_guard
  BEFORE UPDATE ON public.predictions
  FOR EACH ROW EXECUTE FUNCTION prediction_lock_guard();

-- Score-range backstop (0-20 per side), matches domain-overview.md §5.4.
ALTER TABLE public.predictions DROP CONSTRAINT IF EXISTS predictions_score_range;
ALTER TABLE public.predictions ADD CONSTRAINT predictions_score_range CHECK (
  home_score >= 0 AND home_score <= 20 AND
  away_score >= 0 AND away_score <= 20
);
