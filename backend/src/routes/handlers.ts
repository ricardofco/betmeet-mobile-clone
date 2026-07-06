import { prisma } from '../db';
import { supabaseAdmin } from '../supabase-admin';
import { assignDiscriminator, isValidNicknameBase } from '../services/nickname';
import { buildAvatarUploadPath, dbSourceToKind, isOwnedUploadPath, kindToDbSource } from '../services/avatar';
import {
  isMatchEditable,
  validatePenaltyWinnerRule,
  validateScoreBounds,
} from '../services/prediction-eligibility';
import { generateUniqueInviteToken } from '../services/pool-invite-token';
import { canKick, canLeave, canInvite, isOwner, isValidTransferTarget } from '../services/pool-permissions';
import { resolveInviteTarget } from '../services/directed-invite';
import {
  getOwnedPoolsForDeletion as loadOwnedPoolsForDeletion,
  transferSinglePoolOwnership,
  transferOwnedPoolsForAccountDeletion,
} from '../services/account-deletion';
import { computeScore } from '../services/scoring/compute-score';
import { sweepFinishedUnscoredMatches } from '../services/scoring/score-sweeper';
import { resolvePointsStatus } from '../services/scoring/resolve-points';
import { resolveEffectivePredictions } from '../services/pool-leaderboard-aggregation';
import type { AuthedRequest } from '../middleware/auth';

type Auth = AuthedRequest['auth'];
type Handler = (auth: Auth, body: any) => Promise<unknown>;

const RESEND_COOLDOWN_MS = 60_000;
const NICKNAME_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

function nicknameCooldownState(profile: {
  onboardingCompleted: boolean;
  nicknameChangeCount: number;
  nicknameUpdatedAt: Date | null;
}) {
  return {
    onboardingCompleted: profile.onboardingCompleted,
    // Onboarding's initial assignment counts as change #1 (ADR-011's mapping) —
    // post-onboarding count excludes it.
    postOnboardingChangeCount: Math.max(0, profile.nicknameChangeCount - 1),
    lastChangeAt: profile.nicknameUpdatedAt ? profile.nicknameUpdatedAt.toISOString() : null,
    now: new Date().toISOString(),
  };
}

/** Same rule as mobile's src/domain/profile/nickname-change-eligibility.ts (ADR-011). */
function evaluateNicknameCooldown(input: ReturnType<typeof nicknameCooldownState>):
  | { allowed: true }
  | { allowed: false; cooldownEndsAt: string } {
  if (!input.onboardingCompleted) return { allowed: true };
  if (input.postOnboardingChangeCount === 0) return { allowed: true };
  if (!input.lastChangeAt) return { allowed: true };
  const cooldownEndsMs = Date.parse(input.lastChangeAt) + NICKNAME_COOLDOWN_MS;
  if (Date.parse(input.now) >= cooldownEndsMs) return { allowed: true };
  return { allowed: false, cooldownEndsAt: new Date(cooldownEndsMs).toISOString() };
}

async function getOrCreateProfile(userId: string) {
  const existing = await prisma.profile.findUnique({ where: { id: userId } });
  if (existing) return existing;
  return prisma.profile.create({ data: { id: userId, avatarUrl: '' } });
}

// ---------------------------------------------------------------------------
// auth.*
// ---------------------------------------------------------------------------

const resendConfirmation: Handler = async (_auth, body) => {
  const email = String(body?.email ?? '');
  const throttle = await prisma.emailActionThrottle.findUnique({
    where: { email_action: { email, action: 'resend_confirmation' } },
  });
  if (throttle) {
    const elapsed = Date.now() - throttle.lastSentAt.getTime();
    if (elapsed < RESEND_COOLDOWN_MS) {
      return { throttled: true, remainingSeconds: Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000) };
    }
  }
  await prisma.emailActionThrottle.upsert({
    where: { email_action: { email, action: 'resend_confirmation' } },
    create: { email, action: 'resend_confirmation' },
    update: { lastSentAt: new Date() },
  });
  await supabaseAdmin.auth.resend({ type: 'signup', email });
  return { throttled: false };
};

// ---------------------------------------------------------------------------
// profile.*
// ---------------------------------------------------------------------------

const checkNicknameAvailability: Handler = async (_auth, body) => {
  const base = String(body?.base ?? '');
  if (!isValidNicknameBase(base)) return { available: false };
  const taken = await prisma.profile.count({
    where: { nicknameBase: { equals: base, mode: 'insensitive' } },
  });
  return { available: taken < 9999 };
};

const assignNickname: Handler = async (auth, body) => {
  const base = String(body?.base ?? '');
  if (!isValidNicknameBase(base)) return { ok: false, error: 'taken' as const };
  const result = await assignDiscriminator(base);
  if (!result.ok) return result;
  await prisma.profile.upsert({
    where: { id: auth.userId },
    create: {
      id: auth.userId,
      avatarUrl: '',
      nicknameBase: base,
      nicknameDiscriminator: result.discriminator,
      nicknameChangeCount: 1,
      nicknameUpdatedAt: new Date(),
    },
    update: {
      nicknameBase: base,
      nicknameDiscriminator: result.discriminator,
      nicknameChangeCount: 1,
      nicknameUpdatedAt: new Date(),
    },
  });
  return { ok: true, base, discriminator: result.discriminator };
};

const changeNickname: Handler = async (auth, body) => {
  const base = String(body?.base ?? '');
  if (!isValidNicknameBase(base)) return { ok: false, error: 'taken' as const };

  const profile = await getOrCreateProfile(auth.userId);
  const cooldown = evaluateNicknameCooldown(nicknameCooldownState(profile));
  if (!cooldown.allowed) {
    return { ok: false, error: 'rate_limited' as const, cooldownEndsAt: cooldown.cooldownEndsAt };
  }

  const result = await assignDiscriminator(base);
  if (!result.ok) return result;

  await prisma.profile.update({
    where: { id: auth.userId },
    data: {
      nicknameBase: base,
      nicknameDiscriminator: result.discriminator,
      nicknameChangeCount: { increment: 1 },
      nicknameUpdatedAt: new Date(),
    },
  });
  return { ok: true, base, discriminator: result.discriminator };
};

const getNicknameCooldownState: Handler = async (auth) => {
  const profile = await getOrCreateProfile(auth.userId);
  return nicknameCooldownState(profile);
};

const getDefaultAvatarSet: Handler = async () => {
  const assets = await prisma.avatarAsset.findMany({ orderBy: { displayOrder: 'asc' } });
  return { options: assets.map((a) => ({ id: a.id, url: a.storageUrl })) };
};

