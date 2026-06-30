/**
 * Barrel re-export for `domain/profile`. Consumers import from
 * `@/domain/profile` rather than from individual files (mirrors
 * `@/domain/auth`'s convention).
 */

export * from '@/domain/profile/avatar-source';
export * from '@/domain/profile/default-avatar-set';
export * from '@/domain/profile/locale';
export * from '@/domain/profile/nickname-change-eligibility';
export * from '@/domain/profile/onboarding-completion';
export * from '@/domain/profile/onboarding-wizard-state';
export * from '@/domain/profile/validate-avatar-upload';
export * from '@/domain/profile/validate-nickname-base';
