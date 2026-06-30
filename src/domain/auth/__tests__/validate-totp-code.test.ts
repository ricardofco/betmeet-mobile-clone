import { validateTotpCode } from '@/domain/auth/validate-totp-code';

describe('validateTotpCode', () => {
  // ── Valid codes ───────────────────────────────────────────────────────────
  describe('valid codes', () => {
    it('accepts a standard 6-digit code', () => {
      const result = validateTotpCode('123456');
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.code).toBe('123456');
      }
    });

    it('accepts leading zeros (000123)', () => {
      const result = validateTotpCode('000123');
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.code).toBe('000123');
      }
    });

    it('accepts all zeros (000000)', () => {
      const result = validateTotpCode('000000');
      expect(result.valid).toBe(true);
    });

    it('accepts all nines (999999)', () => {
      const result = validateTotpCode('999999');
      expect(result.valid).toBe(true);
    });

    it('preserves the exact code string in the valid result', () => {
      const code = '042816';
      const result = validateTotpCode(code);
      if (result.valid) {
        expect(result.code).toBe(code);
      }
    });
  });

  // ── Too short ─────────────────────────────────────────────────────────────
  describe('too short', () => {
    it('rejects an empty string', () => {
      const result = validateTotpCode('');
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toBe('too-short');
      }
    });

    it('rejects a 5-digit code', () => {
      const result = validateTotpCode('12345');
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toBe('too-short');
      }
    });

    it('rejects a 1-digit code', () => {
      const result = validateTotpCode('1');
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toBe('too-short');
      }
    });
  });

  // ── Too long ──────────────────────────────────────────────────────────────
  describe('too long', () => {
    it('rejects a 7-digit code', () => {
      const result = validateTotpCode('1234567');
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toBe('too-long');
      }
    });

    it('rejects a much longer string', () => {
      const result = validateTotpCode('123456789');
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toBe('too-long');
      }
    });
  });

  // ── Non-numeric ───────────────────────────────────────────────────────────
  describe('non-numeric', () => {
    it('rejects a code with letters', () => {
      const result = validateTotpCode('12345a');
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toBe('not-numeric');
      }
    });

    it('rejects a code with spaces', () => {
      const result = validateTotpCode('123 45');
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toBe('not-numeric');
      }
    });

    it('rejects a code with a hyphen', () => {
      const result = validateTotpCode('123-45');
      // 6 chars but non-numeric
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toBe('not-numeric');
      }
    });

    it('rejects a code that is all letters', () => {
      const result = validateTotpCode('abcdef');
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toBe('not-numeric');
      }
    });
  });
});