const requestAvatarUploadUrl: Handler = async (auth, body) => {
  const mimeType = String(body?.mimeType ?? '');
  const path = buildAvatarUploadPath(auth.userId, mimeType);
  const { data, error } = await supabaseAdmin.storage
    .from(process.env.AVATAR_STORAGE_BUCKET ?? 'avatars')
    .createSignedUploadUrl(path);
  if (error || !data) throw new Error(`createSignedUploadUrl failed: ${error?.message}`);
  return { uploadUrl: data.signedUrl, confirmToken: path };
};

const confirmAvatarUpload: Handler = async (auth, body) => {
  const confirmToken = String(body?.confirmToken ?? '');
  if (!isOwnedUploadPath(auth.userId, confirmToken)) {
    throw new Error('confirmToken does not belong to the authenticated user');
  }
  const { data } = supabaseAdmin.storage
    .from(process.env.AVATAR_STORAGE_BUCKET ?? 'avatars')
    .getPublicUrl(confirmToken);
  await prisma.profile.update({
    where: { id: auth.userId },
    data: { avatarUrl: data.publicUrl, avatarSource: 'CUSTOM_UPLOAD' },
  });
  return { avatarUrl: data.publicUrl };
};

const setAvatarSource: Handler = async (auth, body) => {
  const source = body?.source as 'google' | 'default';
  if (source === 'default') {
    const optionId = String(body?.optionId ?? '');
    const asset = await prisma.avatarAsset.findUnique({ where: { id: optionId } });
    if (!asset) throw new Error(`Unknown default avatar option: ${optionId}`);
    await prisma.profile.update({
      where: { id: auth.userId },
      data: { avatarUrl: asset.storageUrl, avatarSource: kindToDbSource('default') },
    });
    return { avatarUrl: asset.storageUrl, source: 'default' };
  }

  // 'google' — read the OAuth identity's photo from the Supabase auth user.
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(auth.userId);
  if (error || !data?.user) throw new Error(`getUserById failed: ${error?.message}`);
  const photoUrl =
    (data.user.user_metadata?.avatar_url as string | undefined) ??
    (data.user.user_metadata?.picture as string | undefined) ??
    '';
  await prisma.profile.update({
    where: { id: auth.userId },
    data: { avatarUrl: photoUrl, avatarSource: kindToDbSource('google') },
  });
  return { avatarUrl: photoUrl, source: 'google' };
};

const setLocale: Handler = async (auth, body) => {
  const locale = String(body?.locale ?? 'es') as 'es' | 'en';
  await prisma.profile.upsert({
    where: { id: auth.userId },
    create: { id: auth.userId, avatarUrl: '', locale },
    update: { locale },
  });
  return { locale };
};

const completeOnboarding: Handler = async (auth, body) => {
  const notificationsOptIn = Boolean(body?.notificationsOptIn);
  await prisma.profile.update({
    where: { id: auth.userId },
    data: { onboardingCompleted: true },
  });
  await prisma.notificationPreference.upsert({
    where: { userId: auth.userId },
    create: {
      userId: auth.userId,
      matchStarted: notificationsOptIn,
      matchFinished: notificationsOptIn,
      poolInvite: notificationsOptIn,
      globalRankImproved: notificationsOptIn,
      goalScored: notificationsOptIn,
    },
    update: {},
  });
  return { ok: true };
};

const getProfile: Handler = async (auth) => {
  const profile = await getOrCreateProfile(auth.userId);
  return {
    nickname: profile.nicknameBase ? `${profile.nicknameBase}#${profile.nicknameDiscriminator}` : null,
    avatar: { source: dbSourceToKind(profile.avatarSource), url: profile.avatarUrl },
    locale: profile.locale,
    cooldown: nicknameCooldownState(profile),
  };
};

// ---------------------------------------------------------------------------
// competition.* (read-only)
// ---------------------------------------------------------------------------

function teamSlot(team: { id: string; fifaCode: string; name: string; flagKey: string } | null, placeholder: string | null) {
  if (team) return { id: team.id, fifaCode: team.fifaCode, name: team.name, flagKey: team.flagKey };
  if (placeholder) return { kind: 'placeholder' as const, label: placeholder };
  return null;
}

const getFixture: Handler = async () => {
  const matches = await prisma.match.findMany({
    include: { homeTeam: true, awayTeam: true },
    orderBy: { kickoffAt: 'asc' },
  });
  return matches.map((m) => ({
    id: m.id,
    phaseId: m.phaseId,
    kickoffAt: m.kickoffAt ? m.kickoffAt.toISOString() : null,
    status: m.status,
    homeTeam: teamSlot(m.homeTeam, m.homePlaceholder),
    awayTeam: teamSlot(m.awayTeam, m.awayPlaceholder),
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    homePenaltyScore: m.homePenaltyScore,
    awayPenaltyScore: m.awayPenaltyScore,
  }));
};

const getKnockoutPhaseIds: Handler = async () => {
  const phases = await prisma.competitionPhase.findMany({
    where: { type: 'KNOCKOUT' },
    select: { id: true },
  });
  return phases.map((p) => p.id);
};

// ---------------------------------------------------------------------------
// predictions.*
// ---------------------------------------------------------------------------

function derivePenaltyWinnerLabel(
  penaltyWinnerTeamId: string | null,
  homeTeamId: string | null,
  awayTeamId: string | null,
): 'home' | 'away' | null {
  if (!penaltyWinnerTeamId) return null;
  if (penaltyWinnerTeamId === homeTeamId) return 'home';
  if (penaltyWinnerTeamId === awayTeamId) return 'away';
  return null;
}

/**
 * Bolt 10 (design.md §4.2 elaboration, ADR-050): runs the same lazy sweep
 * the `rankings.*` reads use, before resolving each prediction's
 * `pointsStatus` — so a prediction's status is accurate the first time a
 * user opens Predictions after a match finishes, not only after they've
 * separately visited a ranking screen. Same sweep function, one more
 * caller; no new trigger mechanism.
 */
const getMyPredictions: Handler = async (auth) => {
  await sweepFinishedUnscoredMatches();

  const predictions = await prisma.prediction.findMany({
    where: { userId: auth.userId },
    include: { match: true, prediction_scores: { select: { id: true } } },
  });
  return predictions.map((p) => ({
    id: p.id,
    matchId: p.matchId,
    poolId: p.poolId,
    homeScore: p.homeScore,
    awayScore: p.awayScore,
    penaltyWinner: derivePenaltyWinnerLabel(p.penaltyWinnerTeamId, p.match.homeTeamId, p.match.awayTeamId),
    // Bolt 10 (design.md §8) — additive field, backend-authoritative, answers
    // "has this been durably scored yet" (distinct from Bolt 6's client-side
    // `canShowScoreBreakdown`, which still governs the breakdown panel).
    pointsStatus: resolvePointsStatus({
      hasPrediction: true,
      hasScore: p.prediction_scores !== null,
      matchStatus: p.match.status,
    }),
  }));
};

