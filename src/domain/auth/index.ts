/**
 * Barrel re-export for `domain/auth`. Consumers import from `@/domain/auth`
 * rather than from individual files — this allows internal restructuring
 * without updating import paths across the codebase.
 */

export * from '@/domain/auth/account-deletion';
export * from '@/domain/auth/auth-claims';
export * from '@/domain/auth/auth-guard';
export * from '@/domain/auth/parse-deep-link';
export * from '@/domain/auth/resend-cooldown';
export * from '@/domain/auth/screen-class';
export * from '@/domain/auth/sign-in';
export * from '@/domain/auth/sign-up';
export * from '@/domain/auth/validate-totp-code';
