/**
 * Barrel re-export for `domain/education` (Bolt 12), mirrors `@/domain/rankings`/
 * `@/domain/profile`'s convention — consumers import from `@/domain/education`
 * rather than individual files.
 */
export type { RuleContentBlock, RuleDocument, RuleSlug } from '@/domain/education/rule-content';
export { getFullRules } from '@/domain/education/rule-content';

export { storageKey } from '@/domain/education/cue-store';