type PredictionWriteData = { homeScore: number; awayScore: number; penaltyWinnerTeamId: string | null };

/**
 * Bolt 8 (PREDICTIONS-3, design.md §3.1/ADR-039) — one-scope upsert, used
 * both for the regular single-row save and, twice, inside the dual-save
 * transaction below. `db` is `prisma` for the regular path or a
 * `Prisma.TransactionClient` for the dual-save path — both share the same
 * query-builder shape. Preserves Bolt 6's existing behavior exactly: a
 * previously-locked row is rejected (`LOCKED`), never silently unlocked.
 */
async function upsertPredictionForScope(
  db: typeof prisma,
  userId: string,
  matchId: string,
  poolId: string | null,
  data: PredictionWriteData,
): Promise<{ ok: true; prediction: Awaited<ReturnType<typeof prisma.prediction.create>> } | { ok: false; error: 'LOCKED' }> {
  const existing = await db.prediction.findFirst({ where: { userId, matchId, poolId } });
  if (existing?.lockedAt) {
    return { ok: false, error: 'LOCKED' };
  }
  const saved = existing
    ? await db.prediction.update({ where: { id: existing.id }, data })
    : await db.prediction.create({ data: { userId, matchId, poolId, ...data } });
  return { ok: true, prediction: saved };
}

const save: Handler = async (auth, body) => {
  const matchId = String(body?.matchId ?? '');
  const poolId: string | null = body?.poolId ?? null;
  const homeScore = Number(body?.homeScore);
  const awayScore = Number(body?.awayScore);
  const penaltyWinner = (body?.penaltyWinner ?? null) as 'home' | 'away' | null;
  const alsoSaveAsGlobal = body?.alsoSaveAsGlobal === true;

  if (!validateScoreBounds(homeScore, awayScore)) {
    return { ok: false, error: 'VALIDATION_FAILED' as const };
  }

  // Bolt 8 (design.md §3.1): a pool-scoped save requires real membership in
  // that pool — never trusted to whatever pool-picker list the client showed.
  if (poolId) {
    const membership = await prisma.poolMembership.findUnique({
      where: { poolId_userId: { poolId, userId: auth.userId } },
    });
    if (!membership) return { ok: false, error: 'NOT_MEMBER' as const };
  }

  const match = await prisma.match.findUnique({ where: { id: matchId }, include: { phase: true } });
  if (!match) return { ok: false, error: 'VALIDATION_FAILED' as const };

  const isKnockout = match.phase.type === 'KNOCKOUT';
  if (!validatePenaltyWinnerRule(isKnockout, homeScore, awayScore, penaltyWinner)) {
    return { ok: false, error: 'VALIDATION_FAILED' as const };
  }
  if (penaltyWinner && !match.homeTeamId && !match.awayTeamId) {
    return { ok: false, error: 'VALIDATION_FAILED' as const };
  }

  if (!isMatchEditable(match, new Date())) {
    return { ok: false, error: 'LOCKED' as const };
  }

  const penaltyWinnerTeamId =
    penaltyWinner === 'home' ? match.homeTeamId : penaltyWinner === 'away' ? match.awayTeamId : null;
  const data: PredictionWriteData = { homeScore, awayScore, penaltyWinnerTeamId };

  if (alsoSaveAsGlobal && poolId) {
    // Dual-save (PREDICTIONS-3, ADR-039): the global row and the pool
    // override row are written together, all-or-nothing. If either scope's
    // existing row is locked, the whole transaction is rolled back — no
    // partial write, matching betmeet-clone's real comment on this exact
    // flow: "todo o nada."
    try {
      const overrideSaved = await prisma.$transaction(async tx => {
        const globalResult = await upsertPredictionForScope(tx as typeof prisma, auth.userId, matchId, null, data);
        if (!globalResult.ok) throw new Error('LOCKED');
        const overrideResult = await upsertPredictionForScope(tx as typeof prisma, auth.userId, matchId, poolId, data);
        if (!overrideResult.ok) throw new Error('LOCKED');
        return overrideResult.prediction;
      });
      return {
        ok: true,
        prediction: {
          id: overrideSaved.id,
          matchId: overrideSaved.matchId,
          poolId: overrideSaved.poolId,
          homeScore: overrideSaved.homeScore,
          awayScore: overrideSaved.awayScore,
          penaltyWinner,
        },
      };
    } catch (err) {
      if (err instanceof Error && err.message === 'LOCKED') {
        return { ok: false, error: 'LOCKED' as const };
      }
      throw err;
    }
  }

  const result = await upsertPredictionForScope(prisma, auth.userId, matchId, poolId, data);
  if (!result.ok) return { ok: false, error: result.error };

  return {
    ok: true,
    prediction: {
      id: result.prediction.id,
      matchId: result.prediction.matchId,
      poolId: result.prediction.poolId,
      homeScore: result.prediction.homeScore,
      awayScore: result.prediction.awayScore,
      penaltyWinner,
    },
  };
};

/** PREDICTIONS-4 (design.md §3.1) — idempotent: `deleteMany`, not `delete`,
 * so a repeat/racing reset is a no-op success, not a NOT_FOUND error. No
 * kickoff-lock check (model.md §7 — resetting doesn't touch scores). */
const resetOverride: Handler = async (auth, body) => {
  const matchId = String(body?.matchId ?? '');
  const poolId = String(body?.poolId ?? '');

  const membership = await prisma.poolMembership.findUnique({
    where: { poolId_userId: { poolId, userId: auth.userId } },
  });
  if (!membership) return { ok: false, error: 'NOT_MEMBER' as const };

  await prisma.prediction.deleteMany({ where: { userId: auth.userId, matchId, poolId } });
  return { ok: true };
};

// ---------------------------------------------------------------------------
// pools.* (design.md §2, ADR-030/ADR-032/ADR-033/ADR-035)
//
// Business-rule failures are returned as normal 200 JSON with an
// {ok:false,...} shape (same style as predictions.save's LOCKED/
// VALIDATION_FAILED) — truly exceptional cases (bad auth, unexpected DB
// errors) throw and let the router's generic catch produce a 500, same as
// every other handler in this file.
//
// @invariant None of the membership-mutating handlers below (joinByToken,
// joinPublic, leave, kickMember, delete) read Match/Competition/
// CompetitionPhase state. This is deliberate — ADR-033 — do not add a
// "tournament freeze" gate here.
// ---------------------------------------------------------------------------

