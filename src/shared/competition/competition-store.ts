import { create } from 'zustand';

/**
 * COMPETITION-1's "past matches" toggle (design.md §3.2, ADR-020).
 * Deliberately scoped to only this one piece of UI state — `LiveSubscriptionState`
 * is NOT here; it stays local to `use-live-competition-subscription.ts`
 * (single owner/consumer, ADR-020's reasoning). No persistence: the toggle
 * is session-only UI state, not a cross-session preference like
 * `locale-store.ts`.
 */
export type CompetitionUiState = {
  showPastMatches: boolean;
  togglePastMatches: () => void;
};

export const useCompetitionStore = create<CompetitionUiState>(set => ({
  showPastMatches: false,
  togglePastMatches: () => set(state => ({ showPastMatches: !state.showPastMatches })),
}));
