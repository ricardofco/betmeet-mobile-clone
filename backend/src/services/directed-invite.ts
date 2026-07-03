import { createHash } from 'node:crypto';
import { prisma } from '../db';

/**
 * POOLS-3 (design.md §3.1, model.md §2) — server-side target resolution.
 * Independently authored against domain-overview.md §5.3 (cross-checked
 * for the exact resolution shape against betmeet-clone's real
 * src/features/pools/actions/create-directed-invite.ts for reference
 * behavior per the task brief, never imported — requirements.md §7.3).
 *
 * A target containing '@' is treated as an email: resolved against a real
 * account by a raw cross-schema query (auth.users joined to public.profiles,
 * same shape betmeet-clone's real resolveUserByEmail uses — this backend
 * connects to the same underlying Supabase Postgres database, per
 * activeContext.md's backend-phase1 note, so the same query shape applies).
 * If the DB role this backend connects as doesn't have SELECT on the
 * `auth` schema for any reason, the raw query throws and this function
 * degrades to "no resolved user" (an email-hash-only invite is still
 * created) rather than failing the whole request — verified empirically
 * at this bolt's Layer 1 backend pass, see implement-and-test.md.
 */

export type ResolvedInviteTarget =
  | { invitedUserId: string; invitedEmailHash: null }
  | { invitedUserId: null; invitedEmailHash: string }
  | { invitedUserId: null; invitedEmailHash: null };

function hashEmail(email: string): string {
  return createHash('sha256').update(email).digest('hex');
}

async function resolveUserByEmail(email: string): Promise<string | null> {
  try {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT p.id
      FROM auth.users u
      INNER JOIN public.profiles p ON p.id = u.id
      WHERE lower(u.email) = ${email} AND p.deleted_at IS NULL
      LIMIT 1
    `;
    return rows[0]?.id ?? null;
  } catch (err) {
    console.error('[directed-invite] resolveUserByEmail raw query failed, degrading to hash-only invite:', err);
    return null;
  }
}

export async function resolveInviteTarget(target: string): Promise<ResolvedInviteTarget> {
  const trimmed = target.trim();

  if (trimmed.includes('@')) {
    const email = trimmed.toLowerCase();
    const userId = await resolveUserByEmail(email);
    if (userId) return { invitedUserId: userId, invitedEmailHash: null };
    return { invitedUserId: null, invitedEmailHash: hashEmail(email) };
  }

  const [base, discriminator, ...rest] = trimmed.split('#');
  if (!base || !discriminator || discriminator.length !== 4 || rest.length > 0 || !/^\d{4}$/.test(discriminator)) {
    return { invitedUserId: null, invitedEmailHash: null };
  }

  const profile = await prisma.profile.findFirst({
    where: {
      nicknameBase: { equals: base, mode: 'insensitive' },
      nicknameDiscriminator: discriminator,
      deletedAt: null,
    },
    select: { id: true },
  });
  return profile ? { invitedUserId: profile.id, invitedEmailHash: null } : { invitedUserId: null, invitedEmailHash: null };
}
