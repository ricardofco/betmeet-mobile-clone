/**
 * Bolt 13 (ADMIN-1, model.md §9 item 5, design.md §11) — a standalone,
 * manually-run script, never reachable from the app itself, mirroring
 * `seed-competition.ts`'s shape. This is the ONLY code path in this backend
 * that ever sets `verificationStatus = 'ADMIN'` (model.md §2's "never set
 * by application code" invariant) — there is no in-app promotion path, and
 * this script must never be exposed as an HTTP capability.
 *
 * Resolves the target email to a Supabase `auth.users` id via the same raw
 * cross-schema lookup pattern Bolt 8's `resolveInviteTarget()` /
 * `directed-invite.ts` already established (design.md §11) — not a second,
 * separately-invented lookup mechanism. Unlike that invite-resolution path,
 * this script does NOT join `public.profiles` in the lookup query itself
 * (a profile row may not exist yet for this project's live data — see
 * `usage` below) — it upserts the profile afterward instead.
 *
 * Usage: `npm run seed:admin -- <email>` (from `backend/`), or directly:
 * `npx tsx backend/src/scripts/seed-admin.ts <email>`
 *
 * Idempotent — safe to re-run for the same email (promotion-only; no
 * demotion/revoke path is built, matching betmeet-clone's own
 * `seed-admin.ts` shape, model.md §0 point 3).
 */
import { prisma } from '../db';

async function resolveUserIdByEmail(email: string): Promise<string | null> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM auth.users WHERE lower(email) = ${email.toLowerCase()} LIMIT 1
  `;
  return rows[0]?.id ?? null;
}

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: npm run seed:admin -- <email>');
    process.exitCode = 1;
    return;
  }

  const userId = await resolveUserIdByEmail(email);
  if (!userId) {
    console.error(`No auth.users row found for email: ${email}`);
    process.exitCode = 1;
    return;
  }

  const profile = await prisma.profile.upsert({
    where: { id: userId },
    create: { id: userId, avatarUrl: '', verificationStatus: 'ADMIN' },
    update: { verificationStatus: 'ADMIN' },
  });

  const nickname = profile.nicknameBase
    ? `${profile.nicknameBase}#${profile.nicknameDiscriminator}`
    : '(no nickname set yet)';

  console.log(`Promoted ${email} (userId=${userId}, nickname=${nickname}) to ADMIN.`);
}

main()
  .catch(err => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
