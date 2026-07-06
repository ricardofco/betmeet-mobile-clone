/**
 * Pure display-shaping for a ranking row (design.md §2) — written ONCE here
 * so the host's `ranking-row.tsx` and the `pools` remote's
 * `pool-leaderboard-row.tsx` can't silently drift on formatting between the
 * two screens. No React/RN import; both components only lay out primitives
 * around these strings.
 */

const MEDAL_BY_POSITION: Record<number, string> = {
  1: '\u{1F947}', // 🥇
  2: '\u{1F948}', // 🥈
  3: '\u{1F949}', // 🥉
};

/** Medal glyph for the top 3 positions, `null` otherwise. */
export function getMedalGlyph(position: number): string | null {
  return MEDAL_BY_POSITION[position] ?? null;
}

/** `"3"` normally, `"T-3"` when the row shares its position with another. */
export function formatPositionLabel(position: number, isTied: boolean): string {
  return isTied ? `T-${position}` : `${position}`;
}

export type PositionDeltaDirection = 'up' | 'down' | 'same' | 'new';

export type FormattedPositionDelta = {
  direction: PositionDeltaDirection;
  /** A short display glyph/label — e.g. "▲2", "▼1", "=", "NEW". */
  label: string;
};

/**
 * `positionDelta = previousPosition - projectedPosition` (model.md §4 point
 * 8) — positive means the row rose, negative means it fell, `null` means a
 * synthesized/new row with no confirmed-pass position to compare against.
 */
export function formatPositionDelta(positionDelta: number | null): FormattedPositionDelta {
  if (positionDelta === null) return { direction: 'new', label: 'NEW' };
  if (positionDelta > 0) return { direction: 'up', label: `▲${positionDelta}` };
  if (positionDelta < 0) return { direction: 'down', label: `▼${Math.abs(positionDelta)}` };
  return { direction: 'same', label: '=' };
}

/** `nickname` is never blank in practice (assigned at onboarding) but this
 * keeps every row renderable even against a defensively-null value. */
export function displayNickname(nickname: string | null, fallbackLabel: string): string {
  return nickname ?? fallbackLabel;
}

/** The total this row should currently display: `projectedTotal` while live, `confirmedTotal` otherwise. */
export function displayTotal(row: { confirmedTotal: number; projectedTotal?: number | null }, isLive: boolean): number {
  if (isLive && row.projectedTotal !== null && row.projectedTotal !== undefined) {
    return row.projectedTotal;
  }
  return row.confirmedTotal;
}
