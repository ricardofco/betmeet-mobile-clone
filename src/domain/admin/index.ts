export type { AdminMatchRow } from '@/domain/admin/admin-match-row';

export {
  validateForceResultScoreBounds,
  validateForceResultReason,
} from '@/domain/admin/force-result-validation';

export {
  matchesEligibleForForceResult,
  matchesWithActiveOverride,
} from '@/domain/admin/admin-match-filters';