function poolToDto(pool: {
  id: string;
  name: string;
  type: 'PUBLIC' | 'PRIVATE';
  capacity: number;
  inviteToken: string;
  ownerId: string;
  membersCanInvite: boolean;
  createdAt: Date;
  _count?: { memberships: number };
}, options: { includeInviteToken: boolean; memberCount?: number }) {
  return {
    id: pool.id,
    name: pool.name,
    type: pool.type,
    capacity: pool.capacity,
    memberCount: options.memberCount ?? pool._count?.memberships ?? 0,
    inviteToken: options.includeInviteToken ? pool.inviteToken : null,
    ownerId: pool.ownerId,
    membersCanInvite: pool.membersCanInvite,
    createdAt: pool.createdAt.toISOString(),
  };
}

const createPool: Handler = async (auth, body) => {
  const name = String(body?.name ?? '').trim();
  const type = body?.type as 'PUBLIC' | 'PRIVATE';
  const capacity = Number(body?.capacity);
  const membersCanInvite = body?.membersCanInvite === undefined ? true : Boolean(body.membersCanInvite);

  if (name.length < 3 || name.length > 60) return { ok: false, error: 'VALIDATION_FAILED' as const };
  if (type !== 'PUBLIC' && type !== 'PRIVATE') return { ok: false, error: 'VALIDATION_FAILED' as const };
  if (!Number.isInteger(capacity) || capacity < 2 || capacity > 100) {
    return { ok: false, error: 'VALIDATION_FAILED' as const };
  }

  if (type === 'PUBLIC') {
    const clash = await prisma.pool.findFirst({ where: { type: 'PUBLIC', name } });
    if (clash) return { ok: false, error: 'NAME_TAKEN' as const };
  }

  const inviteToken = await generateUniqueInviteToken(async token => {
    const existing = await prisma.pool.findUnique({ where: { inviteToken: token } });
    return existing !== null;
  });

  try {
    const pool = await prisma.$transaction(async tx => {
      const created = await tx.pool.create({
        data: { name, type, capacity, inviteToken, ownerId: auth.userId, membersCanInvite },
      });
      await tx.poolMembership.create({ data: { poolId: created.id, userId: auth.userId } });
      return created;
    });
    return { ok: true, pool: poolToDto(pool, { includeInviteToken: true, memberCount: 1 }) };
  } catch {
    return { ok: false, error: 'NAME_TAKEN' as const };
  }
};

const renamePool: Handler = async (auth, body) => {
  const poolId = String(body?.poolId ?? '');
  const name = String(body?.name ?? '').trim();
  if (name.length < 3 || name.length > 60) return { ok: false, error: 'VALIDATION_FAILED' as const };

  const pool = await prisma.pool.findUnique({ where: { id: poolId } });
  if (!pool) return { ok: false, error: 'NOT_FOUND' as const };
  if (!isOwner(pool, auth.userId)) return { ok: false, error: 'NOT_OWNER' as const };

  if (pool.type === 'PUBLIC') {
    const clash = await prisma.pool.findFirst({ where: { type: 'PUBLIC', name, id: { not: pool.id } } });
    if (clash) return { ok: false, error: 'NAME_TAKEN' as const };
  }

  try {
    await prisma.pool.update({ where: { id: pool.id }, data: { name } });
  } catch {
    return { ok: false, error: 'NAME_TAKEN' as const };
  }
  return { ok: true, name };
};

const deletePool: Handler = async (auth, body) => {
  const poolId = String(body?.poolId ?? '');
  const pool = await prisma.pool.findUnique({ where: { id: poolId } });
  if (!pool) return { ok: false, error: 'NOT_FOUND' as const };
  if (!isOwner(pool, auth.userId)) return { ok: false, error: 'NOT_OWNER' as const };

  await prisma.pool.delete({ where: { id: poolId } });
  return { ok: true };
};

const updatePoolVisibility: Handler = async (auth, body) => {
  const poolId = String(body?.poolId ?? '');
  const type = body?.type as 'PUBLIC' | 'PRIVATE';
  if (type !== 'PUBLIC' && type !== 'PRIVATE') return { ok: false, error: 'VALIDATION_FAILED' as const };

  const pool = await prisma.pool.findUnique({ where: { id: poolId } });
  if (!pool) return { ok: false, error: 'NOT_FOUND' as const };
  if (!isOwner(pool, auth.userId)) return { ok: false, error: 'NOT_OWNER' as const };

  // Idempotent — BR-65.4 (model.md §7).
  if (pool.type === type) return { ok: true, type: pool.type };

  if (type === 'PUBLIC') {
    const clash = await prisma.pool.findFirst({ where: { type: 'PUBLIC', name: pool.name, id: { not: pool.id } } });
    if (clash) return { ok: false, error: 'NAME_TAKEN' as const };
  }

  try {
    await prisma.pool.update({ where: { id: pool.id }, data: { type } });
  } catch {
    return { ok: false, error: 'NAME_TAKEN' as const };
  }
  return { ok: true, type };
};

const updatePoolMembersCanInvite: Handler = async (auth, body) => {
  const poolId = String(body?.poolId ?? '');
  const membersCanInvite = Boolean(body?.membersCanInvite);

  const pool = await prisma.pool.findUnique({ where: { id: poolId } });
  if (!pool) return { ok: false, error: 'NOT_FOUND' as const };
  if (!isOwner(pool, auth.userId)) return { ok: false, error: 'NOT_OWNER' as const };
  if (pool.type !== 'PRIVATE') return { ok: false, error: 'NOT_APPLICABLE' as const };

  await prisma.pool.update({ where: { id: pool.id }, data: { membersCanInvite } });
  return { ok: true, membersCanInvite };
};

const joinPoolByToken: Handler = async (auth, body) => {
  const token = String(body?.token ?? '').trim().toUpperCase();

  try {
    const result = await prisma.$transaction(async tx => {
      const pool = await tx.pool.findUnique({
        where: { inviteToken: token },
        include: { _count: { select: { memberships: true } } },
      });
      if (!pool) throw new Error('NOT_FOUND');

      const existing = await tx.poolMembership.findUnique({
        where: { poolId_userId: { poolId: pool.id, userId: auth.userId } },
      });
      if (existing) return { poolId: pool.id, alreadyMember: true };

      if (pool._count.memberships >= pool.capacity) throw new Error('FULL');
      await tx.poolMembership.create({ data: { poolId: pool.id, userId: auth.userId } });
      return { poolId: pool.id, alreadyMember: false };
    });
    return { ok: true, ...result };
  } catch (err) {
    const code = err instanceof Error ? err.message : '';
    if (code === 'FULL') return { ok: false, error: 'FULL' as const };
    if (code === 'NOT_FOUND') return { ok: false, error: 'NOT_FOUND' as const };
    throw err;
  }
};

