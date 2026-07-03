/**
 * PREDICTIONS-3 — dual-save offer rule (model.md §6). Dual-save (saving a
 * pool override and the global prediction atomically in one request) is
 * only offered when the user has neither a global nor an override
 * prediction yet for this match in this pool — editing an existing
 * override never silently touches an existing global prediction.
 */

export type ExistingPredictionsForMatch = { hasGlobal: boolean; hasOverride: boolean };

export function shouldOfferDualSave(existing: ExistingPredictionsForMatch): boolean {
  return !existing.hasGlobal && !existing.hasOverride;
}
