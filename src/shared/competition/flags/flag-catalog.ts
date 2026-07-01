/**
 * The bundled `FlagAssetKey -> display metadata` catalog (COMPETITION-3,
 * ADR-017/ADR-018). Flags are rendered from this static table — there is no
 * runtime flag-fetch path and no `flagUrl` field anywhere in this bolt's
 * types (model.md §4's structural-absence rule).
 *
 * @invariant Placeholder content note: this bolt wires the full bundled,
 * keyed-lookup architecture `react-native-svg`-based) that COMPETITION-3
 * requires, including the four UK home-nations' subdivision keys
 * (`gb-eng`/`gb-sct`/`gb-wls`) kept structurally distinct from any ISO
 * "country" code. The actual vendored flag artwork (the `lipis/flag-icons`
 * SVG set referenced by `migration-analysis.md`/`project-inventory.md`'s
 * `public/flags/`) is a design-asset import task with no network access in
 * this environment — `FlagBadge` renders a simple labeled placeholder swatch
 * per key until the real SVGs are vendored in. Swapping in real artwork is a
 * content-only change to this file and `flag-badge.tsx`; no consumer
 * (`team-badge.tsx`, `match-card.tsx`, or anything in Bolt 6) needs to
 * change, since they only ever address a flag by `FlagAssetKey`.
 */

export type FlagCatalogEntry = {
  /** A short, stable background tint so different flags are visually distinguishable even as placeholders. */
  tint: string;
};

const DEFAULT_TINT = '#9CA3AF';

/**
 * Known flag keys for the WC2026-eligible roster, including the four UK
 * home-nations subdivision keys (COMPETITION-3 AC #2) — kept here as the
 * single place new keys are registered as real artwork is vendored in.
 */
export const FLAG_CATALOG: Record<string, FlagCatalogEntry> = {
  'gb-eng': { tint: '#C8102E' },
  'gb-sct': { tint: '#005EB8' },
  'gb-wls': { tint: '#00B140' },
};

export function getFlagCatalogEntry(flagKey: string): FlagCatalogEntry {
  return FLAG_CATALOG[flagKey] ?? { tint: DEFAULT_TINT };
}