const joinPublicPool: Handler = async (auth, body) => {
  const poolId = String(body?.poolId ?? '');

  try {
    const result = await prisma.$transaction(async tx => {
      const pool = await tx.pool.findUnique({
        where: { id: poolId },
        include: { _count: { select: { memberships: true } } },
      });
      if (!pool) throw new Error('NOT_FOUND');
      if (pool.type !== 'PUBLIC') throw new Error('NOT_PUBLIC');

      const existing = await tx.poolMembership.findUnique({
        where: { poolId_userId: { poolId: pool.id, userId: auth.userId } },
      });
      if (existing) return { poolId: pool.id, alreadyMember: true };

      if (pool._count.memberships >= pool.capacity) throw new Error('FULL');
      await tx.poolMembership.create({ data: { poolId: pool.id, userId: auth.userId } });
      return { poolId: pool.id, alreadyMember: false };
    });
    return { ok: true, ...result };
  } catch (err) {
    const code = err instanceof Error ? err.message : '';
    if (code === 'FULL') return { ok: false, error: 'FULL' as const };
    if (code === 'NOT_FOUND') return { ok: false, error: 'NOT_FOUND' as const };
    if (code === 'NOT_PUBLIC') return { ok: false, error: 'NOT_PUBLIC' as const };
    throw err;
  }
};

const leavePool: Handler = async (auth, body) => {
  const poolId = String(body?.poolId ?? '');
  const pool = await prisma.pool.findUnique({ where: { id: poolId } });
  if (!pool) return { ok: false, error: 'NOT_FOUND' as const };
  if (!canLeave(pool, auth.userId)) return { ok: false, error: 'OWNER_CANNOT_LEAVE' as const };

  const result = await prisma.poolMembership.deleteMany({ where: { poolId, userId: auth.userId } });
  if (result.count === 0) return { ok: false, error: 'NOT_MEMBER' as const };
  return { ok: true };
};

const kickMember: Handler = async (auth, body) => {
  const poolId = String(body?.poolId ?? '');
  const targetUserId = String(body?.targetUserId ?? '');

  const pool = await prisma.pool.findUnique({ where: { id: poolId } });
  if (!pool) return { ok: false, error: 'NOT_FOUND' as const };
  if (!isOwner(pool, auth.userId)) return { ok: false, error: 'NOT_OWNER' as const };
  if (!canKick(pool, auth.userId, targetUserId)) return { ok: false, error: 'CANNOT_KICK_OWNER' as const };

  await prisma.poolMembership.deleteMany({ where: { poolId, userId: targetUserId } });
  return { ok: true };
};

const setPoolArchived: Handler = async (auth, body) => {
  const poolId = String(body?.poolId ?? '');
  const archived = Boolean(body?.archived);

  const result = await prisma.poolMembership.updateMany({
    where: { poolId, userId: auth.userId },
    data: { archivedAt: archived ? new Date() : null },
  });
  if (result.count === 0) return { ok: false, error: 'NOT_MEMBER' as const };
  return { ok: true, archived };
};

const getMyPools: Handler = async auth => {
  const memberships = await prisma.poolMembership.findMany({
    where: { userId: auth.userId },
    include: { pool: { include: { _count: { select: { memberships: true } } } } },
    orderBy: { joinedAt: 'desc' },
  });
  return memberships.map(m => ({
    ...poolToDto(m.pool, { includeInviteToken: true, memberCount: m.pool._count.memberships }),
    viewerMembership: {
      poolId: m.poolId,
      userId: m.userId,
      joinedAt: m.joinedAt.toISOString(),
      archivedAt: m.archivedAt ? m.archivedAt.toISOString() : null,
    },
  }));
};

const listPublicPools: Handler = async () => {
  const pools = await prisma.pool.findMany({
    where: { type: 'PUBLIC' },
    include: { _count: { select: { memberships: true } } },
    orderBy: { createdAt: 'desc' },
  });
  // Discovery-directory rows never expose inviteToken (design.md §2 —
  // non-members have no legitimate use for it, mirrors betmeet-clone's
  // real listPublicPools query).
  return pools.map(p => poolToDto(p, { includeInviteToken: false, memberCount: p._count.memberships }));
};

const getPoolDetail: Handler = async (auth, body) => {
  const poolId = String(body?.poolId ?? '');
  const pool = await prisma.pool.findUnique({
    where: { id: poolId },
    include: {
      _count: { select: { memberships: true } },
      memberships: { include: { user: true }, orderBy: { joinedAt: 'asc' } },
    },
  });
  if (!pool) return { ok: false, error: 'NOT_FOUND' as const };

  const viewerRow = pool.memberships.find(m => m.userId === auth.userId) ?? null;
  const isMember = viewerRow !== null;

  return {
    ok: true,
    pool: poolToDto(pool, { includeInviteToken: isMember, memberCount: pool._count.memberships }),
    members: pool.memberships.map(m => ({
      userId: m.userId,
      nickname: m.user.nicknameBase ? `${m.user.nicknameBase}#${m.user.nicknameDiscriminator}` : null,
      isOwner: m.userId === pool.ownerId,
      joinedAt: m.joinedAt.toISOString(),
    })),
    viewerMembership: viewerRow
      ? {
          poolId: viewerRow.poolId,
          userId: viewerRow.userId,
          joinedAt: viewerRow.joinedAt.toISOString(),
          archivedAt: viewerRow.archivedAt ? viewerRow.archivedAt.toISOString() : null,
        }
      : null,
  };
};

// ---------------------------------------------------------------------------
// pools.* — Bolt 8 additions (POOLS-3/POOLS-7, design.md §3)
// ---------------------------------------------------------------------------

/** POOLS-3 — directed invites. Reuses createPool's/getPoolDetail's `NOT_FOUND`
 * convention; permission and self-invite are checked server-side regardless
 * of what the client's `canInvite` mirror decided to render. */
