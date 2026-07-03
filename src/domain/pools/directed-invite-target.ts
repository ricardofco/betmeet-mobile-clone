/**
 * POOLS-3 — directed-invite target parsing (model.md §2). Format-only: this
 * never claims a nickname/email actually resolves to a real account, that
 * needs a DB round-trip and is backend-only (design.md §3.1). A string
 * containing `@` is treated as an email; otherwise it must match
 * `base#NNNN` (nickname base + 4-digit discriminator) or it is
 * `unresolvable` as far as this parser is concerned.
 */

export type ParsedInviteTarget =
  | { kind: 'email'; email: string }
  | { kind: 'nickname'; base: string; discriminator: string }
  | { kind: 'unresolvable'; raw: string };

const MIN_TARGET_LENGTH = 3;
const MAX_TARGET_LENGTH = 120;

/** Mirrors `betmeet-clone`'s `CreateDirectedInviteSchema.target` bounds (trim, 3-120 chars). */
export function isPlausibleInviteTarget(raw: string): boolean {
  const trimmed = raw.trim();
  return trimmed.length >= MIN_TARGET_LENGTH && trimmed.length <= MAX_TARGET_LENGTH;
}

export function parseInviteTarget(raw: string): ParsedInviteTarget {
  const trimmed = raw.trim();

  if (trimmed.includes('@')) {
    return { kind: 'email', email: trimmed.toLowerCase() };
  }

  const [base, discriminator, ...rest] = trimmed.split('#');
  if (base && discriminator && discriminator.length === 4 && rest.length === 0 && /^\d{4}$/.test(discriminator)) {
    return { kind: 'nickname', base, discriminator };
  }

  return { kind: 'unresolvable', raw: trimmed };
}
