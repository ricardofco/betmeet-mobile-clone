import { prisma } from '../../db';

/**
 * ADMIN-1's authoritative gate (model.md §2, ADR-059) — a fresh
 * `prisma.profile.findUnique` on EVERY call, never cached across requests,
 * mirroring betmeet-clone's own `getAdminUserId()` exactly.
 * `verificationStatus` is a plain DB column, NOT a JWT claim (confirmed
 * against this backend's own `middleware/auth.ts` — `req.auth` carries only
 * `userId`/`emailVerified`/`onboardingCompleted`/`accountDeleted`) — so this
 * is the only place `'ADMIN'` status can ever be checked from.
 *
 * @invariant Permanent instruction (ADR-059's Consequences, same class as
 * ADR-038): every `admin.*` handler that touches admin-gated data MUST call
 * this fresh, on every invocation — no caching the result, no trusting a
 * client-supplied flag, no relying solely on a UI-level gate. A bypassed or
 * misconfigured check here would expose every `admin.*` capability's full
 * mutation blast radius (model.md §7) to any authenticated user.
 */
export async function requireAdmin(userId: string): Promise<boolean> {
  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: { verificationStatus: true },
  });
  return profile?.verificationStatus === 'ADMIN';
}