const createDirectedInvite: Handler = async (auth, body) => {
  const poolId = String(body?.poolId ?? '');
  const target = String(body?.target ?? '').trim();
  if (target.length < 3 || target.length > 120) {
    return { ok: false, error: 'VALIDATION_FAILED' as const };
  }

  const pool = await prisma.pool.findUnique({ where: { id: poolId } });
  if (!pool) return { ok: false, error: 'NOT_FOUND' as const };

  const membership = await prisma.poolMembership.findUnique({
    where: { poolId_userId: { poolId, userId: auth.userId } },
  });
  if (!membership) return { ok: false, error: 'NOT_MEMBER' as const };

  if (!canInvite(pool, auth.userId)) {
    return { ok: false, error: 'PERMISSION_DENIED' as const };
  }

  const resolved = await resolveInviteTarget(target);
  if (!resolved.invitedUserId && !resolved.invitedEmailHash) {
    return { ok: false, error: 'UNRESOLVABLE' as const };
  }
  if (resolved.invitedUserId === auth.userId) {
    return { ok: false, error: 'SELF_INVITE' as const };
  }

  if (resolved.invitedUserId) {
    // Idempotent re-invite (model.md §2): upsert back to PENDING rather
    // than erroring or duplicating.
    await prisma.poolDirectedInvite.upsert({
      where: { poolId_invitedUserId: { poolId, invitedUserId: resolved.invitedUserId } },
      update: { status: 'PENDING', inviteToken: pool.inviteToken },
      create: {
        poolId,
        createdByUserId: auth.userId,
        inviteToken: pool.inviteToken,
        invitedUserId: resolved.invitedUserId,
        invitedEmailHash: null,
      },
    });
  } else {
    await prisma.poolDirectedInvite.create({
      data: {
        poolId,
        createdByUserId: auth.userId,
        inviteToken: pool.inviteToken,
        invitedUserId: null,
        invitedEmailHash: resolved.invitedEmailHash,
      },
    });
  }

  // POOL_INVITE notification queuing intentionally out of scope this bolt
  // (model.md §2/§10) — Bolt 10 owns notification delivery infrastructure,
  // which doesn't exist yet.
  return { ok: true, resolved: resolved.invitedUserId !== null };
};

/** PREDICTIONS-3's pool-override picker (design.md §1.3/§3) — a lean read,
 * intentionally not reusing `getMyPools`'s heavier join. */
const getMyPoolsForPicker: Handler = async auth => {
  const memberships = await prisma.poolMembership.findMany({
    where: { userId: auth.userId },
    include: { pool: { select: { id: true, name: true } } },
    orderBy: { joinedAt: 'desc' },
  });
  return memberships.map(m => ({ id: m.pool.id, name: m.pool.name }));
};

/** POOLS-7 — standalone, voluntary single-pool ownership transfer
 * (design.md §3.1/ADR-040). Shares `transferSinglePoolOwnership`'s
 * reassign-and-drop-membership write shape with `auth.deleteAccount`'s
 * batch transfer step. */
const transferOwnership: Handler = async (auth, body) => {
  const poolId = String(body?.poolId ?? '');
  const newOwnerId = String(body?.newOwnerId ?? '');

  const pool = await prisma.pool.findUnique({ where: { id: poolId } });
  if (!pool) return { ok: false, error: 'NOT_FOUND' as const };
  if (!isOwner(pool, auth.userId)) return { ok: false, error: 'NOT_OWNER' as const };

  const memberIds = (
    await prisma.poolMembership.findMany({ where: { poolId }, select: { userId: true } })
  ).map(m => m.userId);
  if (!isValidTransferTarget(newOwnerId, memberIds, pool.ownerId)) {
    return { ok: false, error: 'INVALID_TARGET' as const };
  }

  await transferSinglePoolOwnership(poolId, auth.userId, newOwnerId);
  return { ok: true };
};

/** AUTH-6's delete-account confirm modal loader (design.md §3.1). */
const getOwnedPoolsForDeletion: Handler = async auth => {
  return loadOwnedPoolsForDeletion(auth.userId);
};

/** POOLS-6 — the member-prediction grid, with anti-bias masking (design.md
 * §3.1/§3.2, ADR-038). This is the ONLY capability that ever reads/returns
 * another member's pool-scoped prediction content — see ADR-038's
 * permanent instruction before changing this handler. */
const getMemberPredictions: Handler = async (auth, body) => {
  const poolId = String(body?.poolId ?? '');

  const pool = await prisma.pool.findUnique({ where: { id: poolId } });
  if (!pool) return { ok: false, error: 'NOT_FOUND' as const };

  const memberIds = (
    await prisma.poolMembership.findMany({ where: { poolId }, select: { userId: true } })
  ).map(m => m.userId);
  if (!memberIds.includes(auth.userId)) {
    return { ok: false, error: 'NOT_MEMBER' as const };
  }

  const [allMatches, rows] = await Promise.all([
    prisma.match.findMany({
      include: { homeTeam: true, awayTeam: true },
      orderBy: { kickoffAt: 'asc' },
    }),
    prisma.prediction.findMany({
      where: { userId: { in: memberIds }, OR: [{ poolId }, { poolId: null }] },
      include: {
        match: true,
        prediction_scores: { select: { total_points: true, matched_case: true } },
      },
      orderBy: { match: { kickoffAt: 'asc' } },
    }),
  ]);

  const matches = allMatches.map(m => ({
    matchId: m.id,
    kickoffAt: m.kickoffAt ? m.kickoffAt.toISOString() : null,
    matchStatus: m.status,
    homeTeam: teamSlot(m.homeTeam, m.homePlaceholder),
    awayTeam: teamSlot(m.awayTeam, m.awayPlaceholder),
    homeScore: m.homeScore,
    awayScore: m.awayScore,
  }));

  const globalPairs = new Set<string>();
  for (const row of rows) {
    if (row.poolId === null) globalPairs.add(`${row.userId}::${row.matchId}`);
  }

  // ADR-038: anti-bias masking, computed here, exclusively, as the last
  // step before the response object is built. Another member's prediction
  // for a not-yet-kicked-off match is masked; the viewer's own row never is.
  const now = Date.now();

  const predictions = rows.map(row => {
    const started = row.match.kickoffAt != null && row.match.kickoffAt.getTime() <= now;
    const hidden = row.userId !== auth.userId && !started;

    return {
      matchId: row.matchId,
      userId: row.userId,
      predictedHome: hidden ? null : row.homeScore,
      predictedAway: hidden ? null : row.awayScore,
      totalPoints: hidden ? null : (row.prediction_scores?.total_points ?? null),
      matchedCase: hidden ? null : (row.prediction_scores?.matched_case ?? null),
      isOverride: hidden ? false : row.poolId === poolId,
      hasGlobal: !hidden && row.poolId === poolId && globalPairs.has(`${row.userId}::${row.matchId}`),
      hidden,
    };
  });

  return { ok: true, matches, predictions };
};

// ---------------------------------------------------------------------------
// rankings.* — Bolt 10 addition (RANKINGS-1/2/3, design.md §4, ADR-048/049/050/051)
//
// Both reads below call `sweepFinishedUnscoredMatches()` first (ADR-050 —
// lazy sweep on read, this backend's only score-finalization trigger).
// `RankingRowDTO` carries raw totals only — position/dense-ranking/tie-break
// is computed mobile-side (design.md §4.1, `src/domain/rankings/`).
// ---------------------------------------------------------------------------

function penaltyWinnerFromTeamId(
  penaltyWinnerTeamId: string | null,
  homeTeamId: string | null,
  awayTeamId: string | null,
): 'home' | 'away' | null {
  if (!penaltyWinnerTeamId) return null;
  if (penaltyWinnerTeamId === homeTeamId) return 'home';
  if (penaltyWinnerTeamId === awayTeamId) return 'away';
  return null;
}

