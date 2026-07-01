/**
 * Phase 1 supplemental seed (ADR-028) — this Supabase project turned out to
 * already have betmeet-clone's real World Cup 2026 fixture (48 teams, 52
 * matches) loaded (see memory-bank/bolts/bolt-backend-phase1/, "adopted
 * existing schema" decision). That real data has no FINISHED match and no
 * upcoming match with both teams resolved, so it doesn't exercise every
 * Layer 2 path on its own. This script ADDS a handful of matches alongside
 * it — high matchNumbers (9001+, the real data's matchNumber is NULL on every
 * row, so no collision) reusing the *existing* Group A / first knockout phase
 * rather than creating new ones, purely additive, never touches the 52 real
 * rows. Covers: kickoff-lock (imminent), a normal upcoming pick, a finished
 * match with a score (score-breakdown), a knockout entry, and a finished
 * knockout with a penalty shootout (penalty-bonus display).
 *
 * Flag keys are arbitrary strings — src/shared/competition/flags/flag-catalog.ts
 * falls back to a gray placeholder tint for any unrecognized key (real artwork
 * not vendored yet, see activeContext.md's Bolt 5 Known Issue).
 */
import { prisma } from '../db';

async function main() {
  const competition = await prisma.competition.findUniqueOrThrow({ where: { slug: 'world-cup-2026' } });

  const groupPhase = await prisma.competitionPhase.findFirstOrThrow({
    where: { competitionId: competition.id, type: 'GROUP' },
    orderBy: { displayOrder: 'asc' },
  });
  const knockoutPhase = await prisma.competitionPhase.findFirstOrThrow({
    where: { competitionId: competition.id, type: 'KNOCKOUT' },
    orderBy: { displayOrder: 'asc' },
  });

  const teamSeeds = [
    { fifaCode: 'MEX', name: 'Mexico', flagKey: 'mex' },
    { fifaCode: 'USA', name: 'United States', flagKey: 'usa' },
    { fifaCode: 'CAN', name: 'Canada', flagKey: 'can' },
    { fifaCode: 'ARG', name: 'Argentina', flagKey: 'arg' },
    { fifaCode: 'BRA', name: 'Brazil', flagKey: 'bra' },
    { fifaCode: 'FRA', name: 'France', flagKey: 'fra' },
  ];
  const teams: Record<string, { id: string }> = {};
  for (const t of teamSeeds) {
    teams[t.fifaCode] = await prisma.team.upsert({
      where: { fifaCode: t.fifaCode },
      create: { ...t, flag_path: `/flags/${t.flagKey}.svg`, updated_at: new Date() },
      update: { name: t.name, flagKey: t.flagKey },
    });
  }

  const now = Date.now();
  const matchSeeds = [
    {
      // Kickoff-lock test path: locks in ~3 minutes.
      matchNumber: 9001,
      phaseId: groupPhase.id,
      kickoffAt: new Date(now + 3 * 60 * 1000),
      status: 'SCHEDULED' as const,
      homeTeamId: teams.MEX.id,
      awayTeamId: teams.USA.id,
    },
    {
      // Further out — normal prediction-entry path.
      matchNumber: 9002,
      phaseId: groupPhase.id,
      kickoffAt: new Date(now + 3 * 24 * 60 * 60 * 1000),
      status: 'SCHEDULED' as const,
      homeTeamId: teams.CAN.id,
      awayTeamId: teams.ARG.id,
    },
    {
      // Finished, non-exact score — score-breakdown display test path.
      matchNumber: 9003,
      phaseId: groupPhase.id,
      kickoffAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
      status: 'FINISHED' as const,
      homeTeamId: teams.BRA.id,
      awayTeamId: teams.FRA.id,
      homeScore: 2,
      awayScore: 1,
    },
    {
      // Knockout, still scheduled — penalty-winner selector entry test path.
      matchNumber: 9004,
      phaseId: knockoutPhase.id,
      kickoffAt: new Date(now + 5 * 24 * 60 * 60 * 1000),
      status: 'SCHEDULED' as const,
      homeTeamId: teams.MEX.id,
      awayTeamId: teams.BRA.id,
    },
    {
      // Knockout, finished with a penalty shootout — score-breakdown penalty-bonus test path.
      matchNumber: 9005,
      phaseId: knockoutPhase.id,
      kickoffAt: new Date(now - 1 * 24 * 60 * 60 * 1000),
      status: 'FINISHED' as const,
      homeTeamId: teams.ARG.id,
      awayTeamId: teams.FRA.id,
      homeScore: 1,
      awayScore: 1,
      homePenaltyScore: 4,
      awayPenaltyScore: 2,
      winnerTeamId: teams.ARG.id,
    },
  ];

  for (const m of matchSeeds) {
    await prisma.match.upsert({
      where: { competitionId_matchNumber: { competitionId: competition.id, matchNumber: m.matchNumber } },
      create: { competitionId: competition.id, ...m },
      update: m,
    });
  }

  console.log(`Seeded competition "${competition.slug}" with ${teamSeeds.length} teams, ${matchSeeds.length} matches.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
