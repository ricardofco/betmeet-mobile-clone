/**
 * Team/flag display rules (COMPETITION-3, model.md §4). `domain-overview.md
 * §5.9`/`§8`: "ISO 3-letter code" in this product means the FIFA trigram
 * (e.g. GER, NED), not actual ISO 3166-1 alpha-3 — the two code spaces
 * diverge for England/Scotland/Wales, which use UK-subdivision flags
 * (`gb-eng`/`gb-sct`/`gb-wls`), not invalid "country" flags.
 *
 * @invariant `fifaCode` and `flagKey` are independent identifiers, sourced
 * from the backend's hand-maintained seed list (domain-overview.md §5.9).
 * Never derive one from the other client-side (e.g. never lowercase
 * `fifaCode` to guess a flag asset key) — this would be wrong for the four
 * UK entries, which is exactly the bug this rule exists to prevent.
 */

export type FifaTrigram = string;
export type FlagAssetKey = string;

export type TeamDisplayData = {
  id: string;
  fifaCode: FifaTrigram;
  name: string;
  flagKey: FlagAssetKey;
};

export type KnockoutPlaceholder = {
  kind: 'placeholder';
  label: string;
};

export type TeamSlot = TeamDisplayData | KnockoutPlaceholder | null;

export function isKnockoutPlaceholder(slot: TeamSlot): slot is KnockoutPlaceholder {
  return slot !== null && 'kind' in slot && slot.kind === 'placeholder';
}

export function isResolvedTeam(slot: TeamSlot): slot is TeamDisplayData {
  return slot !== null && !isKnockoutPlaceholder(slot);
}

/**
 * The fallback label shown for a `null` team slot that isn't even a
 * recognized placeholder (a data-shape defect rather than the normal
 * "winner of X" placeholder case) — COMPETITION-1 AC: never render blank.
 */
export function describeTeamSlot(slot: TeamSlot): string {
  if (slot === null) return 'TBD';
  if (isKnockoutPlaceholder(slot)) return slot.label;
  return slot.name;
}