function nicknameOf(
  profile: { nicknameBase: string | null; nicknameDiscriminator: string | null } | null | undefined,
): string | null {
  if (!profile?.nicknameBase) return null;
  return `${profile.nicknameBase}#${profile.nicknameDiscriminator}`;
}

/**
 * `rankings.getGlobalRanking` — global scope (model.md §2/§4). Confirmed
 * total is `SUM(PredictionScore.totalPoints)` over each user's GLOBAL
 * (`poolId: null`) predictions only; pool-scoped overrides never contribute,
 * even during live projection (model.md §2/§4 point 3). Only verified,
 * non-deleted users with >=1 scored prediction appear in the confirmed
 * pass — a user with zero scored predictions is simply absent, UNLESS a
 * currently-LIVE global prediction of theirs synthesizes them into the
 * projected pass (model.md §4 point 6, `hasConfirmedEntry: false`).
 */
const getGlobalRanking: Handler = async auth => {
  await sweepFinishedUnscoredMatches();

  const confirmedGroups = await prisma.prediction_scores.groupBy({
    by: ['user_id'],
    where: {
      predictions: { poolId: null },
      profiles: { verificationStatus: { not: 'UNVERIFIED' }, deletedAt: null },
    },
    _sum: { total_points: true },
  });

  const confirmedTotals = new Map<string, number>();
  for (const group of confirmedGroups) {
    confirmedTotals.set(group.user_id, group._sum.total_points ?? 0);
  }

  const liveMatches = await prisma.match.findMany({
    where: { status: 'LIVE' },
    include: { phase: true },
  });
  const isLive = liveMatches.length > 0;

  const allUserIds = new Set(confirmedTotals.keys());
  const projectedTotals = new Map<string, number>();

  if (isLive) {
    const livePredictions = await prisma.prediction.findMany({
      where: {
        poolId: null, // global scope: pool overrides never contribute (model.md §4 point 3)
        matchId: { in: liveMatches.map(m => m.id) },
        user: { verificationStatus: { not: 'UNVERIFIED' }, deletedAt: null },
      },
      select: { userId: true, matchId: true, homeScore: true, awayScore: true, penaltyWinnerTeamId: true },
    });

    const predictionsByMatch = new Map<string, typeof livePredictions>();
    for (const prediction of livePredictions) {
      const bucket = predictionsByMatch.get(prediction.matchId) ?? [];
      bucket.push(prediction);
      predictionsByMatch.set(prediction.matchId, bucket);
    }

    const livePointsByUser = new Map<string, number>();
    for (const match of liveMatches) {
      if (match.homeScore === null || match.awayScore === null) continue;
      const predictions = predictionsByMatch.get(match.id) ?? [];
      for (const prediction of predictions) {
        // model.md §4 point 5 (the headline rule): `actualPenaltyWinner` is
        // unconditionally `null` while LIVE — no shootout data exists yet.
        const breakdown = computeScore({
          predictedHome: prediction.homeScore,
          predictedAway: prediction.awayScore,
          actualHome: match.homeScore,
          actualAway: match.awayScore,
          isKnockout: match.phase.type === 'KNOCKOUT',
          predictedPenaltyWinner: penaltyWinnerFromTeamId(
            prediction.penaltyWinnerTeamId,
            match.homeTeamId,
            match.awayTeamId,
          ),
          actualPenaltyWinner: null,
        });
        livePointsByUser.set(
          prediction.userId,
          (livePointsByUser.get(prediction.userId) ?? 0) + breakdown.totalPoints,
        );
      }
    }

    for (const userId of livePointsByUser.keys()) allUserIds.add(userId);
    for (const userId of allUserIds) {
      const confirmed = confirmedTotals.get(userId) ?? 0;
      const live = livePointsByUser.get(userId) ?? 0;
      projectedTotals.set(userId, confirmed + live);
    }
  }

  const profiles = await prisma.profile.findMany({
    where: { id: { in: [...allUserIds] } },
    select: { id: true, nicknameBase: true, nicknameDiscriminator: true, avatarUrl: true },
  });
  const profileById = new Map(profiles.map(p => [p.id, p]));

  const rows = [...allUserIds].map(userId => {
    const profile = profileById.get(userId);
    return {
      userId,
      nickname: nicknameOf(profile),
      avatarUrl: profile?.avatarUrl ?? null,
      isViewer: userId === auth.userId,
      confirmedTotal: confirmedTotals.get(userId) ?? 0,
      projectedTotal: isLive ? (projectedTotals.get(userId) ?? confirmedTotals.get(userId) ?? 0) : null,
      hasConfirmedEntry: confirmedTotals.has(userId),
    };
  });

  return { ok: true, isLive, rows };
};

/**
 * `rankings.getPoolLeaderboard` — pool scope (model.md §3/§4). Every current
 * member appears, even at 0 points (`hasConfirmedEntry: true` always). Each
 * (member, match) pair's points come from exactly one effective prediction
 * (`resolveEffectivePredictions`, design.md §3: pool-scoped override if one
 * exists, else the member's global prediction, never both), excluding any
 * match whose `kickoffAt` precedes the member's `joinedAt` (model.md §3's
 * join-date scoping — applies identically to the live-projection pass,
 * model.md §4 point 4).
 */
