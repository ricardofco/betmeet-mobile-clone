/**
 * TOTP code client-side validation — pure function, no SDK import (ADR-003).
 * Domain rules (model.md §2.4):
 *   - Exactly 6 characters.
 *   - All characters are ASCII digits 0–9.
 *   - Leading zeros are valid (e.g. '000123').
 */

export type TotpCodeValidation =
  | { valid: true; code: string }
  | { valid: false; reason: 'too-short' | 'too-long' | 'not-numeric' };

const TOTP_LENGTH = 6;
const DIGITS_ONLY = /^\d+$/;

export function validateTotpCode(code: string): TotpCodeValidation {
  if (code.length < TOTP_LENGTH) {
    return { valid: false, reason: 'too-short' };
  }
  if (code.length > TOTP_LENGTH) {
    return { valid: false, reason: 'too-long' };
  }
  if (!DIGITS_ONLY.test(code)) {
    return { valid: false, reason: 'not-numeric' };
  }
  return { valid: true, code };
}
