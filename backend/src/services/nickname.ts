import { prisma } from '../db';

/** Mirrors mobile's src/domain/profile validation: 3-20 chars, alnum/underscore/hyphen. */
const NICKNAME_BASE_PATTERN = /^[a-zA-Z0-9_-]{3,20}$/;

const MAX_DISCRIMINATOR = 10000; // 0000-9999
const MAX_RETRIES = 10;
const MAX_TAKEN_BEFORE_UNAVAILABLE = 9999; // domain-overview.md §5.2

export function isValidNicknameBase(base: string): boolean {
  return NICKNAME_BASE_PATTERN.test(base);
}

export async function countTakenDiscriminators(base: string): Promise<number> {
  return prisma.profile.count({
    where: { nicknameBase: { equals: base, mode: 'insensitive' } },
  });
}

function randomDiscriminator(): string {
  return String(Math.floor(Math.random() * MAX_DISCRIMINATOR)).padStart(4, '0');
}

/** Assigns a free `base#discriminator` pair, retrying on collision (domain-overview.md §5.2). */
export async function assignDiscriminator(
  base: string,
): Promise<{ ok: true; discriminator: string } | { ok: false; error: 'taken' }> {
  const taken = await countTakenDiscriminators(base);
  if (taken >= MAX_TAKEN_BEFORE_UNAVAILABLE) {
    return { ok: false, error: 'taken' };
  }

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const discriminator = randomDiscriminator();
    const clash = await prisma.profile.findFirst({
      where: { nicknameBase: { equals: base, mode: 'insensitive' }, nicknameDiscriminator: discriminator },
      select: { id: true },
    });
    if (!clash) {
      return { ok: true, discriminator };
    }
  }
  return { ok: false, error: 'taken' };
}
