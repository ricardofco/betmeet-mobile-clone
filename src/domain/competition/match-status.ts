/**
 * `MatchStatus` and its display metadata (COMPETITION-1 AC: "each match card
 * shows... current status"). The status value itself is always
 * backend-sourced (model.md §1, domain-overview.md §4.1's provider-sync
 * state machine) — this module never computes or transitions a status, it
 * only maps an already-known status to display metadata (label key/short tag).
 *
 * @invariant This is the only place `MatchStatus`'s display labels are
 * defined. Do not hardcode status strings/labels in components — import
 * `describeMatchStatus` instead, so a future copy change is a one-place edit.
 * Change-2026-07-08 (follow-up): this module stays framework-free (no
 * `react-i18next` import) — it returns an i18n key suffix under the
 * `matchStatus.*` namespace, not a literal English string; callers
 * translate it themselves (`t(\`matchStatus.${labelKey}\`)`).
 */

export type MatchStatus = 'SCHEDULED' | 'LOCKED' | 'LIVE' | 'FINISHED' | 'POSTPONED' | 'CANCELLED';

export type MatchStatusDisplay = {
  labelKey: string;
  /** `true` for the one status that should drive live-update subscriptions (model.md §3). */
  isLive: boolean;
};

const STATUS_DISPLAY: Record<MatchStatus, MatchStatusDisplay> = {
  SCHEDULED: { labelKey: 'scheduled', isLive: false },
  LOCKED: { labelKey: 'locked', isLive: false },
  LIVE: { labelKey: 'live', isLive: true },
  FINISHED: { labelKey: 'finished', isLive: false },
  POSTPONED: { labelKey: 'postponed', isLive: false },
  CANCELLED: { labelKey: 'cancelled', isLive: false },
};

export function describeMatchStatus(status: MatchStatus): MatchStatusDisplay {
  return STATUS_DISPLAY[status];
}

export function isLiveStatus(status: MatchStatus): boolean {
  return STATUS_DISPLAY[status].isLive;
}
