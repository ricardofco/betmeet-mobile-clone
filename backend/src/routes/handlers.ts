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
import { canKick, canLeave, isOwner } from '../services/pool-permissions';
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

const getMyPredictions: Handler = async (auth) => {
  const predictions = await prisma.prediction.findMany({
    where: { userId: auth.userId },
    include: { match: true },
  });
  return predictions.map((p) => ({
    id: p.id,
    matchId: p.matchId,
    poolId: p.poolId,
    homeScore: p.homeScore,
    awayScore: p.awayScore,
    penaltyWinner: derivePenaltyWinnerLabel(p.penaltyWinnerTeamId, p.match.homeTeamId, p.match.awayTeamId),
  }));
};

const save: Handler = async (auth, body) => {
  const matchId = String(body?.matchId ?? '');
  const poolId: string | null = body?.poolId ?? null;
  const homeScore = Number(body?.homeScore);
  const awayScore = Number(body?.awayScore);
  const penaltyWinner = (body?.penaltyWinner ?? null) as 'home' | 'away' | null;

  if (!validateScoreBounds(homeScore, awayScore)) {
    return { ok: false, error: 'VALIDATION_FAILED' as const };
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

  const existing = await prisma.prediction.findFirst({
    where: { userId: auth.userId, matchId, poolId },
  });
  if (existing?.lockedAt) {
    return { ok: false, error: 'LOCKED' as const };
  }

  const saved = existing
    ? await prisma.prediction.update({
        where: { id: existing.id },
        data: { homeScore, awayScore, penaltyWinnerTeamId },
      })
    : await prisma.prediction.create({
        data: { userId: auth.userId, matchId, poolId, homeScore, awayScore, penaltyWinnerTeamId },
      });

  return {
    ok: true,
    prediction: {
      id: saved.id,
      matchId: saved.matchId,
      poolId: saved.poolId,
      homeScore: saved.homeScore,
      awayScore: saved.awayScore,
      penaltyWinner,
    },
  };
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

export const handlers: Record<string, Handler> = {
  'auth.resendConfirmation': resendConfirmation,
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
};
