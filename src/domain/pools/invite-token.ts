/**
 * POOLS-1/POOLS-2 — invite token (model.md §4, domain-overview.md §5.3):
 * "8 unambiguous characters (excludes 0/O/1/I/L), unique, with a 12-char
 * fallback if collisions exhaust retries."
 *
 * Token **generation** is backend-only (needs `crypto` + a DB existence
 * check per attempt, see `backend/src/services/pool-invite-token.ts`) — no
 * mobile domain function here generates a token. This module only
 * validates **input shape** when a user types/pastes a join code: a fast,
 * offline pre-check before even hitting the network (mirrors
 * `betmeet-clone`'s real `JoinByTokenSchema`, `min(6).max(12)`, to tolerate
 * either the 8-char default or the 12-char collision fallback).
 */

/** 26 letters minus O/I/L, digits 2-9 (0/1 excluded too) — 32 chars. */
export const INVITE_TOKEN_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export const MIN_INVITE_TOKEN_LENGTH = 6;
export const MAX_INVITE_TOKEN_LENGTH = 12;

const ALPHABET_SET = new Set(INVITE_TOKEN_ALPHABET.split(''));

/**
 * Trim + uppercase — the backend uppercases before lookup
 * (`betmeet-clone`'s real `joinPoolByToken`); mobile does the same before
 * sending so a user typing lowercase still works.
 */
export function normalizeInviteToken(token: string): string {
  return token.trim().toUpperCase();
}

/**
 * Fast, offline shape check: 6-12 chars after normalization, every
 * character in the unambiguous alphabet. Does **not** check existence or
 * uniqueness — that's an inherently backend-only concern.
 */
export function isPlausibleInviteToken(token: string): boolean {
  const normalized = normalizeInviteToken(token);
  if (normalized.length < MIN_INVITE_TOKEN_LENGTH || normalized.length > MAX_INVITE_TOKEN_LENGTH) {
    return false;
  }
  for (const char of normalized) {
    if (!ALPHABET_SET.has(char)) return false;
  }
  return true;
}