const getPoolLeaderboard: Handler = async (auth, body) => {
  const poolId = String(body?.poolId ?? '');

  const pool = await prisma.pool.findUnique({ where: { id: poolId } });
  if (!pool) return { ok: false, error: 'NOT_FOUND' as const };

  const memberships = await prisma.poolMembership.findMany({
    where: { poolId },
    include: { user: { select: { id: true, nicknameBase: true, nicknameDiscriminator: true, avatarUrl: true } } },
  });
  const isMember = memberships.some(m => m.userId === auth.userId);
  if (!isMember) return { ok: false, error: 'NOT_MEMBER' as const };

  await sweepFinishedUnscoredMatches();

  const memberIds = memberships.map(m => m.userId);
  const memberJoinedAt = new Map(memberships.map(m => [m.userId, m.joinedAt]));

  // Every prediction (global or this pool's override) any member has ever
  // made — the raw material `resolveEffectivePredictions` collapses into
  // exactly one row per (member, match).
  const allPredictions = await prisma.prediction.findMany({
    where: {
      userId: { in: memberIds },
      OR: [{ poolId }, { poolId: null }],
    },
    include: {
      match: {
        select: { id: true, kickoffAt: true, status: true, homeTeamId: true, awayTeamId: true },
      },
      prediction_scores: { select: { total_points: true } },
    },
  });

  const effective = resolveEffectivePredictions(
    allPredictions.map(p => ({
      id: p.id,
      userId: p.userId,
      matchId: p.matchId,
      poolId: p.poolId,
      homeScore: p.homeScore,
      awayScore: p.awayScore,
      penaltyWinnerTeamId: p.penaltyWinnerTeamId,
    })),
    poolId,
  );
  const predictionById = new Map(allPredictions.map(p => [p.id, p]));

  const confirmedTotals = new Map<string, number>(memberIds.map(id => [id, 0]));
  for (const prediction of effective.values()) {
    const full = predictionById.get(prediction.id)!;
    const joinedAt = memberJoinedAt.get(prediction.userId);
    if (!joinedAt || !full.match.kickoffAt || full.match.kickoffAt < joinedAt) continue; // model.md §3 join-date scoping
    const points = full.prediction_scores?.total_points ?? 0;
    confirmedTotals.set(prediction.userId, (confirmedTotals.get(prediction.userId) ?? 0) + points);
  }

  const liveMatchIds = new Set(allPredictions.filter(p => p.match.status === 'LIVE').map(p => p.match.id));
  const isLive = liveMatchIds.size > 0;
  const projectedTotals = new Map<string, number>();

  if (isLive) {
    const liveMatches = await prisma.match.findMany({
      where: { id: { in: [...liveMatchIds] } },
      include: { phase: true },
    });
    const liveMatchById = new Map(liveMatches.map(m => [m.id, m]));

    const livePointsByUser = new Map<string, number>();
    for (const prediction of effective.values()) {
      const full = predictionById.get(prediction.id)!;
      if (full.match.status !== 'LIVE') continue;
      const joinedAt = memberJoinedAt.get(prediction.userId);
      if (!joinedAt || !full.match.kickoffAt || full.match.kickoffAt < joinedAt) continue; // model.md §4 point 4
      const liveMatch = liveMatchById.get(full.match.id);
      if (!liveMatch || liveMatch.homeScore === null || liveMatch.awayScore === null) continue;

      const breakdown = computeScore({
        predictedHome: full.homeScore,
        predictedAway: full.awayScore,
        actualHome: liveMatch.homeScore,
        actualAway: liveMatch.awayScore,
        isKnockout: liveMatch.phase.type === 'KNOCKOUT',
        predictedPenaltyWinner: penaltyWinnerFromTeamId(
          full.penaltyWinnerTeamId,
          liveMatch.homeTeamId,
          liveMatch.awayTeamId,
        ),
        actualPenaltyWinner: null, // model.md §4 point 5
      });
      livePointsByUser.set(prediction.userId, (livePointsByUser.get(prediction.userId) ?? 0) + breakdown.totalPoints);
    }

    for (const userId of memberIds) {
      projectedTotals.set(userId, (confirmedTotals.get(userId) ?? 0) + (livePointsByUser.get(userId) ?? 0));
    }
  }

  const rows = memberships.map(m => ({
    userId: m.userId,
    nickname: nicknameOf(m.user),
    avatarUrl: m.user.avatarUrl,
    isViewer: m.userId === auth.userId,
    confirmedTotal: confirmedTotals.get(m.userId) ?? 0,
    projectedTotal: isLive ? (projectedTotals.get(m.userId) ?? confirmedTotals.get(m.userId) ?? 0) : null,
    hasConfirmedEntry: true, // every member appears, model.md §3
  }));

  return { ok: true, isLive, rows };
};

// ---------------------------------------------------------------------------
// auth.* — Bolt 8 addition (AUTH-6, design.md §3.1/ADR-039/ADR-040)
// ---------------------------------------------------------------------------

const deleteAccount: Handler = async (auth, body) => {
  const rawAssignments = Array.isArray(body?.poolOwnershipAssignments) ? body.poolOwnershipAssignments : [];
  const assignments = rawAssignments
    .filter((a: any) => typeof a?.poolId === 'string' && typeof a?.newOwnerId === 'string')
    .map((a: any) => ({ poolId: String(a.poolId), newOwnerId: String(a.newOwnerId) }));

  const transfer = await transferOwnedPoolsForAccountDeletion(auth.userId, assignments);
  if (!transfer.ok) {
    return { ok: false, error: transfer.error };
  }

  // Soft-delete the profile: release the nickname (deletedAt isn't part of
  // the unique index) so it can be reused. Runs before the auth hard-delete,
  // matching betmeet-clone's own ordering (model.md §4).
  await prisma.profile.update({
    where: { id: auth.userId },
    data: { deletedAt: new Date(), nicknameBase: null, nicknameDiscriminator: null },
  });

  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(auth.userId);
  if (deleteError) {
    return { ok: false, error: 'DELETE_FAILED' as const };
  }

  return { ok: true };
};

export const handlers: Record<string, Handler> = {
  'auth.resendConfirmation': resendConfirmation,
  'auth.deleteAccount': deleteAccount,
  'profile.checkNicknameAvailability': checkNicknameAvailability,
  'profile.assignNickname': assignNickname,
  'profile.changeNickname': changeNickname,
  'profile.getNicknameCooldownState': getNicknameCooldownState,
  'profile.getDefaultAvatarSet': getDefaultAvatarSet,
  'profile.requestAvatarUploadUrl': requestAvatarUploadUrl,
  'profile.confirmAvatarUpload': confirmAvatarUpload,
  'profile.setAvatarSource': setAvatarSource,
  'profile.setLocale': setLocale,
  'profile.completeOnboarding': completeOnboarding,
  'profile.getProfile': getProfile,
  'competition.getFixture': getFixture,
  'competition.getKnockoutPhaseIds': getKnockoutPhaseIds,
  'predictions.getMyPredictions': getMyPredictions,
  'predictions.save': save,
  'predictions.resetOverride': resetOverride,
  'pools.create': createPool,
  'pools.rename': renamePool,
  'pools.delete': deletePool,
  'pools.updateVisibility': updatePoolVisibility,
  'pools.updateMembersCanInvite': updatePoolMembersCanInvite,
  'pools.joinByToken': joinPoolByToken,
  'pools.joinPublic': joinPublicPool,
  'pools.leave': leavePool,
  'pools.kickMember': kickMember,
  'pools.setArchived': setPoolArchived,
  'pools.getMine': getMyPools,
  'pools.listPublic': listPublicPools,
  'pools.getDetail': getPoolDetail,
  'pools.createDirectedInvite': createDirectedInvite,
  'pools.getMyPoolsForPicker': getMyPoolsForPicker,
  'pools.transferOwnership': transferOwnership,
  'pools.getOwnedPoolsForDeletion': getOwnedPoolsForDeletion,
  'pools.getMemberPredictions': getMemberPredictions,
  'rankings.getGlobalRanking': getGlobalRanking,
  'rankings.getPoolLeaderboard': getPoolLeaderboard,
};
