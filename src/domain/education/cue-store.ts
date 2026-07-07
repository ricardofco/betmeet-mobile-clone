/**
 * EDU-4's cue-key convention (design.md §9.1, model.md §5) — framework-free,
 * synchronous, the pure half of the domain/platform split
 * (`src/platform/education/cue-store.ts` owns the actual async `AsyncStorage`
 * read/write). Mirrors betmeet-clone's own `cue-store.ts` key-prefix
 * convention (`cue:dismissed:${cueId}`) 1:1.
 */
const KEY_PREFIX = 'cue:dismissed:';

export function storageKey(cueId: string): string {
  return `${KEY_PREFIX}${cueId}`;
}
