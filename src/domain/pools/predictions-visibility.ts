/**
 * POOLS-6 — anti-bias masking, advisory client-side mirror ONLY (model.md
 * §5, design.md §3.2/ADR-038). By the time a response reaches the client,
 * a masked cell's numeric fields are already `null` — this predicate is
 * never the reason a value is or isn't visible, it exists solely so the UI
 * can show accurate copy ("Hidden until kickoff") for a cell it already
 * knows is masked (`hidden: true` on the wire) or to build a defense-in-depth
 * check in tests. The real, authoritative computation lives exclusively in
 * the backend's `pools.getMemberPredictions` handler.
 *
 * @invariant This function must never be used to decide whether to *render*
 * a value the server sent — only to decide what placeholder copy to show
 * for a value the server has already masked (or, symmetrically, to assert
 * in tests that a given row *should* have arrived masked).
 */

export type MatchForVisibility = { kickoffAt: string | null };

export function isMemberPredictionVisible(
  match: MatchForVisibility,
  now: string,
  rowUserId: string,
  viewerUserId: string,
): boolean {
  if (rowUserId === viewerUserId) return true;
  const started = match.kickoffAt !== null && Date.parse(match.kickoffAt) <= Date.parse(now);
  return started;
}
