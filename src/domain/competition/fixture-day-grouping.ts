import type { MatchStatus } from '@/domain/competition/match-status';
import type { TeamSlot } from '@/domain/competition/fifa-team-display';

/**
 * COMPETITION-1's day-partitioning domain logic (model.md §2). Source rule:
 * `domain-overview.md §4.1`/`§5.9` via the unit brief — "today's
 * already-started matches stay visible (split by calendar day, not by
 * kickoff time), and the most-recent past day's last kickoff slot lingers
 * visible until 1 hour before the next kickoff before dropping behind a
 * 'past matches' toggle."
 *
 * Every function here is a pure function of its inputs (including the
 * caller-supplied `now`) — there is no hidden `Date.now()` call, so callers
 * (and tests) control "now" explicitly. ADR-019: the result of
 * `buildFixtureView` is never the cached/stored shape — it is recomputed at
 * render time against the live clock, every time.
 */

export type Match = {
  id: string;
  phaseId: string;
  kickoffAt: string | null;
  status: MatchStatus;
  homeTeam: TeamSlot;
  awayTeam: TeamSlot;
  homeScore: number | null;
  awayScore: number | null;
  homePenaltyScore: number | null;
  awayPenaltyScore: number | null;
};

export type FixtureDayGroup = {
  /** YYYY-MM-DD in the viewer's local timezone — the grouping key. */
  calendarDate: string;
  matches: Match[];
};

export type FixtureView = {
  currentAndUpcoming: FixtureDayGroup[];
  past: FixtureDayGroup[];
};

const ONE_HOUR_MS = 60 * 60 * 1000;

/** Formats an ISO-8601 instant as a local YYYY-MM-DD calendar-date key. */
function toLocalCalendarDate(isoInstant: string): string {
  const date = new Date(isoInstant);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Partitions a flat match list into calendar-day buckets, keyed by the
 * viewer's local calendar date of each match's `kickoffAt`. Matches with no
 * `kickoffAt` (unresolved knockout slots, model.md §1) are grouped under a
 * sentinel `'unscheduled'` key, sorted last.
 */
export function groupMatchesByDay(matches: Match[]): FixtureDayGroup[] {
  const buckets = new Map<string, Match[]>();

  for (const match of matches) {
    const key = match.kickoffAt ? toLocalCalendarDate(match.kickoffAt) : 'unscheduled';
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.push(match);
    } else {
      buckets.set(key, [match]);
    }
  }

  const groups = Array.from(buckets.entries()).map(([calendarDate, dayMatches]) => ({
    calendarDate,
    matches: dayMatches,
  }));

  groups.sort((a, b) => {
    if (a.calendarDate === 'unscheduled') return 1;
    if (b.calendarDate === 'unscheduled') return -1;
    return a.calendarDate.localeCompare(b.calendarDate);
  });

  return groups;
}

export type LingerDecision = 'show-in-current' | 'move-to-past';

/**
 * Decides whether the most-recent fully-past day's group should still
 * appear in the current/upcoming view (the "lingering" grace window) or has
 * crossed into the past view. Evaluated only against the single most-recent
 * past day — earlier past days are unconditionally `'move-to-past'`
 * (model.md §2).
 */
export function decidePastDayLingering(
  mostRecentPastDayLastKickoffAt: string,
  nextUpcomingKickoffAt: string | null,
  now: string,
): LingerDecision {
  if (nextUpcomingKickoffAt === null) {
    // Nothing to count down to — nothing forces this day out of view yet.
    return 'show-in-current';
  }

  const nowMs = new Date(now).getTime();
  const nextKickoffMs = new Date(nextUpcomingKickoffAt).getTime();
  const lingerCutoffMs = nextKickoffMs - ONE_HOUR_MS;

  return nowMs < lingerCutoffMs ? 'show-in-current' : 'move-to-past';
}

/**
 * Builds the full `FixtureView` (current/upcoming vs. past, with the
 * linger-window rule applied to the boundary day) from a flat match list and
 * the viewer's current instant. This is the single entry point
 * `use-fixture-query.ts`'s `select` calls (ADR-019) — never cache its
 * output, always recompute against a fresh `now`.
 */
export function buildFixtureView(matches: Match[], now: string): FixtureView {
  const allGroups = groupMatchesByDay(matches);
  const todayKey = toLocalCalendarDate(now);

  const scheduledGroups = allGroups.filter(g => g.calendarDate !== 'unscheduled');
  const unscheduledGroup = allGroups.find(g => g.calendarDate === 'unscheduled');

  const currentAndUpcoming: FixtureDayGroup[] = [];
  const past: FixtureDayGroup[] = [];

  // Partition strictly by calendar-date comparison first (model.md: "a day
  // that has already started stays in current/upcoming... until the
  // calendar day ends").
  const futureOrToday = scheduledGroups.filter(g => g.calendarDate >= todayKey);
  const strictlyPast = scheduledGroups.filter(g => g.calendarDate < todayKey);

  currentAndUpcoming.push(...futureOrToday);
  past.push(...strictlyPast);

  // Apply the linger-window rule to only the single most-recent past day
  // (the one immediately preceding `strictlyPast`'s chronological end).
  if (strictlyPast.length > 0) {
    const mostRecentPastDay = strictlyPast[strictlyPast.length - 1];
    const lastKickoffOfThatDay = lastKickoffInGroup(mostRecentPastDay);
    const nextUpcomingKickoff = firstKickoffAcrossGroups(futureOrToday);

    if (lastKickoffOfThatDay) {
      const decision = decidePastDayLingering(lastKickoffOfThatDay, nextUpcomingKickoff, now);
      if (decision === 'show-in-current') {
        // Move it from past to current/upcoming, preserving chronological
        // order (it belongs immediately before today's/future's groups).
        past.pop();
        currentAndUpcoming.unshift(mostRecentPastDay);
      }
    }
  }

  // Unresolved knockout slots (no kickoff time) always sort into
  // current/upcoming — there is no "past" interpretation for a match with no
  // scheduled time yet.
  if (unscheduledGroup) {
    currentAndUpcoming.push(unscheduledGroup);
  }

  return { currentAndUpcoming, past };
}

function lastKickoffInGroup(group: FixtureDayGroup): string | null {
  const withKickoff = group.matches.filter((m): m is Match & { kickoffAt: string } => m.kickoffAt !== null);
  if (withKickoff.length === 0) return null;
  return withKickoff.reduce((latest, m) => (m.kickoffAt > latest ? m.kickoffAt : latest), withKickoff[0].kickoffAt);
}

function firstKickoffAcrossGroups(groups: FixtureDayGroup[]): string | null {
  const allKickoffs = groups
    .flatMap(g => g.matches)
    .map(m => m.kickoffAt)
    .filter((k): k is string => k !== null);
  if (allKickoffs.length === 0) return null;
  return allKickoffs.reduce((earliest, k) => (k < earliest ? k : earliest), allKickoffs[0]);
}
